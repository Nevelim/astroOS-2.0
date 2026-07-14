"""Integration tests for the B2B HR FastAPI app via TestClient.

Covers the consent flow (SM-06), the consent-gate (analysis blocked without
consent), advisory disclaimers (B2B-6), audit trail, and the privacy
invariant (HR never sees birth data in any response).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from services.b2b_hr.api.app import create_app, default_dependencies


@pytest.fixture()
def client() -> TestClient:
    return TestClient(create_app(default_dependencies()))


@pytest.fixture()
def org_with_seats(client):
    """Create an org with 3 seats: 2 will consent, 1 will decline."""
    org = client.post("/v1/b2b/orgs", json={"name": "Acme GmbH",
                                            "seats_limit": 50}).json()
    org_id = org["org_id"]
    s1 = client.post(f"/v1/b2b/orgs/{org_id}/seats",
                     json={"member_id": "emp1", "job_title": "Engineer"}).json()
    s2 = client.post(f"/v1/b2b/orgs/{org_id}/seats",
                     json={"member_id": "emp2", "job_title": "Manager"}).json()
    s3 = client.post(f"/v1/b2b/orgs/{org_id}/seats",
                     json={"member_id": "emp3", "job_title": "Designer"}).json()
    return org_id, s1["seat_id"], s2["seat_id"], s3["seat_id"]


class TestHealth:
    def test_healthz_eu_region(self, client):
        body = client.get("/healthz").json()
        assert body["status"] == "alive"
        assert body["region"] == "eu-central-1"

    def test_readyz_gdpr(self, client):
        body = client.get("/readyz").json()
        assert "GDPR" in body["compliance"]


class TestConsentFlow:
    def test_consent_attaches_bazi_summary(self, client, org_with_seats):
        org_id, s1, _, _ = org_with_seats
        r = client.post(f"/v1/b2b/seats/{s1}/consent", json={
            "decision": "consented",
            "bazi_summary": {"day_master_element": "wood",
                             "day_master_polarity": "yang"},
        })
        assert r.status_code == 200
        assert r.json()["consent_state"] == "consented"
        assert r.json()["consent_at"] is not None

    def test_decline_without_bazi(self, client, org_with_seats):
        _, _, _, s3 = org_with_seats
        r = client.post(f"/v1/b2b/seats/{s3}/consent",
                        json={"decision": "declined"})
        assert r.status_code == 200
        assert r.json()["consent_state"] == "declined"

    def test_double_consent_rejected(self, client, org_with_seats):
        _, s1, _, _ = org_with_seats
        client.post(f"/v1/b2b/seats/{s1}/consent", json={
            "decision": "consented",
            "bazi_summary": {"day_master_element": "fire",
                             "day_master_polarity": "yang"}})
        r = client.post(f"/v1/b2b/seats/{s1}/consent", json={
            "decision": "declined"})
        assert r.status_code == 409

    def test_invalid_decision_422(self, client, org_with_seats):
        _, s1, _, _ = org_with_seats
        r = client.post(f"/v1/b2b/seats/{s1}/consent",
                        json={"decision": "maybe"})
        assert r.status_code == 422

    def test_unknown_seat_404(self, client):
        r = client.post("/v1/b2b/seats/ghost/consent",
                        json={"decision": "declined"})
        assert r.status_code == 404


class TestTeamAnalysis:
    def test_analysis_blocked_without_consent(self, client, org_with_seats):
        """No seats have consented yet → empty analysis, all 3 in declined count."""
        org_id = org_with_seats[0]
        r = client.get(f"/v1/b2b/orgs/{org_id}/analysis")
        assert r.status_code == 200
        body = r.json()
        assert body["role_suitabilities"] == []
        assert body["compatibility_matrix"] == []
        assert body["declined_or_pending_count"] == 3

    def test_analysis_after_partial_consent(self, client, org_with_seats):
        org_id, s1, s2, s3 = org_with_seats
        client.post(f"/v1/b2b/seats/{s1}/consent", json={
            "decision": "consented",
            "bazi_summary": {"day_master_element": "wood",
                             "day_master_polarity": "yang"}})
        client.post(f"/v1/b2b/seats/{s2}/consent", json={
            "decision": "consented",
            "bazi_summary": {"day_master_element": "fire",
                             "day_master_polarity": "yin"}})
        client.post(f"/v1/b2b/seats/{s3}/consent",
                    json={"decision": "declined"})
        r = client.get(f"/v1/b2b/orgs/{org_id}/analysis")
        body = r.json()
        assert len(body["role_suitabilities"]) == 2
        assert len(body["compatibility_matrix"]) == 1  # one pair
        # The declined seat is anonymous — only counted.
        assert body["declined_or_pending_count"] == 1

    def test_disclaimers_present(self, client, org_with_seats):
        org_id = org_with_seats[0]
        body = client.get(f"/v1/b2b/orgs/{org_id}/analysis").json()
        assert len(body["disclaimers"]) >= 3
        assert any("advisory" in d.lower() for d in body["disclaimers"])
        assert "betrvg_notification" in body

    def test_fit_scores_valid(self, client, org_with_seats):
        org_id, s1, _, _ = org_with_seats
        client.post(f"/v1/b2b/seats/{s1}/consent", json={
            "decision": "consented",
            "bazi_summary": {"day_master_element": "metal",
                             "day_master_polarity": "yang"}})
        body = client.get(f"/v1/b2b/orgs/{org_id}/analysis").json()
        scores = body["role_suitabilities"][0]["fit_scores"]
        assert all(0 <= v <= 100 for v in scores.values())


class TestAuditTrail:
    def test_consent_logged(self, client, org_with_seats):
        org_id, s1, _, _ = org_with_seats
        client.post(f"/v1/b2b/seats/{s1}/consent", json={
            "decision": "consented",
            "bazi_summary": {"day_master_element": "earth",
                             "day_master_polarity": "yin"}})
        entries = client.get(f"/v1/b2b/orgs/{org_id}/audit").json()["entries"]
        actions = [e["action"] for e in entries]
        assert any("consent.consented" in a for a in actions)

    def test_org_creation_logged(self, client):
        org = client.post("/v1/b2b/orgs", json={"name": "Test"}).json()
        entries = client.get(f"/v1/b2b/orgs/{org['org_id']}/audit").json()["entries"]
        assert any(e["action"] == "b2b.org.created" for e in entries)


class TestPrivacy:
    """CRITICAL: HR-facing output must NEVER contain birth data."""

    def test_no_birth_data_in_analysis(self, client, org_with_seats):
        org_id, s1, s2, _ = org_with_seats
        client.post(f"/v1/b2b/seats/{s1}/consent", json={
            "decision": "consented",
            "bazi_summary": {"day_master_element": "water",
                             "day_master_polarity": "yang"}})
        client.post(f"/v1/b2b/seats/{s2}/consent", json={
            "decision": "consented",
            "bazi_summary": {"day_master_element": "wood",
                             "day_master_polarity": "yin"}})
        text = client.get(f"/v1/b2b/orgs/{org_id}/analysis").text.lower()
        for forbidden in ("birth", "date", "time", "lat", "lng", "coord",
                          "1989", "sha256"):
            assert forbidden not in text, f"privacy leak: '{forbidden}' in analysis"

    def test_no_birth_data_in_consent_response(self, client, org_with_seats):
        _, s1, _, _ = org_with_seats
        r = client.post(f"/v1/b2b/seats/{s1}/consent", json={
            "decision": "consented",
            "bazi_summary": {"day_master_element": "fire",
                             "day_master_polarity": "yang"}})
        # The response echoes only consent_state + consent_at, not the bazi input.
        body = r.json()
        assert "bazi_summary" not in body
        assert "day_master" not in body
