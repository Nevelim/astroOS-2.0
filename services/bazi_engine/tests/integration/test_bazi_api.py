"""Integration tests for the BaZi Engine API.

These tests wire the full stack: a fake BirthFacts store (populated with the
Pavlodar case), the real solar-terms adapter, real pillar math. They prove
the endpoint /v1/charts/bazi/:hash works end-to-end and that the Pavlodar
case yields the spec-verified pillar values.
"""
from __future__ import annotations

from datetime import date, time

import pytest
from fastapi.testclient import TestClient

from services.bazi_engine.adapter.solar_terms import (
    ApproxSolarTermsProvider,
    BirthFacts,
)
from services.bazi_engine.api.app import Dependencies, InMemoryBirthFacts, create_app
from services.bazi_engine.usecase.resolve_bazi import ResolveBaZi
from services.birth_time.domain.entities import TimeQuality


PAVLODAR_HASH = "sha256:pavlodar-test-1989"
PAVLODAR_FACTS = BirthFacts(
    birth_date=date(1989, 4, 15),
    tst=time(14, 47, 33),        # the True Solar Time from Birth-Time service
    time_quality=TimeQuality.EXACT,
    gender="male",
)


@pytest.fixture
def client() -> TestClient:
    facts_store = InMemoryBirthFacts(store={PAVLODAR_HASH: PAVLODAR_FACTS})
    deps = Dependencies(
        facts=facts_store,
        resolver=ResolveBaZi(solar_terms=ApproxSolarTermsProvider()),
    )
    return TestClient(create_app(deps))


class TestHealth:
    def test_healthz(self, client):
        assert client.get("/healthz").json() == {"status": "alive"}

    def test_readyz(self, client):
        assert client.get("/readyz").json() == {"status": "ready"}


class TestBaZiPavlodar:
    def test_returns_full_chart(self, client):
        r = client.get(f"/v1/charts/bazi/{PAVLODAR_HASH}")
        assert r.status_code == 200, r.text
        body = r.json()

        # Cache headers (immutable)
        assert r.headers["Cache-Control"] == "public, max-age=31536000, immutable"
        assert r.headers["ETag"] == f'"{PAVLODAR_HASH}"'

        # Time standard + TST
        assert body["time_standard_used"] == "true_solar_time"
        assert body["tst_used"] == "14:47:33"

        # Day pillar — verified against sxtwl: 乙巳
        assert body["pillars"]["day"]["stem"] == "yi"
        assert body["pillars"]["day"]["branch"] == "si"
        assert body["pillars"]["day"]["stem_hanzi"] == "乙"
        assert body["pillars"]["day"]["branch_hanzi"] == "巳"

        # Year pillar — 己巳 (post-Lichun 1989)
        assert body["pillars"]["year"]["stem"] == "ji"
        assert body["pillars"]["year"]["branch"] == "si"

        # Hour pillar present (EXACT time quality) — wei hour from TST 14:47
        assert "hour" in body["pillars"]
        assert body["pillars"]["hour"]["branch"] == "wei"

        # Day Master = 乙 (yin wood)
        assert body["day_master"]["stem"] == "yi"
        assert body["day_master"]["element"] == "wood"
        assert body["day_master"]["polarity"] == "yin"
        assert body["day_master"]["label"] == "yin_wood"

        # Ten Gods present
        assert set(body["ten_gods"].keys()) >= {"year", "month", "day", "hour"}

        # Favorable elements populated
        assert len(body["favorable_elements"]) == 2

        # Luck pillars sequence
        assert len(body["luck_pillars"]) == 8

    def test_unknown_hash_returns_404_problem(self, client):
        r = client.get("/v1/charts/bazi/sha256:does-not-exist")
        assert r.status_code == 404
        assert r.headers["content-type"].startswith("application/problem+json")
        body = r.json()
        assert body["type"].endswith("birth-facts/not-found")
        assert body["status"] == 404


class TestUnknownTimeQuality:
    """When time_quality != EXACT, the hour pillar must be omitted."""

    def test_three_pillar_mode(self):
        from services.bazi_engine.adapter.solar_terms import (
            ApproxSolarTermsProvider, BirthFacts,
        )
        from services.bazi_engine.api.app import Dependencies, InMemoryBirthFacts, create_app
        from services.bazi_engine.usecase.resolve_bazi import ResolveBaZi
        from fastapi.testclient import TestClient
        from datetime import date, time
        from services.birth_time.domain.entities import TimeQuality

        hash_ = "sha256:unknown-time"
        facts = BirthFacts(
            birth_date=date(1990, 6, 15),
            tst=time(12, 0),
            time_quality=TimeQuality.UNKNOWN,
            gender="female",
        )
        store = InMemoryBirthFacts(store={hash_: facts})
        deps = Dependencies(
            facts=store,
            resolver=ResolveBaZi(solar_terms=ApproxSolarTermsProvider()),
        )
        client = TestClient(create_app(deps))
        body = client.get(f"/v1/charts/bazi/{hash_}").json()
        assert "hour" not in body["pillars"]
        assert "3-pillar" in body["note"].lower() or "not exact" in body["note"].lower()
