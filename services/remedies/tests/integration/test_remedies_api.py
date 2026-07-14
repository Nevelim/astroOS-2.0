"""Integration tests for the Remedies FastAPI app via TestClient.

Exercises the FULL stack: routing, the catalog mapping (REMED-2), the
marketplace whitelist (REMED-1 rating ≥ 4.0), the 24h cache, ETag
revalidation, and — critically — the REMED-4 ethics invariant (affiliate-
independent sort).

The ethics tests (TestEthicsViaHttp) are release-blockers.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from services.remedies.api.app import create_app, default_dependencies


@pytest.fixture()
def client() -> TestClient:
    return TestClient(create_app(default_dependencies()))


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #
class TestHealth:
    def test_healthz(self, client):
        assert client.get("/healthz").json()["status"] == "alive"

    def test_readyz_reports_whitelist(self, client):
        body = client.get("/readyz").json()
        assert body["status"] == "ready"
        assert body["whitelist_min_rating"] == 4.0
        assert body["cache_ttl_h"] == 24


# --------------------------------------------------------------------------- #
# Recommendations
# --------------------------------------------------------------------------- #
class TestRecommendations:
    def test_wood_day_master_returns_items(self, client):
        r = client.get("/v1/remedies/recommendations", params={"day_master": "wood"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 2  # at least one remedy per favorable element
        # Each item has the required fields
        for item in items:
            assert {"element", "type", "name", "reasoning", "marketplace_results"} \
                <= set(item.keys())

    def test_items_reference_favorable_elements(self, client):
        """Day Master wood → favorable water (mother) + earth (wealth)."""
        r = client.get("/v1/remedies/recommendations", params={"day_master": "wood"})
        elements = {i["element"] for i in r.json()["items"]}
        assert "water" in elements
        assert "earth" in elements

    def test_invalid_day_master_422(self, client):
        r = client.get("/v1/remedies/recommendations",
                       params={"day_master": "cheese"})
        assert r.status_code == 422
        assert "invalid" in r.json()["type"]

    def test_missing_day_master_422(self, client):
        r = client.get("/v1/remedies/recommendations")
        assert r.status_code == 422

    def test_explicit_favorable_override(self, client):
        r = client.get("/v1/remedies/recommendations",
                       params={"day_master": "wood", "favorable": "metal,fire"})
        elements = {i["element"] for i in r.json()["items"]}
        assert "metal" in elements
        assert "fire" in elements

    def test_invalid_favorable_422(self, client):
        r = client.get("/v1/remedies/recommendations",
                       params={"day_master": "wood", "favorable": "metal,bogus"})
        assert r.status_code == 422


# --------------------------------------------------------------------------- #
# Whitelist (REMED-1)
# --------------------------------------------------------------------------- #
class TestWhitelist:
    def test_below_threshold_listings_excluded(self, client):
        """The Aquamarine stub has a 3.6-rated listing that must be dropped."""
        r = client.get("/v1/remedies/recommendations",
                       params={"day_master": "wood"})  # water is favorable
        aquamarine = [i for i in r.json()["items"] if i["name"] == "Aquamarine"]
        if aquamarine:
            for l in aquamarine[0]["marketplace_results"]:
                assert l["rating"] >= 4.0

    def test_all_returned_listings_meet_whitelist(self, client):
        r = client.get("/v1/remedies/recommendations",
                       params={"day_master": "fire"})
        for item in r.json()["items"]:
            for l in item["marketplace_results"]:
                assert l["rating"] >= 4.0


# --------------------------------------------------------------------------- #
# Ethics — REMED-4 (release-blocker)
# --------------------------------------------------------------------------- #
class TestEthicsViaHttp:
    def test_listings_sorted_by_rating_descending(self, client):
        r = client.get("/v1/remedies/recommendations",
                       params={"day_master": "wood"})
        for item in r.json()["items"]:
            ratings = [l["rating"] for l in item["marketplace_results"]]
            assert ratings == sorted(ratings, reverse=True)

    def test_affiliate_does_not_outrank_higher_rated(self, client):
        """The Aquamarine stub: affiliate 4.8 vs non-affiliate 4.9.
        The non-affiliate (4.9) MUST rank first despite being non-affiliate."""
        r = client.get("/v1/remedies/recommendations",
                       params={"day_master": "wood"})
        aquamarine = [i for i in r.json()["items"] if i["name"] == "Aquamarine"]
        if aquamarine and len(aquamarine[0]["marketplace_results"]) >= 2:
            listings = aquamarine[0]["marketplace_results"]
            assert listings[0]["rating"] >= listings[1]["rating"]
            # The top one is the 4.9 non-affiliate
            assert listings[0]["rating"] == 4.9
            assert listings[0]["affiliate"] is False


# --------------------------------------------------------------------------- #
# Caching / ETag
# --------------------------------------------------------------------------- #
class TestCaching:
    def test_etag_present_and_immutable(self, client):
        r = client.get("/v1/remedies/recommendations",
                       params={"day_master": "wood"})
        assert r.status_code == 200
        assert r.headers.get("ETag") is not None
        assert "immutable" in r.headers["Cache-Control"]
        assert "max-age=86400" in r.headers["Cache-Control"]

    def test_if_none_match_returns_304(self, client):
        r1 = client.get("/v1/remedies/recommendations",
                        params={"day_master": "wood"})
        etag = r1.headers["ETag"]
        r2 = client.get("/v1/remedies/recommendations",
                        params={"day_master": "wood"},
                        headers={"if-none-match": etag})
        assert r2.status_code == 304

    def test_same_day_master_same_etag(self, client):
        e1 = client.get("/v1/remedies/recommendations",
                        params={"day_master": "fire"}).headers["ETag"]
        e2 = client.get("/v1/remedies/recommendations",
                        params={"day_master": "fire"}).headers["ETag"]
        assert e1 == e2

    def test_different_day_master_different_etag(self, client):
        e1 = client.get("/v1/remedies/recommendations",
                        params={"day_master": "wood"}).headers["ETag"]
        e2 = client.get("/v1/remedies/recommendations",
                        params={"day_master": "fire"}).headers["ETag"]
        assert e1 != e2


# --------------------------------------------------------------------------- #
# Privacy
# --------------------------------------------------------------------------- #
class TestPrivacy:
    def test_no_birth_data_in_response(self, client):
        r = client.get("/v1/remedies/recommendations",
                       params={"day_master": "wood"})
        text = r.text.lower()
        for forbidden in ("birth", "date", "hash", "lat", "lng", "1989"):
            assert forbidden not in text
