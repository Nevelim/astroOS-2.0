"""Integration tests for the FastAPI app via TestClient.

These exercise the FULL stack: routing, validation, real adapters
(zoneinfo + NOAA + catalogue), problem+json error format, cache headers.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from services.birth_time.api.app import create_app, default_dependencies


@pytest.fixture(scope="module")
def client() -> TestClient:
    # Use REAL adapters via default_dependencies — true end-to-end test.
    app = create_app(default_dependencies())
    return TestClient(app)


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #
class TestHealth:
    def test_healthz(self, client):
        r = client.get("/healthz")
        assert r.status_code == 200
        assert r.json()["status"] == "alive"

    def test_readyz(self, client):
        r = client.get("/readyz")
        assert r.status_code == 200
        assert r.json()["status"] == "ready"


# --------------------------------------------------------------------------- #
# Geo autocomplete
# --------------------------------------------------------------------------- #
class TestGeoAutocomplete:
    def test_pavlodar_appears(self, client):
        r = client.get("/v1/geo/autocomplete", params={"q": "Павло"})
        assert r.status_code == 200
        results = r.json()["results"]
        assert any(x["name"] == "Павлодар" for x in results)
        pavl = [x for x in results if x["name"] == "Павлодар"][0]
        assert pavl["iana_zone"] == "Asia/Almaty"
        assert abs(pavl["lat"] - 52.30) < 0.01

    def test_translit_match(self, client):
        # "Pavlodar" (latin) should still find "Павлодар".
        r = client.get("/v1/geo/autocomplete", params={"q": "Pavlodar"})
        assert r.status_code == 200
        names = [x["name"] for x in r.json()["results"]]
        assert "Павлодар" in names

    def test_min_length_rejected(self, client):
        r = client.get("/v1/geo/autocomplete", params={"q": "П"})
        assert r.status_code == 422  # FastAPI validation

    def test_empty_results_for_unknown(self, client):
        r = client.get("/v1/geo/autocomplete", params={"q": "ZZZZXXX"})
        assert r.status_code == 200
        assert r.json()["results"] == []


# --------------------------------------------------------------------------- #
# Birth-time resolve — the canonical Pavlodar case end-to-end
# --------------------------------------------------------------------------- #
class TestResolvePavlodar:
    def test_pavlodar_1989_full_chain(self, client):
        r = client.get("/v1/birth-time/resolve", params={
            "local_date": "1989-04-15",
            "local_time": "16:40",
            "place_id": "geonames:1520132",
        })
        assert r.status_code == 200, r.text
        body = r.json()

        # Hash + cache headers (immutable)
        assert body["birth_data_hash"].startswith("sha256:")
        assert r.headers["Cache-Control"] == "public, max-age=31536000, immutable"
        assert "ETag" in r.headers

        res = body["resolution"]
        # UTC step
        assert res["utc"] == "1989-04-15T09:40:00Z"
        assert res["utc_offset_minutes"] == 420
        assert res["dst_active"] is True
        # LMT / TST
        assert res["local_mean_time"].startswith("14:47:")
        assert res["true_solar_time"].startswith("14:47:")
        # EoT near zero on 15 Apr
        assert -1.5 <= res["equation_of_time_minutes"] <= 0.0
        # BaZi shichen
        assert body["bazi"]["shichen"] == "wei"
        assert "wei" in body["bazi"]["note"] and "shen" in body["bazi"]["note"]
        # tzdata version captured
        assert res["tzdata_version"] and res["tzdata_version"] != "unknown"
        # Unambiguous
        assert res["ambiguity"] == "none"

    def test_etag_stable_across_calls(self, client):
        params = {"local_date": "1989-04-15", "local_time": "16:40",
                  "place_id": "geonames:1520132"}
        etag1 = client.get("/v1/birth-time/resolve", params=params).headers["ETag"]
        etag2 = client.get("/v1/birth-time/resolve", params=params).headers["ETag"]
        assert etag1 == etag2

    def test_resolve_by_coords(self, client):
        r = client.get("/v1/birth-time/resolve", params={
            "local_date": "1989-04-15", "local_time": "16:40",
            "lat": 52.30, "lng": 76.95, "iana_zone": "Asia/Almaty",
        })
        assert r.status_code == 200
        assert r.json()["resolution"]["utc"] == "1989-04-15T09:40:00Z"


# --------------------------------------------------------------------------- #
# Error format (RFC 7807 problem+json)
# --------------------------------------------------------------------------- #
class TestErrors:
    def test_place_not_found(self, client):
        r = client.get("/v1/birth-time/resolve", params={
            "local_date": "1989-04-15", "local_time": "16:40",
            "place_id": "geonames:0000000",
        })
        assert r.status_code == 404
        assert r.headers["content-type"].startswith("application/problem+json")
        body = r.json()
        assert body["type"].endswith("place/not-found")
        assert body["status"] == 404

    def test_missing_place_identifier(self, client):
        # No place_id and no coords → 404 problem.
        r = client.get("/v1/birth-time/resolve", params={
            "local_date": "1989-04-15", "local_time": "16:40",
        })
        assert r.status_code == 404
        assert "place" in r.json()["type"]

    def test_future_date_rejected(self, client):
        r = client.get("/v1/birth-time/resolve", params={
            "local_date": "2999-01-01", "local_time": "12:00",
            "place_id": "geonames:1520132",
        })
        assert r.status_code == 422
        body = r.json()
        assert body["type"].endswith("validation_error")

    def test_bad_time_format(self, client):
        r = client.get("/v1/birth-time/resolve", params={
            "local_date": "1989-04-15", "local_time": "25:99",
            "place_id": "geonames:1520132",
        })
        assert r.status_code == 422


# --------------------------------------------------------------------------- #
# DST edge propagation through the API
# --------------------------------------------------------------------------- #
class TestDSTViaAPI:
    def test_fold_is_flagged_in_response(self, client):
        # London BST end 1989-10-29 01:30 (occurred twice).
        r = client.get("/v1/birth-time/resolve", params={
            "local_date": "1989-10-29", "local_time": "01:30",
            "lat": 51.51, "lng": -0.13, "iana_zone": "Europe/London",
        })
        assert r.status_code == 200
        amb = r.json()["resolution"]["ambiguity"]
        assert amb == "dst_fold"
