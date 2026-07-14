"""Integration tests for the new astro API endpoints (astrocartography, synastry).

These use FastAPI TestClient to verify the HTTP layer of the recently-added
domain modules. The natal-chart Part-of-Fortune enrichment is also covered.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from services.astro_engine.api.app import create_app


@pytest.fixture()
def client():
    return TestClient(create_app())


class TestAstrocartographyEndpoint:
    def test_returns_lines(self, client):
        r = client.post("/v1/astrocartography", json={
            "utc": "1989-04-15T09:40:00Z",
            "planets": {"sun": {"ra": 22.5, "dec": 10.0}},
            "latitudes": [0, 45],
        })
        assert r.status_code == 200
        lines = r.json()["lines"]
        assert len(lines) > 0
        angles = {l["angle"] for l in lines}
        assert {"MC", "IC"} <= angles

    def test_missing_data_422(self, client):
        r = client.post("/v1/astrocartography", json={"utc": "2020-01-01"})
        assert r.status_code == 422

    def test_mc_line_same_across_latitudes(self, client):
        r = client.post("/v1/astrocartography", json={
            "utc": "2020-01-01T00:00:00Z",
            "planets": {"venus": {"ra": 270.0, "dec": -20.0}},
            "latitudes": [-30, 0, 30],
        })
        mc_longs = [l["longitude_deg"] for l in r.json()["lines"]
                    if l["angle"] == "MC" and l["planet"] == "venus"]
        assert len(set(mc_longs)) == 1  # all identical (straight line)


class TestSynastryEndpoint:
    def test_returns_composite_score(self, client):
        r = client.post("/v1/synastry", json={
            "planets_a": {"sun": 0.0, "moon": 0.0},
            "planets_b": {"sun": 0.0, "moon": 120.0},
        })
        assert r.status_code == 200
        body = r.json()
        assert 0 <= body["composite_score"] <= 100
        assert "summary" in body

    def test_with_nodal_contacts(self, client):
        r = client.post("/v1/synastry", json={
            "planets_a": {"venus": 0.0},
            "planets_b": {"mars": 0.0},
            "nodes_a": [0.0, 180.0],
        })
        assert r.status_code == 200
        assert len(r.json()["nodal_contacts"]) >= 1

    def test_missing_charts_422(self, client):
        r = client.post("/v1/synastry", json={"planets_a": {}})
        assert r.status_code == 422

    def test_highlights_present(self, client):
        r = client.post("/v1/synastry", json={
            "planets_a": {"sun": 0.0},
            "planets_b": {"moon": 2.0},
        })
        highlights = r.json()["highlights"]
        assert any("Sun–Moon" in h for h in highlights)


class TestLunarPhaseEndpoint:
    def test_new_moon(self, client):
        r = client.get("/v1/lunar-phase", params={"sun": 0.0, "moon": 0.0})
        assert r.status_code == 200
        body = r.json()
        assert body["phase"] == "new_moon"
        assert body["illumination_pct"] == 0.0
        assert body["emoji"] == "🌑"

    def test_full_moon(self, client):
        r = client.get("/v1/lunar-phase", params={"sun": 0.0, "moon": 180.0})
        body = r.json()
        assert body["phase"] == "full_moon"
        assert body["illumination_pct"] == 100.0


class TestTransitsEndpoint:
    def test_daily_transits(self, client):
        r = client.post("/v1/transits/daily", json={
            "current": {"venus": 0.0},
            "natal": {"sun": 0.0},
            "natal_sun_sign": "aries",
        })
        assert r.status_code == 200
        body = r.json()
        assert "score" in body
        assert "summary" in body
        assert len(body["aspects"]) >= 1

    def test_missing_positions_422(self, client):
        r = client.post("/v1/transits/daily", json={"current": {}})
        assert r.status_code == 422


class TestRetrogradeStatusEndpoint:
    def test_returns_planet_status(self, client):
        r = client.get("/v1/retrogrades")
        # May return 200 (ephemeris available) or 503 (not loaded in test env).
        if r.status_code == 503:
            pytest.skip("Ephemeris not available in this test environment")
        assert r.status_code == 200
        body = r.json()
        assert "as_of_utc" in body
        assert "retrograde" in body
        assert "direct" in body
        assert body["retrograde_count"] == len(body["retrograde"])
        # Sun and Moon are never retrograde — must be in 'direct'.
        direct_names = {p["planet"] for p in body["direct"]}
        assert "sun" in direct_names
        assert "moon" in direct_names
        # Each entry has the required fields.
        for entry in body["retrograde"] + body["direct"]:
            assert "planet" in entry and "longitude_deg" in entry
            assert "retrograde" in entry


class TestFamilyAbundanceEndpoint:
    """Family astrocartography ranking endpoint (mode A: precomputed planets)."""

    # Canonical family longitudes (family-synergy.json).
    _IGOR = {"Sun": 25.3979365654, "Moon": 143.7677061800, "Mercury": 37.1230246217,
             "Venus": 28.0811107907, "Mars": 81.4861726624, "Jupiter": 66.2583365169,
             "Saturn": 283.8807168145, "Uranus": 275.3168427146, "Neptune": 282.3830719813,
             "Pluto": 224.3205126794, "NorthNode": 153.4609428820}

    def _two_members(self):
        # Minimal two-member family (precomputed planets + GMST).
        return [
            {"key": "igor", "name": "Игорь", "planets": self._IGOR, "gst_deg": 348.5267},
            {"key": "yulia", "name": "Юлия",
             "planets": {"Sun": 150.4, "Jupiter": 94.47}, "gst_deg": 179.3319},
        ]

    def test_returns_ranked_cities(self, client):
        r = client.post("/v1/family-abundance", json={
            "members": self._two_members(),
            "cities": [
                {"name": "Лангепас", "lat": 60.25, "lng": 74.8167},
                {"name": "Павлодар", "lat": 52.2833, "lng": 76.9667},
            ],
        })
        assert r.status_code == 200
        body = r.json()
        assert body["totalCities"] == 2
        assert len(body["topCitiesBySynergy"]) == 2
        top = body["topCitiesBySynergy"][0]
        # Required keys present.
        for k in ("city", "familyAvg", "totalSynergy", "resonanceScore",
                  "crossAspectScore", "complementarityScore", "harmonyScore"):
            assert k in top
        assert isinstance(top["totalSynergy"], (int, float))

    def test_missing_members_422(self, client):
        r = client.post("/v1/family-abundance", json={"cities": []})
        assert r.status_code == 422

    def test_member_needs_planets_or_birth_data_422(self, client):
        r = client.post("/v1/family-abundance", json={
            "members": [{"key": "x", "name": "X"}],   # neither mode
            "cities": [{"name": "C", "lat": 0, "lng": 0}],
        })
        assert r.status_code == 422

    def test_limit_truncates_top_cities(self, client):
        cities = [{"name": f"C{i}", "lat": float(i), "lng": float(i)} for i in range(5)]
        r = client.post("/v1/family-abundance", json={
            "members": self._two_members(), "cities": cities, "limit": 2,
        })
        assert r.status_code == 200
        assert len(r.json()["topCitiesBySynergy"]) <= 2

    def test_best_by_synergy_type_populated(self, client):
        r = client.post("/v1/family-abundance", json={
            "members": self._two_members(),
            "cities": [
                {"name": "A", "lat": 60.25, "lng": 74.8167},
                {"name": "B", "lat": 52.2833, "lng": 76.9667},
            ],
        })
        bbst = r.json()["bestBySynergyType"]
        for t in ("resonance", "crossAspect", "complementarity", "harmony"):
            assert t in bbst and "city" in bbst[t]


class TestLocalSpaceFromBirthEndpoint:
    """Local-space computed server-side from UTC + observer coordinates."""

    def test_missing_data_422(self, client):
        r = client.post("/v1/local-space-from-birth", json={"utc": "2020-01-01T00:00:00Z"})
        assert r.status_code == 422

    def test_invalid_utc_422(self, client):
        r = client.post("/v1/local-space-from-birth", json={
            "utc": "not-a-date", "lat": 50.0, "lng": 10.0,
        })
        assert r.status_code == 422

    def test_returns_planet_lines_or_ephemeris_unavailable(self, client):
        """Either the ephemeris loads (200) or it's absent (503) — both valid
        in a test environment. We assert the success-path shape."""
        r = client.post("/v1/local-space-from-birth", json={
            "utc": "1989-04-15T09:40:00Z", "lat": 52.2833, "lng": 76.9667,
        })
        if r.status_code == 503:
            pytest.skip("Ephemeris not available in this test environment")
        assert r.status_code == 200
        body = r.json()
        assert "planet_lines" in body
        assert "lst_deg" in body
        assert "planet_longitudes" in body
        assert isinstance(body["planet_lines"], list)
        if body["planet_lines"]:
            line = body["planet_lines"][0]
            for key in ("planet", "azimuth_deg", "altitude_deg", "sector", "above_horizon"):
                assert key in line
            # Azimuth is a compass bearing [0, 360).
            assert 0 <= line["azimuth_deg"] < 360
            # Sector is one of the 8 compass points.
            assert line["sector"] in ("N", "NE", "E", "SE", "S", "SW", "W", "NW")


