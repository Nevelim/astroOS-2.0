"""Notification event-bus consumer: bridges EventBus events → notifications.

Subscribes to the match.events and daily.generated streams (per MATCH-10 and
DAILY-5) and translates each typed event into a NotificationEvent that the
existing ProcessNotificationEvent use case consumes. This is the bridge that
turns the async event bus into calm, opt-in notifications (NOTIF-1..5).

Mapping:
  match.made           → NEW_MATCH    ("Someone with complementary energy…")
  match.message.sent   → NEW_MATCH    ("New message from …")
  daily.generated      → DAILY_MORNING (morning nudge)

Idempotency: the consumer tracks seen event_ids so a redelivered event (Redis
at-least-once) does not produce a duplicate notification. In-memory set for
dev; prod swaps to a Redis SET with TTL.
"""
from __future__ import annotations

from typing import Optional

from services.common.eventbus import EventBus, EventHandler
from services.common.events import (
    STREAM_DAILY_GENERATED,
    STREAM_MATCH_EVENTS,
    EventEnvelope,
)
from services.notification.domain.entities import (
    Channel,
    NotificationEvent,
    NotificationType,
)


class EventBusBridge:
    """Wires event-bus streams to the notification pipeline.

    The bridge holds a reference to a sink function (the API layer injects one
    that runs ProcessNotificationEvent.execute) and subscribes handlers that
    translate envelopes into NotificationEvents.
    """

    def __init__(self, bus: EventBus) -> None:
        self._bus = bus
        self._seen: set[str] = set()
        self._sink = None  # injected: async (NotificationEvent) -> None

    def wire(self, sink) -> None:
        """Attach the notification-processing sink and subscribe to streams."""
        self._sink = sink
        self._bus.subscribe(STREAM_MATCH_EVENTS, self._on_match_event)
        self._bus.subscribe(STREAM_DAILY_GENERATED, self._on_daily_event)

    async def _dispatch(self, env: EventEnvelope, ntype: NotificationType,
                        title: str, body: str) -> None:
        if env.event_id in self._seen:
            return  # idempotent: already processed
        self._seen.add(env.event_id)
        if self._sink is None:
            return
        await self._sink(NotificationEvent(
            member_id=env.member_id, type=ntype,
            title=title, body=body,
            channels=(Channel.PUSH, Channel.INAPP),
            payload={"event_id": env.event_id, "event_type": env.type},
        ))

    async def _on_match_event(self, env: EventEnvelope) -> None:
        if env.type == "match.made":
            partner = env.payload.get("partner_profile_id", "someone")
            score = env.payload.get("composite_score", 0)
            await self._dispatch(
                env, NotificationType.NEW_MATCH,
                "A new match appeared",
                f"Someone with a complementary chart is now in your orbit "
                f"(compatibility {score}).",
            )
        elif env.type == "match.message.sent":
            sender = env.payload.get("sender_profile_id", "someone")
            preview = env.payload.get("message_preview", "")
            await self._dispatch(
                env, NotificationType.NEW_MATCH,
                "New message",
                f"A new message arrived: \"{preview}\"",
            )

    async def _on_daily_event(self, env: EventEnvelope) -> None:
        sign = env.payload.get("sun_sign", "")
        await self._dispatch(
            env, NotificationType.DAILY_MORNING,
            "Your reading is ready",
            f"Today's insight for {sign} is waiting. Open when it suits you.",
        )
