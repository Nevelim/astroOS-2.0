"""B2B HR use cases: consent management + team analysis orchestration.

Clean Architecture: depends ONLY on the domain layer (entities, team_analysis)
and Protocol ports declared here (OrgStore, AuditLogger). The adapter layer
implements them.

Two use cases:
  - RecordConsent: transitions a seat's SM-06 state (PENDING → CONSENTED |
    DECLINED). When consenting, the employee's BaZi summary is attached. This
    is the ONLY place birth_data-derived data enters the system, and it enters
    ONLY as the privacy-safe BaZiSummary (Day Master element). Audit-logged.
  - AnalyzeTeam: produces the B2B-4 advisory TeamAnalysis. CONSENT GATE: only
    CONSENTED seats with a BaZi summary are analyzed; PENDING/DECLINED seats
    appear ONLY as an anonymous count (B2B-3 "N без анализа"). The output
    carries AI-Act advisory disclaimers (B2B-6).

Privacy invariants (enforced + tested):
  - The BaZi summary input is Day Master element only — the use case never
    receives or stores raw birth data.
  - HR-facing output (TeamAnalysis) contains only seat_id + fit scores + the
    element-derived dynamic — never birth data.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Protocol

from services.b2b_hr.domain.entities import (
    ADVISORY_DISCLAIMERS,
    BaZiSummary,
    ConsentState,
    RoleSuitability,
    Seat,
    TeamAnalysis,
)
from services.b2b_hr.domain.team_analysis import (
    build_matrix,
    role_suitability,
)


# --------------------------------------------------------------------------- #
# Ports
# --------------------------------------------------------------------------- #
class OrgStore(Protocol):
    """Port: org + seat persistence (maps to Prisma B2BOrg/B2BSeat in prod)."""

    def get_seat(self, seat_id: str) -> Optional[Seat]: ...
    def seats_for_org(self, org_id: str) -> list[Seat]: ...
    def update_seat(self, seat: Seat) -> None: ...


class AuditLogger(Protocol):
    """Port: append-only audit trail (B2B-6 compliance, GDPR Art.9 evidence)."""

    def log(self, org_id: str, action: str, seat_id: str = "",
            detail: str = "") -> None: ...


# --------------------------------------------------------------------------- #
# Errors
# --------------------------------------------------------------------------- #
class SeatNotFound(Exception):
    def __init__(self, seat_id: str) -> None:
        super().__init__(f"seat '{seat_id}' not found")


class ConsentAlreadySet(Exception):
    def __init__(self, seat_id: str, state: ConsentState) -> None:
        super().__init__(f"seat '{seat_id}' consent already {state.value}")


# --------------------------------------------------------------------------- #
# Use case: RecordConsent (SM-06)
# --------------------------------------------------------------------------- #
@dataclass
class RecordConsent:
    store: OrgStore
    audit: AuditLogger

    def execute(self, seat_id: str, decision: ConsentState,
                bazi_summary: Optional[BaZiSummary] = None) -> Seat:
        seat = self.store.get_seat(seat_id)
        if seat is None:
            raise SeatNotFound(seat_id)
        if seat.consent_state is not ConsentState.PENDING:
            raise ConsentAlreadySet(seat_id, seat.consent_state)

        seat.consent_state = decision
        seat.consent_at = datetime.now(timezone.utc).isoformat()
        if decision is ConsentState.CONSENTED:
            seat.bazi_summary = bazi_summary
        self.store.update_seat(seat)

        # Audit trail (B2B-6): log the consent decision. The detail records
        # the decision but NEVER the birth data (bazi_summary is element-only).
        self.audit.log(
            org_id=seat.org_id, seat_id=seat_id,
            action=f"consent.{decision.value}",
            detail="BaZi summary attached" if bazi_summary else "no data attached")
        return seat


# --------------------------------------------------------------------------- #
# Use case: AnalyzeTeam (B2B-4)
# --------------------------------------------------------------------------- #
@dataclass
class AnalyzeTeam:
    store: OrgStore

    def execute(self, org_id: str) -> TeamAnalysis:
        seats = self.store.seats_for_org(org_id)

        # CONSENT GATE: only consenting seats with a BaZi summary are analyzed.
        analyzable = [s for s in seats
                      if s.analyzable and s.bazi_summary is not None]
        # Declined/pending seats appear ONLY as an anonymous count (B2B-3).
        declined_count = sum(
            1 for s in seats if not s.analyzable)

        suitabilities = tuple(
            role_suitability(s.seat_id, s.bazi_summary) for s in analyzable
        )
        matrix = tuple(build_matrix(seats))

        return TeamAnalysis(
            org_id=org_id,
            role_suitabilities=suitabilities,
            compatibility_matrix=matrix,
            declined_count=declined_count,
            disclaimers=ADVISORY_DISCLAIMERS,
        )
