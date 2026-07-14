"""Integration tests for the AI Mentor FastAPI app via TestClient.

Exercises the FULL stack: routing, pydantic validation, real adapters
(DeterministicLLM + InMemoryConversationStore + InMemoryResponseCache),
the 4-layer guardrail pipeline (ADR SM-03), crisis short-circuit, rate
limiting, and both JSON + SSE response modes.

The crisis tests (TestCrisisIntercept) are release-blockers: a user in
crisis must ALWAYS receive the hotline, never be blocked by rate limits
or cost-control (ADR-0007 safety override).
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from services.ai_mentor.api.app import create_app, default_dependencies


@pytest.fixture()
def client() -> TestClient:
    app = create_app(default_dependencies())
    return TestClient(app)


def _post(client: TestClient, conv: str, content: str, **kw):
    body = {"content": content, "voice": "calm"}
    body.update(kw.pop("json", {}))
    headers = kw.pop("headers", {})
    return client.post(f"/v1/mentor/conversations/{conv}/messages",
                       json=body, headers=headers)


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #
class TestHealth:
    def test_healthz(self, client):
        r = client.get("/healthz")
        assert r.status_code == 200
        assert r.json()["status"] == "alive"

    def test_readyz_reports_hotlines(self, client):
        r = client.get("/readyz")
        assert r.status_code == 200
        assert r.json()["status"] == "ready"
        assert r.json()["hotlines_loaded"] >= 10  # 10 countries


# --------------------------------------------------------------------------- #
# Normal chat flow
# --------------------------------------------------------------------------- #
class TestChat:
    def test_normal_message_returns_200(self, client):
        r = _post(client, "c1", "How does my Saturn return affect my career?")
        assert r.status_code == 200
        body = r.json()
        assert body["crisis"] == "none"
        assert body["voice"] == "calm"
        assert body["cached"] is False
        assert body["tokens_used"] > 0
        assert body["rate_limit"]["limit"] == 3

    def test_voice_alias_accepted(self, client):
        """API guide uses 'empowerment'; domain uses 'calm'. Both valid."""
        r = _post(client, "c1", "Tell me about my Moon.",
                  json={"voice": "empowerment"})
        assert r.status_code == 200
        assert r.json()["voice"] == "calm"

    def test_unknown_voice_defaults_calm(self, client):
        r = _post(client, "c1", "Hi", json={"voice": "bogus"})
        assert r.status_code == 200
        assert r.json()["voice"] == "calm"

    def test_context_aware_saturn_reflection(self, client):
        r = _post(client, "c1", "What about my Saturn placement?")
        assert r.status_code == 200
        assert "saturn" in r.json()["content"].lower()

    def test_empty_content_rejected(self, client):
        r = _post(client, "c1", "")
        assert r.status_code == 422  # pydantic min_length

    def test_oversized_content_rejected(self, client):
        r = _post(client, "c1", "x" * 4001)
        assert r.status_code == 422  # max_length


# --------------------------------------------------------------------------- #
# Crisis intercept — CRITICAL (release-blocker)
# --------------------------------------------------------------------------- #
class TestCrisisIntercept:
    def test_crisis_returns_hotline(self, client):
        r = _post(client, "c1", "I want to kill myself",
                  headers={"X-Member-Id": "anon:US"})
        assert r.status_code == 200
        body = r.json()
        assert body["crisis"] == "crisis"
        assert body["hotline"] == "988"  # US hotline
        assert "988" in body["content"]

    def test_crisis_multilingual_russian(self, client):
        r = _post(client, "c1", "хочу умереть",
                  headers={"X-Member-Id": "anon:RU"})
        assert r.status_code == 200
        body = r.json()
        assert body["crisis"] == "crisis"
        assert body["hotline"].startswith("+7")

    def test_crisis_bypasses_rate_limit(self, client):
        """A user who exhausted free messages MUST still get crisis help."""
        member = "anon:US"
        # Exhaust the free limit (3 messages)
        for i in range(3):
            _post(client, "c1", f"message {i}", headers={"X-Member-Id": member})
        # Now over the limit → crisis still works
        r = _post(client, "c1", "I want to die", headers={"X-Member-Id": member})
        assert r.status_code == 200
        assert r.json()["crisis"] == "crisis"

    def test_crisis_country_routing(self, client):
        r = _post(client, "c1", "suicide", headers={"X-Member-Id": "anon:KZ"})
        assert r.status_code == 200
        assert r.json()["hotline"] == "150"  # Kazakhstan


# --------------------------------------------------------------------------- #
# Guardrails — forbidden content filtered
# --------------------------------------------------------------------------- #
class TestGuardrails:
    def test_forbidden_response_replaced(self, client, monkeypatch):
        """If the LLM produces fatalism, layer 3 swaps it for a safe reply."""
        from services.ai_mentor.adapter.providers import DeterministicLLM
        from services.ai_mentor.domain.entities import VoiceProfile, ConversationContext

        class FatalLLM(DeterministicLLM):
            def generate(self, system_prompt, context, user_message, voice):
                return "you will die alone in darkness"

        app = create_app(default_dependencies())
        app.state.deps.usecase.llm = FatalLLM()
        c = TestClient(app)
        r = _post(c, "c1", "What's my future?")
        assert r.status_code == 200
        assert "die alone" not in r.json()["content"].lower()


# --------------------------------------------------------------------------- #
# Rate limiting (Free tier)
# --------------------------------------------------------------------------- #
class TestRateLimit:
    def test_free_limit_returns_429(self, client):
        member = "ratelimit_user"
        for i in range(3):
            r = _post(client, "c1", f"msg {i}", headers={"X-Member-Id": member})
            assert r.status_code == 200
        # 4th message → 429
        r = _post(client, "c1", "one more", headers={"X-Member-Id": member})
        assert r.status_code == 429
        assert r.headers["X-RateLimit-Limit"] == "3"
        assert r.headers["X-RateLimit-Remaining"] == "0"
        assert r.headers["Retry-After"] == "86400"
        assert "rate-limit" in r.json()["type"]

    def test_rate_limit_not_shared_across_members(self, client):
        for i in range(3):
            _post(client, "c1", f"msg {i}", headers={"X-Member-Id": "user_a"})
        # user_b still has full quota
        r = _post(client, "c1", "hello", headers={"X-Member-Id": "user_b"})
        assert r.status_code == 200


# --------------------------------------------------------------------------- #
# SSE streaming
# --------------------------------------------------------------------------- #
class TestSSEStream:
    def test_stream_yields_tokens_then_done(self, client):
        r = _post(client, "c1", "Tell me about Mars",
                  headers={"Accept": "text/event-stream"})
        assert r.status_code == 200
        assert "text/event-stream" in r.headers["content-type"]
        events = _parse_sse(r.text)
        types = [e["type"] for e in events]
        assert "token" in types
        assert types[-1] == "done"
        # Assembled text is non-empty
        text = "".join(e.get("text", "") for e in events if e["type"] == "token")
        assert len(text.strip()) > 0

    def test_stream_crisis_emits_crisis_event(self, client):
        r = _post(client, "c1", "I want to kill myself",
                  headers={"Accept": "text/event-stream",
                           "X-Member-Id": "anon:US"})
        assert r.status_code == 200
        events = _parse_sse(r.text)
        assert events[0]["type"] == "crisis"
        assert events[0]["hotline"]["country"] == "US"
        assert events[-1]["type"] == "done"
        assert events[-1]["crisis"] == "crisis"


# --------------------------------------------------------------------------- #
# Privacy — birth_data_hash is a cache key, never echoed
# --------------------------------------------------------------------------- #
class TestPrivacy:
    def test_no_raw_context_in_response(self, client):
        r = _post(client, "c1", "Hello",
                  json={"idempotency_key": "sha256:SECRETKEY123"})
        text = r.text
        assert "SECRETKEY123" not in text  # key never echoed


def _parse_sse(body: str) -> list[dict]:
    """Parse 'data: {...}\\n\\n' SSE frames into a list of decoded dicts."""
    events = []
    for chunk in body.split("\n\n"):
        chunk = chunk.strip()
        if not chunk.startswith("data:"):
            continue
        payload = chunk[len("data:"):].strip()
        try:
            events.append(json.loads(payload))
        except json.JSONDecodeError:
            pass
    return events
