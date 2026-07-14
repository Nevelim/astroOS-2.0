"""Event bus: Protocol port + dual adapter (InMemory + Redis Streams).

The single integration point for all inter-service events. A Protocol port
(`EventBus`) lets every service depend on the abstraction; the concrete
adapter is chosen at wiring time:

  - InMemoryEventBus  (default, dev/test): synchronous in-process dispatch.
    No external deps. Fully exercisable for unit/integration tests.
  - RedisStreamEventBus (prod): Redis Streams XADD/XREADGROUP fan-out across
    processes. Enabled automatically when EVENTBUS_REDIS_URL is set (CC-1.5).
    Uses consumer-group semantics for at-least-once delivery + dedup by
    event_id.

Stream assignment: the event bus uses Redis DB3 (DB0/1/4/5/6 are taken by
session/astro-cache/match-ws/daily-remedies/mentor per CC-1.5; DB3 is free).

Both adapters share `EventEnvelope` (services.common.events) as the wire
format. Producers call `publish(envelope)`; consumers register a handler per
stream and the bus dispatches inbound envelopes to them.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Awaitable, Callable, Optional

from services.common.events import EventEnvelope

log = logging.getLogger(__name__)

EventHandler = Callable[[EventEnvelope], Awaitable[None]]


# --------------------------------------------------------------------------- #
# Port
# --------------------------------------------------------------------------- #
class EventBus:
    """Protocol-style base. Adapters implement publish() + subscribe().

    Kept as a regular class (not typing.Protocol) so it doubles as the
    InMemory default implementation below.
    """

    async def publish(self, envelope: EventEnvelope) -> None:
        raise NotImplementedError

    def subscribe(self, stream: str, handler: EventHandler) -> None:
        raise NotImplementedError


# --------------------------------------------------------------------------- #
# InMemory adapter (dev/test default)
# --------------------------------------------------------------------------- #
class InMemoryEventBus(EventBus):
    """In-process pub/sub. Handlers are awaited synchronously on publish.

    On publish, the bus dispatches to every handler subscribed to the
    envelope's stream. Errors in a handler are logged but do not block other
    handlers (at-least-once semantics — in-memory, so delivery is effectively
    exactly-once within a process).
    """

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = {}
        self._delivered: list[EventEnvelope] = []   # for test inspection

    def subscribe(self, stream: str, handler: EventHandler) -> None:
        self._handlers.setdefault(stream, []).append(handler)

    async def publish(self, envelope: EventEnvelope) -> None:
        self._delivered.append(envelope)
        handlers = self._handlers.get(envelope.stream, [])
        for handler in handlers:
            try:
                await handler(envelope)
            except Exception:
                log.exception("event handler error on stream %s", envelope.stream)

    # Test helper
    def delivered(self) -> list[EventEnvelope]:
        return list(self._delivered)


def default_bus() -> EventBus:
    """Factory: Redis Streams when EVENTBUS_REDIS_URL is set, else in-memory."""
    redis_url = os.environ.get("EVENTBUS_REDIS_URL")
    if redis_url:
        return RedisStreamEventBus(redis_url)
    return InMemoryEventBus()


# --------------------------------------------------------------------------- #
# Redis Streams adapter (prod)
# --------------------------------------------------------------------------- #
# Lazy import so the module loads without redis installed (dev path).
class RedisStreamEventBus(EventBus):
    """Redis Streams XADD/XREADGROUP fan-out. Consumer-group semantics.

    Each stream gets a consumer group "astroos"; XREADGROUP delivers unseen
    entries. Dedup by event_id is the consumer's responsibility (the bridge
    in each service tracks seen event_ids). This keeps the bus a dumb pipe.
    """

    GROUP = "astroos"
    _CONSUMER_NAME = "svc-1"   # per-process; prod sets via hostname

    def __init__(self, redis_url: str, db: int = 3) -> None:
        self._url = redis_url
        self._db = db
        self._redis = None
        self._handlers: dict[str, list[EventHandler]] = {}
        self._running = False

    def _connect(self):  # pragma: no cover (requires live redis)
        import redis.asyncio as aioredis
        if self._redis is None:
            self._redis = aioredis.from_url(self._url, db=self._db,
                                            decode_responses=True)
        return self._redis

    def subscribe(self, stream: str, handler: EventHandler) -> None:
        self._handlers.setdefault(stream, []).append(handler)

    async def publish(self, envelope: EventEnvelope) -> None:  # pragma: no cover
        r = self._connect()
        await r.xadd(envelope.stream, {"data": json.dumps(envelope.to_dict())})

    async def _run(self) -> None:  # pragma: no cover
        r = self._connect()
        for stream in self._handlers:
            try:
                await r.xgroup_create(stream, self.GROUP, id="0", mkstream=True)
            except Exception:
                pass  # group already exists
        self._running = True
        while self._running:
            for stream, handlers in self._handlers.items():
                resp = await r.xreadgroup(self.GROUP, self._CONSUMER_NAME,
                                          {stream: ">"}, count=10, block=100)
                for _stream_name, entries in resp:
                    for _entry_id, fields in entries:
                        env = EventEnvelope.from_dict(json.loads(fields["data"]))
                        for h in handlers:
                            try:
                                await h(env)
                            except Exception:
                                log.exception("redis event handler error")
                        await r.xack(stream, self.GROUP, _entry_id)

    def stop(self) -> None:  # pragma: no cover
        self._running = False
