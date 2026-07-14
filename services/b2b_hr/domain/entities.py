"""B2B HR domain: consent, seats, team analysis, compliance (GDPR Art.9).

Pure domain — no DB, no I/O. Defines the consent-state machine (SM-06), the
seat/role model, and the advisory analysis entities.

PRIVACY INVARIANT (GDPR Art.9, B2B-3, release-blocker):
  - HR NEVER sees raw birth data (date/time/coords). The employee enters it
    themselves; only the Day Master ELEMENT + TenGod summary is computed and
    exposed. Tests assert no birth_data leaks into any HR-facing output.
  - Decline is "without consequence" — a declined seat appears only as an
    anonymous aggregate count to HR ("N without analysis").

The BaZi compatibility math (B2B-4) reuses the Five Elements cycles and the
TenGod taxonomy from bazi_engine, but lives HERE as a pure function so the
B2B bounded context stays independent (it must not import bazi_engine domain
directly — that would couple an EU-isolated service to the B2C codebase).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class ConsentState(str, Enum):
    """SM-06 consent states. PENDING → CONSENTED | DECLINED."""
    PENDING = "pending"
    CONSENTED = "consented"
    DECLINED = "declined"


class Role(str, Enum):
    """B2B-2 roles (aligned with the backlog: HR Admin/Manager/Employee/Council)."""
    HR_ADMIN = "hr_admin"
    HR_MANAGER = "hr_manager"
    EMPLOYEE = "employee"
    WORKS_COUNCIL = "works_council"


# Five Elements (local copy — B2B is EU-isolated, must not import bazi_engine).
class Element(str, Enum):
    WOOD = "wood"
    FIRE = "fire"
    EARTH = "earth"
    METAL = "metal"
    WATER = "water"


@dataclass(frozen=True)
class BaZiSummary:
    """The ONLY BaZi data that crosses into HR-facing output. Privacy-safe:
    Day Master element + polarity only — NEVER birth date/time/coords."""
    day_master_element: Element
    day_master_polarity: str          # "yang" | "yin"
    dominant_ten_god: Optional[str] = None   # e.g. "direct_officer"


@dataclass
class Seat:
    """An employee's membership in an org (maps to Prisma B2BSeat)."""
    seat_id: str
    org_id: str
    member_id: str
    role: Role = Role.EMPLOYEE
    consent_state: ConsentState = ConsentState.PENDING
    consent_at: Optional[str] = None
    bazi_summary: Optional[BaZiSummary] = None   # set only after consent + analysis
    job_title: Optional[str] = None

    @property
    def analyzable(self) -> bool:
        """A seat is analyzable only after explicit GDPR Art.9 consent."""
        return self.consent_state is ConsentState.CONSENTED


@dataclass(frozen=True)
class RoleSuitability:
    """Advisory role-suitability for one employee (B2B-4). ALWAYS advisory."""
    seat_id: str
    fit_scores: dict[str, int]        # {"leadership": 78, "execution": 65, ...}
    primary_strength: str
    advisory_note: str                # includes "advisory, not deterministic"


@dataclass(frozen=True)
class TeamCompatibilityEdge:
    """One pairwise compatibility score between two consenting employees."""
    seat_a: str
    seat_b: str
    score: int                        # 0-100
    dynamic: str                      # e.g. "generating cycle — collaborative"


@dataclass(frozen=True)
class TeamAnalysis:
    """Full B2B-4 advisory output for an org's consenting team."""
    org_id: str
    role_suitabilities: tuple[RoleSuitability, ...]
    compatibility_matrix: tuple[TeamCompatibilityEdge, ...]
    declined_count: int               # anonymous aggregate (B2B-3)
    disclaimers: tuple[str, ...]       # AI Act / advisory notices


# --------------------------------------------------------------------------- #
# Compliance disclaimers (B2B-6: AI Act 2024 high-risk, BetrVG §87)
# --------------------------------------------------------------------------- -*-
ADVISORY_DISCLAIMERS: tuple[str, ...] = (
    "This analysis is advisory, not deterministic. Human oversight is required "
    "for any hiring or evaluation decision (AI Act 2024, high-risk).",
    "BaZi-derived insights must never be the sole basis for employment decisions. "
    "The right to explanation applies (GDPR Art.22).",
    "Employees have the right to decline analysis without consequence (GDPR Art.9).",
)

BETRVG_NOTIFICATION_DE = (
    "BetrVG §87 (DE): works council must be notified before introducing "
    "personality-analysis tools. Notification logged in audit trail."
)
