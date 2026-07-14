"""Integration tests for the Cosmic Match FastAPI app via TestClient.

Exercises the FULL stack: routing, pydantic validation, real adapters
(InMemoryProfileRegistry + InMemoryMatchCache), the pure domain math,
RFC 7807 problem+json errors, and the privacy invariants.

The privacy tests (TestPrivacyInvariants) are the most critical in the
system — they assert birth data NEVER appears in any response. Per ADR SM-05,
a privacy leak here is a release-blocker.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from services.cosmic_match.api.app import create_app, default_dependencies


# Two privacy-safe profiles (natal + bazi summaries only — NO birth data).
_PROFILE_A = {
    "profile_id": "prf_anya",
    "display_name": "Аня",
    "age": 28,
    "approx_distance_km": 120,
    "natal": {"sun_sign": "leo", "moon_sign": "pisces",
              "venus_sign": "cancer", "mars_sign": "gemini"},
    "bazi": {"day_master_stem": "yi", "day_master_element": "wood",
             "year_branch": "si", "month_branch": "chen", "day_branch": "si"},
    "intents": ["romantic"],
}

_PROFILE_B = {
    "profile_id": "prf_jonas",
    "display_name": "Jonas",
    "age": 31,
    "approx_distance_km": 80,
    "natal": {"sun_sign": "aquarius", "moon_sign": "libra",
              "venus_sign": "sagittarius", "mars_sign": "aries"},
    "bazi": {"day_master_stem": "bing", "day_master_element": "fire",
             "year_branch": "wu", "month_branch": "wu", "day_branch": "wu"},
    "intents": ["romantic", "friendship"],
}


@pytest.fixture()
def client() -> TestClient:
    app = create_app(default_dependencies())
    return TestClient(app)


@pytest.fixture()
def client_with_pool(client: TestClient) -> TestClient:
    client.post("/v1/match/profiles", json=_PROFILE_A)
    client.post("/v1/match/profiles", json=_PROFILE_B)
    return client


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #
class TestHealth:
    def test_healthz(self, client):
        r = client.get("/healthz")
        assert r.status_code == 200
        assert r.json()["status"] == "alive"

    def test_readyz_reports_pool_size(self, client):
        r = client.get("/readyz")
        assert r.status_code == 200
        assert r.json()["status"] == "ready"
        assert r.json()["pool_size"] == 0


# --------------------------------------------------------------------------- #
# Profile registration + opt-out
# --------------------------------------------------------------------------- #
class TestProfilePool:
    def test_register_profile(self, client):
        r = client.post("/v1/match/profiles", json=_PROFILE_A)
        assert r.status_code == 201
        body = r.json()
        assert body["profile_id"] == "prf_anya"
        assert body["in_pool"] is True
        assert body["pool_size"] == 1

    def test_register_increments_pool(self, client_with_pool):
        assert client_with_pool.get("/readyz").json()["pool_size"] == 2

    def test_opt_out_removes_from_pool(self, client_with_pool):
        r = client_with_pool.delete("/v1/match/profiles/prf_anya")
        assert r.status_code == 200
        body = r.json()
        assert body["removed"] is True
        assert body["in_pool"] is False
        assert body["pool_size"] == 1

    def test_opt_out_unknown_returns_404(self, client):
        r = client.delete("/v1/match/profiles/prf_ghost")
        assert r.status_code == 404
        assert r.headers["content-type"].startswith("application/problem+json")
        assert "not-found" in r.json()["type"]

    def test_invalid_intent_rejected(self, client):
        bad = {**_PROFILE_A, "intents": ["romantic", "bogus"]}
        r = client.post("/v1/match/profiles", json=bad)
        assert r.status_code == 422


# --------------------------------------------------------------------------- #
# Compatibility computation
# --------------------------------------------------------------------------- #
class TestCompute:
    def test_compute_happy_path(self, client_with_pool):
        r = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_jonas",
            "intent": "romantic",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["profile_a"] == "prf_anya"
        assert body["profile_b"] == "prf_jonas"
        assert 0 <= body["composite_score"] <= 100
        assert "western" in body["layers_used"]
        assert "bazi" in body["layers_used"]
        for sphere in ("love", "communication", "values", "lifestyle", "growth"):
            assert 0 <= body["spheres"][sphere] <= 100

    def test_compute_returns_etag_and_immutable(self, client_with_pool):
        r = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_jonas",
        })
        assert r.status_code == 200
        assert r.headers.get("ETag") is not None
        assert "immutable" in r.headers.get("Cache-Control", "")
        assert "max-age=31536000" in r.headers.get("Cache-Control", "")

    def test_compute_symmetric_pair_same_etag(self, client_with_pool):
        """Compat is symmetric: swapping a/b yields the same ETag."""
        r1 = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_jonas"})
        r2 = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_jonas", "profile_b_id": "prf_anya"})
        assert r1.headers["ETag"] == r2.headers["ETag"]
        assert r1.json()["composite_score"] == r2.json()["composite_score"]

    def test_compute_cached_second_call(self, client_with_pool):
        """Second compute hits the in-memory cache (same score)."""
        r1 = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_jonas"})
        r2 = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_jonas"})
        assert r2.status_code == 200
        assert r1.json() == r2.json()

    def test_if_none_match_returns_304(self, client_with_pool):
        r1 = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_jonas"})
        etag = r1.headers["ETag"]
        r2 = client_with_pool.post("/v1/match/compute",
            json={"profile_a_id": "prf_anya", "profile_b_id": "prf_jonas"},
            headers={"if-none-match": etag})
        assert r2.status_code == 304

    def test_compute_missing_profile_404(self, client_with_pool):
        r = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_ghost",
        })
        assert r.status_code == 404
        body = r.json()
        assert body["type"].endswith("profile/not-found")
        assert "prf_ghost" in body["detail"]

    def test_compute_self_match_422(self, client_with_pool):
        r = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_anya",
        })
        assert r.status_code == 422
        assert "self" in r.json()["detail"].lower()

    def test_compute_invalid_intent_422(self, client_with_pool):
        r = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_jonas",
            "intent": "bogus",
        })
        assert r.status_code == 422


# --------------------------------------------------------------------------- #
# Privacy invariants — CRITICAL (release-blocker on failure)
# --------------------------------------------------------------------------- #
class TestPrivacyInvariants:
    """birth_data must NEVER appear in any match API response."""

    def test_no_birth_data_in_compute_response(self, client_with_pool):
        r = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_jonas",
        })
        text = r.text.lower()
        for forbidden in ("birth", "date", "hash", "lat", "lng", "coord",
                          "1989", "sha256"):
            assert forbidden not in text, \
                f"privacy leak: '{forbidden}' in compute response"

    def test_no_lat_lng_only_approx_distance(self, client_with_pool):
        """Distance must be approximate (km), never precise coordinates."""
        r = client_with_pool.post("/v1/match/compute", json={
            "profile_a_id": "prf_anya", "profile_b_id": "prf_jonas",
        })
        body = r.json()
        assert "approx_distance_km" not in body  # not even echoed
        assert "latitude" not in body
        assert "longitude" not in body

    def test_register_response_carries_no_natal_detail(self, client):
        """Registration echoes only id/name — never the natal/bazi payload."""
        r = client.post("/v1/match/profiles", json=_PROFILE_A)
        body = r.json()
        assert set(body.keys()) == {"profile_id", "display_name",
                                    "in_pool", "pool_size"}
