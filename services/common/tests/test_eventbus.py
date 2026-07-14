"""Unit tests for the event bus + typed event contracts + bridges.

These cover the InMemory pub/sub mechanics, typed event round-trips,
idempotency (dedup by event_id), and the two consumer bridges
(Notification + Remedies) in isolation with fake sinks.
"""
from __future__ import annotations

import pytest

from services.common.eventbus import InMemoryEventBus
from services.common.events import (
    STREAM_BAZI_COMPUTED,
    STREAM_DAILY_GENERATED,
    STREAM_MATCH_EVENTS,
    BaziComputedEvent,
    DailyGeneratedEvent,
    EventEnvelope,
    MatchMadeEvent,
    MatchMessageSentEvent,
)


# --------------------------------------------------------------------------- #
# Typed event contracts
# --------------------------------------------------------------------------- #
class TestEventContracts:
    def test_bazi_computed_envelope(self):
        ev = BaziComputedEvent(member_id="m1", day_master_element="wood",
                               favorable_elements=("water", "earth"))
        env = ev.envelope()
        assert env.stream == "bazi.computed"
        assert env.type == "bazi.computed"
        assert env.member_id == "m1"
        assert env.payload["day_master_element"] == "wood"
        assert env.payload["favorable_elements"] == ["water", "earth"]
        assert env.event_id.startswith("evt_bazi_")

    def test_match_made_envelope(self):
        ev = MatchMadeEvent(member_id="m1", partner_profile_id="prf_x",
                            composite_score=87)
        env = ev.envelope()
        assert env.stream == "match.events"
        assert env.type == "match.made"
        assert env.payload["composite_score"] == 87

    def test_match_message_sent_envelope_truncates_preview(self):
        ev = MatchMessageSentEvent(
            member_id="m1", sender_profile_id="prf_y",
            conversation_id="c1", message_preview="x" * 500)
        env = ev.envelope()
        assert len(env.payload["message_preview"]) <= 120

    def test_daily_generated_envelope(self):
        ev = DailyGeneratedEvent(member_id="m1", sun_sign="aries",
                                 ritual_type="horoscope", for_date="2026-07-14")
        env = ev.envelope()
        assert env.stream == "daily.generated"
        assert env.payload["sun_sign"] == "aries"

    def test_envelope_round_trip(self):
        env = EventEnvelope(event_id="e1", stream="x", type="x.t",
                            member_id="m", payload={"a": 1})
        rt = EventEnvelope.from_dict(env.to_dict())
        assert rt == env


# --------------------------------------------------------------------------- #
# InMemoryEventBus
# --------------------------------------------------------------------------- #
class TestInMemoryBus:
    async def test_publish_delivers_to_subscriber(self):
        bus = InMemoryEventBus()
        got = []

        async def handler(env):
            got.append(env)
        bus.subscribe("bazi.computed", handler)
        await bus.publish(BaziComputedEvent(
            member_id="m1", day_master_element="wood",
            favorable_elements=("water",)).envelope())
        assert len(got) == 1
        assert got[0].stream == "bazi.computed"

    async def test_multiple_subscribers(self):
        bus = InMemoryEventBus()
        a, b = [], []

        async def ha(env): a.append(env)
        async def hb(env): b.append(env)
        bus.subscribe("match.events", ha)
        bus.subscribe("match.events", hb)
        await bus.publish(MatchMadeEvent(
            member_id="m1", partner_profile_id="prf", composite_score=90).envelope())
        assert len(a) == 1 and len(b) == 1

    async def test_no_delivery_to_unsubscribed_stream(self):
        bus = InMemoryEventBus()
        got = []

        async def handler(env):
            got.append(env)
        bus.subscribe("daily.generated", handler)
        await bus.publish(MatchMessageSentEvent(
            member_id="m1", sender_profile_id="prf",
            conversation_id="c", message_preview="hi").envelope())
        assert got == []

    async def test_handler_error_does_not_block_others(self):
        bus = InMemoryEventBus()
        ok = []

        async def bad(env):
            raise RuntimeError("boom")
        async def good(env):
            ok.append(env)
        bus.subscribe("x", bad)
        bus.subscribe("x", good)
        await bus.publish(EventEnvelope(event_id="e1", stream="x", type="x.t"))
        assert len(ok) == 1  # good handler still ran despite bad raising


