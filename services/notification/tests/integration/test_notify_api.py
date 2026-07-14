"""Integration tests for the Notification FastAPI app via TestClient.

Exercises the FULL stack: routing, pydantic validation, the tone-gate
(NOTIF-3), preferences + quiet hours + caps (NOTIF-5), crisis follow-up
(NOTIF-6), and channel fan-out (NOTIF-2 in-memory stub).

The tone-gate tests (TestToneGateViaHttp) are release-blockers: they assert
that NO aggressive push leaves the service, full stop.
"""
from __future__ import annotations

from datetime import time

import pytest
from fastapi.testclient import TestClient

from services.notification.api.app import create_app, default_dependencies
from services.notification.domain.entities import Preferences


@pytest.fixture()
def client() -> TestClient:
    app = create_app(default_dependencies())
    return TestClient(app)


def _event(client, **overrides):
    body = {
        "member_id": "mem_demo",
        "type": "daily_morning",
        "title": "Your daily insight",
        "body": "A calm, grounding day for focused work.",
        "channels": ["push", "inapp"],
    }
    body.update(overrides)
    return client.post("/v1/notify/events", json=body)


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #
class TestHealth:
    def test_healthz(self, client):
        assert client.get("/healthz").json()["status"] == "alive"

    def test_readyz_reports_tone_gate(self, client):
        r = client.get("/readyz")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ready"
        assert body["tone_gate"] == "active"
        assert body["crisis_resources"] >= 10


# --------------------------------------------------------------------------- #
# Event ingest — happy path
# --------------------------------------------------------------------------- #
class TestIngest:
    def test_calm_event_accepted(self, client):
        r = _event(client)
        assert r.status_code == 202
        body = r.json()
        assert body["accepted"] is True
        assert body["delivered"] is True
        assert body["tone_verdict"] == "pass"
        assert body["notification_id"] is not None
        assert "push" in body["delivery"]
        assert "inapp" in body["delivery"]

    def test_persisted_and_listed(self, client):
        _event(client, title="insight one")
        r = client.get("/v1/notify/members/mem_demo")
        assert r.status_code == 200
        rows = r.json()["notifications"]
        assert any(n["title"] == "insight one" for n in rows)

    def test_invalid_type_rejected(self, client):
        r = _event(client, type="bogus")
        assert r.status_code == 422

    def test_invalid_channel_rejected(self, client):
        r = _event(client, channels=["push", "carrier_pigeon"])
        assert r.status_code == 422
        assert "channel" in r.json()["detail"].lower()


# --------------------------------------------------------------------------- #
# Tone-gate via HTTP — CRITICAL (release-blocker)
# --------------------------------------------------------------------------- #
class TestToneGateViaHttp:
    def test_aggressive_event_blocked(self, client):
        r = _event(client, title="URGENT!!!", body="Act now or else!!!")
        assert r.status_code == 422
        body = r.json()
        assert body["accepted"] is False
        assert body["tone_verdict"] == "block"
        assert "blocked" in body["suppressed_reason"]
        # Nothing persisted
        assert client.get("/v1/notify/members/mem_demo").json()["count"] == 0

    def test_spam_event_blocked(self, client):
        r = _event(client, title="FREE MONEY", body="Click here 100% guaranteed")
        assert r.json()["tone_verdict"] == "block"

    def test_softened_event_delivered(self, client):
        r = _event(client, title="HURRY", body="Read it now!")
        assert r.status_code == 202
        body = r.json()
        assert body["accepted"] is True
        assert body["tone_verdict"] == "soften"
        # Persisted wording is calm (deflated title)
        row = client.get("/v1/notify/members/mem_demo").json()["notifications"][0]
        assert row["title"] == row["title"].title()


# --------------------------------------------------------------------------- #
# Preferences (NOTIF-5)
# --------------------------------------------------------------------------- #
class TestPreferences:
    def test_opt_out_suppresses_type(self, client):
        client.put("/v1/notify/prefs/mem_optout", json={
            "enabled_types": [], "daily_cap": 5, "sms_opt_in": False,
        })
        r = client.post("/v1/notify/events", json={
            "member_id": "mem_optout", "type": "weekly_digest",
            "title": "Weekly recap", "body": "Your week in review.",
        })
        assert r.status_code == 422
        assert "opt-out" in r.json()["suppressed_reason"]

    def test_crisis_followup_ignores_opt_out(self, client):
        """Crisis follow-up bypasses opt-out (safety > preference)."""
        client.put("/v1/notify/prefs/mem_optout", json={
            "enabled_types": [], "daily_cap": 0, "sms_opt_in": False,
        })
        r = client.post("/v1/notify/crisis-followup", json={
            "member_id": "mem_optout", "country_code": "US", "language": "en",
        })
        assert r.status_code == 200
        assert r.json()["delivered"] is True

    def test_sms_stripped_without_opt_in(self, client):
        r = _event(client, channels=["push", "sms"])
        assert r.status_code == 202
        delivered = client.get("/v1/notify/members/mem_demo").json()
        channels = set(delivered["notifications"][0]["channels"])
        assert "sms" not in channels
        assert "push" in channels


# --------------------------------------------------------------------------- #
# Crisis follow-up (NOTIF-6)
# --------------------------------------------------------------------------- #
class TestCrisisFollowup:
    def test_us_followup_delivered(self, client):
        r = client.post("/v1/notify/crisis-followup", json={
            "member_id": "mem_crisis", "country_code": "US", "language": "en",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["delivered"] is True
        assert body["resources"]["hotline_number"] == "988"
        assert body["resources"]["followup_window_h"] == 24

    def test_ru_followup_localized(self, client):
        r = client.post("/v1/notify/crisis-followup", json={
            "member_id": "mem_crisis", "country_code": "RU", "language": "ru",
        })
        body = r.json()
        assert body["delivered"] is True
        assert body["resources"]["hotline_number"].startswith("+7")

    def test_followup_bypasses_quiet_hours(self, client):
        """Even at 03:00, crisis follow-up is delivered."""
        # Pin the clock to deep night via app state.
        from services.notification.adapter.channels import InMemoryClock
        app = create_app(default_dependencies())
        app.state.deps.clock = InMemoryClock(fixed_local=time(3, 0))
        app.state.deps.usecase.clock = app.state.deps.clock
        c = TestClient(app)
        r = c.post("/v1/notify/crisis-followup", json={
            "member_id": "mem_night", "country_code": "KZ", "language": "en",
        })
        assert r.json()["delivered"] is True
        assert r.json()["resources"]["hotline_number"] == "150"

    def test_followup_body_contains_hotline(self, client):
        client.post("/v1/notify/crisis-followup", json={
            "member_id": "mem_crisis", "country_code": "US", "language": "en",
        })
        rows = client.get("/v1/notify/members/mem_crisis").json()["notifications"]
        assert "988" in rows[0]["body"]
