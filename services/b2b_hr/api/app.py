"""HTTP API for B2B HR Service (порт 3006) — EU-isolated, GDPR Art.9.

Endpoints:
  POST /v1/b2b/orgs                       — create an org (DPA required later)
  POST /v1/b2b/orgs/{org}/seats           — add a seat (employee)
  POST /v1/b2b/seats/{id}/consent         — employee records SM-06 consent
  GET  /v1/b2b/orgs/{org}/analysis        — advisory team analysis (B2B-4)
  GET  /v1/b2b/orgs/{org}/audit           — audit trail (B2B-6)
  GET  /healthz | /readyz                 — liveness/readiness

Errors: RFC 7807 problem+json.

Privacy invariants (GDPR Art.9, enforced + tested):
  - The consent endpoint accepts a BaZiSummary (Day Master element ONLY) —
    never raw birth data. The employee computes it themselves upstream.
  - The analysis output contains only seat_id + fit scores + element-derived
    dynamics. HR never sees birth date/time/coords.
  - Declined/pending seats appear ONLY as an anonymous count.

Compliance (B2B-6): every analysis response carries AI-Act advisory
disclaimers. Every consent decision is audit-logged.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.common.observability import setup_telemetry, instrument_app
from services.b2b_hr.adapter.store import InMemoryAuditLogger, InMemoryOrgStore
from services.b2b_hr.domain.entities import (
    BETRVG_NOTIFICATION_DE,
    BaZiSummary,
    ConsentState,
    Element,
    Role,
    Seat,
)
from services.b2b_hr.usecase.analyze_team import (
    AnalyzeTeam,
    ConsentAlreadySet,
    RecordConsent,
    SeatNotFound,
)


# --------------------------------------------------------------------------- #
# DTOs
# --------------------------------------------------------------------------- #
class CreateOrgDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    seats_limit: int = Field(10, ge=1, le=10000)


class AddSeatDTO(BaseModel):
    member_id: str
    role: str = Field("employee", examples=["employee", "hr_manager", "hr_admin"])
    job_title: Optional[str] = None


class BaZiSummaryDTO(BaseModel):
    """Privacy-safe: Day Master element ONLY — never birth data."""
    day_master_element: str = Field(..., examples=["wood"])
    day_master_polarity: str = Field(..., examples=["yang"])
    dominant_ten_god: Optional[str] = None


class ConsentDTO(BaseModel):
    decision: str = Field(..., examples=["consented", "declined"])
    bazi_summary: Optional[BaZiSummaryDTO] = None


_VALID_ELEMENTS = {e.value for e in Element}
_VALID_DECISIONS = {ConsentState.CONSENTED.value, ConsentState.DECLINED.value}


@dataclass
class Dependencies:
    store: InMemoryOrgStore
    audit: InMemoryAuditLogger
    consent_uc: RecordConsent
    analyze_uc: AnalyzeTeam


def default_dependencies() -> Dependencies:
    store = InMemoryOrgStore()
    audit = InMemoryAuditLogger()
    return Dependencies(
        store=store, audit=audit,
        consent_uc=RecordConsent(store=store, audit=audit),
        analyze_uc=AnalyzeTeam(store=store),
    )


def _problem(status: int, slug: str, title: str, detail: str,
             instance: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"type": f"https://errors.astroos.com/{slug}", "title": title,
                 "status": status, "detail": detail, "instance": instance},
        media_type="application/problem+json",
    )


def create_app(deps: Optional[Dependencies] = None) -> FastAPI:
    setup_telemetry("astroos-b2b-hr")
    deps = deps or default_dependencies()
    app = FastAPI(title="AstroOS B2B HR", version="1.0.0",
                  docs_url="/docs", redoc_url=None)
    app.state.deps = deps

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        return {"status": "alive", "region": "eu-central-1"}

    @app.get("/readyz", tags=["meta"])
    def readyz() -> dict:
        return {"status": "ready", "region": "eu-central-1",
                "compliance": "GDPR Art.9 consent-first; AI Act high-risk"}

    # ---- org management ------------------------------------------------- #
    @app.post("/v1/b2b/orgs", tags=["b2b"], status_code=201)
    def create_org(payload: CreateOrgDTO) -> JSONResponse:
        import uuid
        org_id = f"org_{uuid.uuid4().hex[:12]}"
        deps.store.create_org(org_id, payload.name, payload.seats_limit)
        deps.audit.log(org_id, action="b2b.org.created")
        return JSONResponse(status_code=201, content={
            "org_id": org_id, "name": payload.name,
            "seats_limit": payload.seats_limit, "dpa_signed": False,
            "message": "Org created. DPA signing required before processing "
                       "employee data. GDPR Art.9 explicit consent needed per seat.",
        })

    @app.post("/v1/b2b/orgs/{org_id}/seats", tags=["b2b"], status_code=201)
    def add_seat(org_id: str, payload: AddSeatDTO, request: Request
                 ) -> JSONResponse:
        if not deps.store.org_exists(org_id):
            return _problem(404, "b2b/org-not-found", "Org not found",
                            f"Org '{org_id}' does not exist.", request.url.path)
        import uuid
        seat = Seat(
            seat_id=f"seat_{uuid.uuid4().hex[:12]}",
            org_id=org_id, member_id=payload.member_id,
            role=Role(payload.role) if payload.role in {r.value for r in Role}
                  else Role.EMPLOYEE,
            job_title=payload.job_title,
        )
        deps.store.add_seat(seat)
        deps.audit.log(org_id, seat_id=seat.seat_id, action="b2b.seat.added")
        return JSONResponse(status_code=201, content={
            "seat_id": seat.seat_id, "org_id": org_id,
            "consent_state": seat.consent_state.value,
        })

    # ---- consent flow (SM-06) ------------------------------------------- #
    @app.post("/v1/b2b/seats/{seat_id}/consent", tags=["b2b"])
    def record_consent(seat_id: str, payload: ConsentDTO,
                       request: Request) -> JSONResponse:
        if payload.decision not in _VALID_DECISIONS:
            return _problem(422, "b2b/invalid-consent", "Invalid consent decision",
                            f"'{payload.decision}' not valid. "
                            f"Valid: {sorted(_VALID_DECISIONS)}", request.url.path)
        bazi = None
        if payload.bazi_summary:
            if payload.bazi_summary.day_master_element not in _VALID_ELEMENTS:
                return _problem(422, "b2b/invalid-element", "Invalid element",
                                f"unknown element", request.url.path)
            bazi = BaZiSummary(
                day_master_element=Element(payload.bazi_summary.day_master_element),
                day_master_polarity=payload.bazi_summary.day_master_polarity,
                dominant_ten_god=payload.bazi_summary.dominant_ten_god,
            )
        try:
            seat = deps.consent_uc.execute(
                seat_id, ConsentState(payload.decision), bazi)
        except SeatNotFound:
            return _problem(404, "b2b/seat-not-found", "Seat not found",
                            f"Seat '{seat_id}' not found.", request.url.path)
        except ConsentAlreadySet as exc:
            return _problem(409, "b2b/consent-already-set",
                            "Consent already recorded", str(exc),
                            request.url.path)
        return JSONResponse(status_code=200, content={
            "seat_id": seat.seat_id,
            "consent_state": seat.consent_state.value,
            "consent_at": seat.consent_at,
        })

    # ---- team analysis (B2B-4) ------------------------------------------ #
    @app.get("/v1/b2b/orgs/{org_id}/analysis", tags=["b2b"])
    def team_analysis(org_id: str, request: Request) -> JSONResponse:
        if not deps.store.org_exists(org_id):
            return _problem(404, "b2b/org-not-found", "Org not found",
                            f"Org '{org_id}' does not exist.", request.url.path)
        result = deps.analyze_uc.execute(org_id)
        return JSONResponse(status_code=200, content={
            "org_id": result.org_id,
            "role_suitabilities": [
                {"seat_id": r.seat_id, "fit_scores": r.fit_scores,
                 "primary_strength": r.primary_strength,
                 "advisory_note": r.advisory_note}
                for r in result.role_suitabilities
            ],
            "compatibility_matrix": [
                {"seat_a": e.seat_a, "seat_b": e.seat_b,
                 "score": e.score, "dynamic": e.dynamic}
                for e in result.compatibility_matrix
            ],
            "declined_or_pending_count": result.declined_count,
            "disclaimers": list(result.disclaimers),
            "betrvg_notification": BETRVG_NOTIFICATION_DE,
        })

    # ---- audit trail (B2B-6) -------------------------------------------- #
    @app.get("/v1/b2b/orgs/{org_id}/audit", tags=["b2b"])
    def audit_trail(org_id: str) -> JSONResponse:
        return JSONResponse(status_code=200, content={
            "org_id": org_id,
            "entries": deps.audit.for_org(org_id),
        })

    instrument_app(app)
    return app


app = create_app()