# --------------------------------------------------------------------------- #
# Notification bridge (isolated with a fake sink)
# --------------------------------------------------------------------------- #
class TestNotificationBridge:
    async def test_match_made_produces_notification(self):
        from services.notification.adapter.event_bridge import EventBusBridge
        bus = InMemoryEventBus()
        bridge = EventBusBridge(bus)
        delivered = []

        async def sink(event):
            delivered.append(event)
        bridge.wire(sink)
        await bus.publish(MatchMadeEvent(
            member_id="m1", partner_profile_id="prf_x", composite_score=88).envelope())
        assert len(delivered) == 1
        assert delivered[0].member_id == "m1"
        assert "88" in delivered[0].body

    async def test_match_message_produces_notification(self):
        from services.notification.adapter.event_bridge import EventBusBridge
        bus = InMemoryEventBus()
        bridge = EventBusBridge(bus)
        got = []

        async def sink(e):
            got.append(e)
        bridge.wire(sink)
        await bus.publish(MatchMessageSentEvent(
            member_id="m1", sender_profile_id="prf_y",
            conversation_id="c1", message_preview="Hello!").envelope())
        assert len(got) == 1
        assert "Hello!" in got[0].body

    async def test_daily_generated_produces_notification(self):
        from services.notification.adapter.event_bridge import EventBusBridge
        bus = InMemoryEventBus()
        bridge = EventBusBridge(bus)
        got = []

        async def sink(e):
            got.append(e)
        bridge.wire(sink)
        await bus.publish(DailyGeneratedEvent(
            member_id="m1", sun_sign="aries", ritual_type="horoscope",
            for_date="2026-07-14").envelope())
        assert len(got) == 1
        assert "aries" in got[0].body

    async def test_idempotent_redelivery(self):
        from services.notification.adapter.event_bridge import EventBusBridge
        bus = InMemoryEventBus()
        bridge = EventBusBridge(bus)
        got = []

        async def sink(e):
            got.append(e)
        bridge.wire(sink)
        env = MatchMadeEvent(member_id="m1", partner_profile_id="prf",
                             composite_score=70).envelope()
        await bus.publish(env)
        await bus.publish(env)  # same event_id → deduped
        assert len(got) == 1


# --------------------------------------------------------------------------- #
# Remedies bridge (isolated with the real use case + in-memory adapters)
# --------------------------------------------------------------------------- #
class TestRemediesBridge:
    async def test_bazi_computed_warms_cache(self):
        from services.remedies.adapter.event_bridge import RemediesEventBridge
        from services.remedies.adapter.marketplace import (
            InMemoryMarketplaceSearch, InMemoryRemedyCache)
        from services.remedies.usecase.recommend import RecommendRemedies

        bus = InMemoryEventBus()
        cache = InMemoryRemedyCache()
        usecase = RecommendRemedies(marketplace=InMemoryMarketplaceSearch(),
                                    cache=cache)
        bridge = RemediesEventBridge(bus, usecase)
        bridge.wire()
        await bus.publish(BaziComputedEvent(
            member_id="m1", day_master_element="wood",
            favorable_elements=("water", "earth")).envelope())
        assert bridge.warmed == ["wood"]
        # Cache now holds the wood recommendations
        cached = await cache.get("wood:en:water,earth")
        assert cached is not None
        assert len(cached) >= 2

    async def test_idempotent_redelivery(self):
        from services.remedies.adapter.event_bridge import RemediesEventBridge
        from services.remedies.adapter.marketplace import (
            InMemoryMarketplaceSearch, InMemoryRemedyCache)
        from services.remedies.usecase.recommend import RecommendRemedies

        bus = InMemoryEventBus()
        usecase = RecommendRemedies(marketplace=InMemoryMarketplaceSearch(),
                                    cache=InMemoryRemedyCache())
        bridge = RemediesEventBridge(bus, usecase)
        bridge.wire()
        env = BaziComputedEvent(member_id="m1", day_master_element="fire",
                                favorable_elements=("wood",)).envelope()
        await bus.publish(env)
        await bus.publish(env)  # deduped
        assert bridge.warmed == ["fire"]  # only once
