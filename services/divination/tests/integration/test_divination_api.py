"""Integration tests for the Divination FastAPI app via TestClient."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from services.divination.api.app import create_app, default_dependencies


@pytest.fixture()
def client() -> TestClient:
    return TestClient(create_app(default_dependencies()))


class TestHealth:
    def test_healthz(self, client):
        assert client.get("/healthz").json()["status"] == "alive"

    def test_readyz(self, client):
        body = client.get("/readyz").json()
        assert body["status"] == "ready"
        assert body["deck_size"] == 78
        assert body["hexagrams"] == 64


class TestSpreads:
    def test_list_spreads(self, client):
        r = client.get("/v1/tarot/spreads")
        assert r.status_code == 200
        body = r.json()
        assert body["deckSize"] == 78
        ids = [s["id"] for s in body["spreads"]]
        assert ids == ["single", "three", "celtic"]
        counts = {s["id"]: s["count"] for s in body["spreads"]}
        assert counts == {"single": 1, "three": 3, "celtic": 10}


class TestTarotDraw:
    def test_default_three_card_draw(self, client):
        r = client.post("/v1/tarot", json={})
        assert r.status_code == 200
        body = r.json()
        assert body["spread"] == "three"
        assert len(body["cards"]) == 3
        assert body["deckSize"] == 78
        for card in body["cards"]:
            assert {"card", "reversed", "position"} <= set(card.keys())
            assert {"id", "name", "nameRu", "arcana"} <= set(card["card"].keys())

    def test_single_draw(self, client):
        r = client.post("/v1/tarot", json={"spread": "single"})
        assert r.status_code == 200
        assert len(r.json()["cards"]) == 1

    def test_celtic_draw(self, client):
        r = client.post("/v1/tarot", json={"spread": "celtic"})
        assert r.status_code == 200
        assert len(r.json()["cards"]) == 10

    def test_question_preserved(self, client):
        r = client.post("/v1/tarot", json={"question": "What lies ahead?"})
        assert r.json()["question"] == "What lies ahead?"

    def test_invalid_spread_rejected(self, client):
        r = client.post("/v1/tarot", json={"spread": "bogus"})
        assert r.status_code == 422
        assert "invalid-spread" in r.json()["type"]

    def test_no_card_repeats(self, client):
        r = client.post("/v1/tarot", json={"spread": "celtic"})
        ids = [c["card"]["id"] for c in r.json()["cards"]]
        assert len(ids) == len(set(ids))

    def test_question_max_length(self, client):
        r = client.post("/v1/tarot", json={"question": "x" * 501})
        assert r.status_code == 422


class TestIChingCast:
    def test_cast_returns_hexagram(self, client):
        r = client.post("/v1/iching", json={})
        assert r.status_code == 200
        body = r.json()
        h = body["hexagram"]
        assert 1 <= h["primaryNumber"] <= 64
        assert h["primaryName"]
        assert h["primaryNameRu"]
        assert len(h["lines"]) == 6
        assert body["question"] is None

    def test_cast_with_question(self, client):
        r = client.post("/v1/iching", json={"question": "Should I move?"})
        assert r.json()["question"] == "Should I move?"

    def test_lines_well_formed(self, client):
        r = client.post("/v1/iching", json={})
        lines = r.json()["hexagram"]["lines"]
        for i, ln in enumerate(lines, start=1):
            assert ln["position"] == i
            assert ln["value"] in (6, 7, 8, 9)
            assert isinstance(ln["changing"], bool)

    def test_secondary_consistency(self, client):
        r = client.post("/v1/iching", json={})
        h = r.json()["hexagram"]
        if h["changingLines"]:
            assert h["secondaryNumber"] is not None
            assert 1 <= h["secondaryNumber"] <= 64
        else:
            assert h["secondaryNumber"] is None

    def test_question_max_length(self, client):
        r = client.post("/v1/iching", json={"question": "x" * 501})
        assert r.status_code == 422
