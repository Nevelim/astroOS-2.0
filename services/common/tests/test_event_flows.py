"""End-to-end event-flow integration tests with a shared InMemory bus.

These wire producer apps (bazi, daily, cosmic_match) and consumer apps
(notification, remedies) to ONE shared InMemoryEventBus, then exercise the
full pipeline via the producer debug-emit endpoints and assert the consumer
side-effects. This validates the entire BAZI-6 / MATCH-10 / DAILY-5 event
contracts end-to-end in-process (Redis does the same across processes).

Flow 1 (BAZI-6): bazi emits bazi.computed → Remedies prefetch warms cache.
Flow 2 (MATCH-10): cosmic_match emits match.message.sent → Notification delivers.
Flow 3 (DAILY-5): daily emits daily.generated → Notification delivers.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from services.common.eventbus import InMemoryEventBus


@pytest.fixture()
def shared_bus() -> InMemoryEventBus:
    return InMemoryEventBus()


@pytest.fixture()
def bazi_client(shared_bus):
    from services.bazi_engine.api.app import create_app, default_dependencies
    return TestClient(create_app(default_dependencies(), event_bus=shared_bus))


@pytest.fixture()
def daily_client(shared_bus):
    from services.daily_content.api.app import create_app, default_dependencies
    return TestClient(create_app(default_dependencies(), event_bus=shared_bus))


@pytest.fixture()
def match_client(shared_bus):
    from services.cosmic_match.api.app import create_app, default_dependencies
    return TestClient(create_app(default_dependencies(), event_bus=shared_bus))


@pytest.fixture()
def notification_client(shared_bus):
    from services.notification.api.app import create_app, default_dependencies
    return TestClient(create_app(default_dependencies(), event_bus=shared_bus))


@pytest.fixture()
def remedies_client(shared_bus):
    from services.remedies.api.app import create_app, default_dependencies
    return TestClient(create_app(default_dependencies(), event_bus=shared_bus))


# --------------------------------------------------------------------------- #
# Flow 1: BAZI-6 — bazi.computed → Remedies prefetch
# --------------------------------------------------------------------------- #
class TestBaziToRemediesFlow:
    def test_bazi_emit_warms_remedies_cache(self, bazi_client, remedies_client,
                                            shared_bus):
        """bazi publishes favorable elements → Remedies prefetches the catalog."""
        # Emit the event via the bazi debug endpoint.
        r = bazi_client.post("/v1/bazi/events/emit", json={
            "member_id": "m1", "day_master_element": "wood",
            "favorable_elements": ["water", "earth"],
            "birth_data_hash": "sha256:abc",
        })
        assert r.status_code == 202
        # The Remedies bridge ran synchronously (InMemory bus). Verify the
        # cache was warmed by checking the Remedies readyz / a recomputation
        # is now served (the member would get a cache hit on their request).
        bridge = remedies_client.app.state.event_bridge
        assert "wood" in bridge.warmed


# --------------------------------------------------------------------------- #
# Flow 2: MATCH-10 — match.message.sent → Notification
# --------------------------------------------------------------------------- #
class TestMatchToNotificationFlow:
    def test_match_message_delivers_notification(self, match_client,
                                                 notification_client,
                                                 shared_bus):
        r = match_client.post("/v1/match/events/emit", json={
            "type": "match.message.sent",
            "member_id": "mem_recipient",
            "sender_profile_id": "prf_sender",
            "conversation_id": "conv1",
            "message_preview": "Hey, loved your chart!",
        })
        assert r.status_code == 202
        # The Notification bridge ran → a notification was created.
        rows = notification_client.get(
            "/v1/notify/members/mem_recipient").json()["notifications"]
        assert any("loved your chart" in n["body"] for n in rows)

    def test_match_made_delivers_notification(self, match_client,
                                              notification_client, shared_bus):
        r = match_client.post("/v1/match/events/emit", json={
            "type": "match.made",
            "member_id": "mem_recipient",
            "partner_profile_id": "prf_partner",
            "composite_score": 91,
        })
        assert r.status_code == 202
        rows = notification_client.get(
            "/v1/notify/members/mem_recipient").json()["notifications"]
        assert any("91" in n["body"] for n in rows)


# --------------------------------------------------------------------------- #
# Flow 3: DAILY-5 — daily.generated → Notification
# --------------------------------------------------------------------------- #
class TestDailyToNotificationFlow:
    def test_daily_generated_delivers_notification(self, daily_client,
                                                   notification_client,
                                                   shared_bus):
        r = daily_client.post("/v1/daily/events/emit", json={
            "member_id": "mem_user", "sun_sign": "leo",
            "ritual_type": "horoscope", "for_date": "2026-07-14",
        })
        assert r.status_code == 202
        rows = notification_client.get(
            "/v1/notify/members/mem_user").json()["notifications"]
        assert any("leo" in n["body"] for n in rows)


# --------------------------------------------------------------------------- #
# Idempotency across the bus
# --------------------------------------------------------------------------- #
class TestIdempotency:
    def test_same_event_id_no_duplicate_notification(self, match_client,
                                                     notification_client,
                                                     shared_bus):
        """Two emits with the same content produce distinct event_ids (uuid),
        so both deliver. But a literally redelivered envelope (same event_id)
        is deduped by the bridge."""
        from services.common.events import MatchMessageSentEvent
        env = MatchMessageSentEvent(
            member_id="mem_d", sender_profile_id="prf_s",
            conversation_id="c", message_preview="dup").envelope()
        # Publish the SAME envelope twice directly on the shared bus.
        import asyncio
        asyncio.get_event_loop().run_until_complete(shared_bus.publish(env))
        asyncio.get_event_loop().run_until_complete(shared_bus.publish(env))
        rows = notification_client.get(
            "/v1/notify/members/mem_d").json()["notifications"]
        # Only one notification despite double publish.
        dup_msgs = [n for n in rows if "dup" in n["body"]]
        assert len(dup_msgs) == 1
