"""B2B HR advisory functions: candidate, burnout, firing (B2B-4 / B2B-6).

Three PURE advisory functions over :class:`BaZiSummary` (Day Master element +
polarity only — never birth data). They reuse the element→role-dimension
archetype from :mod:`team_analysis` but stay inside the B2B bounded context:
the B2B service must NOT import :mod:`bazi_engine` (it is EU-isolated). Clash
state therefore arrives as a plain ``bool`` from the caller, who computes it
via ``bazi_engine.domain.clashes.is_high_risk_period`` outside this module.

GDPR / AI Act invariants enforced here:
  - Candidate analysis is advisory, never a deterministic hiring verdict.
  - Burnout assessment recommends workload adjustments, never sanctions.
  - Firing advisory NEVER recommends dismissal solely on BaZi. Performance is
    the primary driver; BaZi clash is only a contextual flag, and the
    disclaimer binds the decision to HR/legal under GDPR Art.22 + local labor
    law.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from services.b2b_hr.domain.entities import BaZiSummary, Element
from services.b2b_hr.domain.team_analysis import _ELEMENT_FIT


# --------------------------------------------------------------------------- #
# Role → critical dimensions (advisory). A role is only as strong a fit as its
# weakest critical requirement (bottleneck scoring), so element_fit is the
# minimum score across the role's dimensions — not the mean. This makes a
# single glaring gap (e.g. a volatility-prone Fire in precision finance)
# disqualifying rather than averaged away.
# --------------------------------------------------------------------------- #
_ROLE_DIMENSIONS: dict[str, tuple[str, ...]] = {
    "operations":  ("stability", "execution"),
    "finance":     ("stability", "execution"),
    "sales":       ("collaboration", "leadership"),
    "leadership":  ("leadership", "stability"),
    "creative":    ("creativity", "leadership"),
    "collaboration": ("collaboration", "creativity"),
}

_VERDICT_RECOMMENDED = "recommended"
_VERDICT_RESERVATIONS = "recommended_with_reservations"
_VERDICT_NOT_RECOMMENDED = "not_recommended"


# --------------------------------------------------------------------------- #
# Element archetype narratives (advisory strengths/risks per archetype).
# --------------------------------------------------------------------------- #
_ARCHETYPE_STRENGTHS: dict[Element, tuple[str, ...]] = {
    Element.WOOD: (
        "Growth-oriented planner; thrives when building new initiatives.",
        "Creative problem solver with strong expansion drive.",
        "Resilient in early-stage or ambiguous environments.",
    ),
    Element.FIRE: (
        "Highly visible, persuasive communicator; natural motivator.",
        "Brings energy and urgency to stagnant teams.",
        "Strong at inspiring leadership and external representation.",
    ),
    Element.EARTH: (
        "Reliable team foundation; dependable under pressure.",
        "Grounded collaborator who stabilises group dynamics.",
        "Trustworthy with structured, process-heavy responsibilities.",
    ),
    Element.METAL: (
        "Disciplined executor with precision and rigor.",
        "Holds high standards; excels at quality and compliance work.",
        "Decisive where rules and structure must be enforced.",
    ),
    Element.WATER: (
        "Adaptive, strategic thinker; reads situations quickly.",
        "Skilled mediator who lubricates collaboration.",
        "Strong at research, insight and fluid problem domains.",
    ),
}

_ARCHETYPE_RISKS: dict[Element, tuple[str, ...]] = {
    Element.WOOD: (
        "May over-commit to expansion at the expense of follow-through.",
        "Can resist structure or repetitive operational work.",
    ),
    Element.FIRE: (
        "Prone to volatility and impatience under sustained load.",
        "May prioritise visibility over steady execution.",
        "Risk of burnout in high-stress, low-recognition periods.",
    ),
    Element.EARTH: (
        "Can resist rapid change or disruptive innovation.",
        "May carry others' burdens, risking quiet overload.",
    ),
    Element.METAL: (
        "May become rigid or overly critical under pressure.",
        "Can struggle in ambiguous, fast-changing contexts.",
    ),
    Element.WATER: (
        "May disperse energy across too many initiatives.",
        "Can avoid confrontation, delaying hard decisions.",
    ),
}

# Primary dimension used to name a "recommended_role" fallback per archetype.
_ARCHETYPE_ROLE: dict[Element, str] = {
    Element.WOOD: "creative",
    Element.FIRE: "leadership",
    Element.EARTH: "operations",
    Element.METAL: "finance",
    Element.WATER: "sales",
}


@dataclass(frozen=True)
class CandidateReport:
    """Advisory candidate analysis (B2B-4). Always advisory — never a hiring
    verdict."""
    element_fit: int                       # 0-100
    verdict: str                           # "recommended" | "recommended_with_reservations" | "not_recommended"
    strengths: list[str] = field(default_factory=list)
    risks: list[str] = field(default_factory=list)
    recommended_role: str = ""


def candidate_analysis(bazi: BaZiSummary, target_role: str) -> CandidateReport:
    """Score a candidate's element fit for ``target_role`` (advisory).

    The fit is the minimum (bottleneck) score across the role's critical
    dimensions, drawn from the shared ``_ELEMENT_FIT`` archetype so this stays
    consistent with :func:`team_analysis.role_suitability`.
    """
    element = bazi.day_master_element
    dims = _ELEMENT_FIT.get(element, _ELEMENT_FIT[Element.EARTH])
    role_dims = _ROLE_DIMENSIONS.get(target_role, ("leadership", "execution"))
    element_fit = int(min(dims[d] for d in role_dims))

    if element_fit >= 75:
        verdict = _VERDICT_RECOMMENDED
    elif element_fit >= 50:
        verdict = _VERDICT_RESERVATIONS
    else:
        verdict = _VERDICT_NOT_RECOMMENDED

    strengths = list(_ARCHETYPE_STRENGTHS.get(element, ()))
    risks = list(_ARCHETYPE_RISKS.get(element, ()))
    recommended_role = _ARCHETYPE_ROLE.get(element, target_role)

    return CandidateReport(
        element_fit=element_fit,
        verdict=verdict,
        strengths=strengths,
        risks=risks,
        recommended_role=recommended_role,
    )


# --------------------------------------------------------------------------- #
# Burnout risk
# --------------------------------------------------------------------------- #
# High-severity Luck Pillar clash signals a personal stress period (B2B-4).
_CLASH_RISK_BONUS = 40
# Fire and Water run hot/cold — more stress-prone archetypes.
_STRESS_ELEMENTS = {Element.FIRE, Element.WATER}
_STRESS_PENALTY = 15
# Earth is the grounding archetype — most resilient under load.
_RESILIENT_ELEMENTS = {Element.EARTH}
_RESILIENT_CREDIT = 10
# Compound risk: a stress-prone archetype (internal volatility) hit by an
# external clash period suffers more than the linear sum. Keeps the documented
# +40/+15 modifiers intact while reflecting that Fire/Water in a clash year are
# the archetype most likely to cross into a high-risk state.
_STRESS_IN_CLASH_COMPOUND = 5


@dataclass(frozen=True)
class BurnoutAssessment:
    """Advisory burnout assessment. Recommends workload adjustments only."""
    level: str                  # "low" | "moderate" | "high"
    factors: list[str] = field(default_factory=list)
    recommendation: str = ""


def burnout_risk(bazi: BaZiSummary, in_high_clash_period: bool) -> BurnoutAssessment:
    """Assess advisory burnout risk from element archetype + clash period.

    The ``in_high_clash_period`` flag is computed by the caller (outside the
    EU-isolated B2B context) via ``bazi_engine.domain.clashes.is_high_risk_period``.
    """
    factors: list[str] = []
    risk = 0

    if in_high_clash_period:
        risk += _CLASH_RISK_BONUS
        factors.append("High-severity Luck Pillar clash — personal stress period.")

    element = bazi.day_master_element
    if element in _STRESS_ELEMENTS:
        risk += _STRESS_PENALTY
        if in_high_clash_period:
            risk += _STRESS_IN_CLASH_COMPOUND
        factors.append(
            f"{element.value.capitalize()} Day Master archetype is stress-prone "
            "(intense, fast-cycling energy)."
        )
    elif element in _RESILIENT_ELEMENTS:
        risk -= _RESILIENT_CREDIT
        factors.append(
            f"{element.value.capitalize()} Day Master archetype is resilient "
            "(grounding, steady energy)."
        )

    if risk >= 60:
        level = "high"
        recommendation = (
            "Reduce workload immediately, redistribute high-pressure tasks, and "
            "consider leave or a lighter rotation during the clash period."
        )
    elif risk >= 30:
        level = "moderate"
        recommendation = (
            "Monitor workload, prioritise recovery, and consider proactive leave "
            "or adjusted responsibilities."
        )
    else:
        level = "low"
        recommendation = (
            "Maintain sustainable pacing; no adjustment required at this time."
        )

    if not factors:
        factors.append("No aggravating factors identified.")

    return BurnoutAssessment(
        level=level,
        factors=factors,
        recommendation=recommendation,
    )


# --------------------------------------------------------------------------- #
# Firing advisory
# --------------------------------------------------------------------------- #
# The mandated compliance disclaimer. BaZi is NEVER a sole ground for dismissal.
_FIRING_DISCLAIMER = (
    "BaZi is advisory only; the decision rests with HR/legal per GDPR Art.22 "
    "and local labor law. BaZi-derived signals must never be the sole or "
    "determining basis for termination, and the employee retains the right to "
    "human review and explanation."
)

_PERFORMANCE_REPLACE_THRESHOLD = 40
_PERFORMANCE_REASSIGN_THRESHOLD = 60


@dataclass(frozen=True)
class FiringAdvisory:
    """Advisory retention verdict. Performance-driven; BaZi is contextual only."""
    verdict: str          # "retain" | "reassign" | "review_for_replacement"
    reasoning: str = ""
    disclaimer: str = ""


def firing_advisory(seat_bazi: BaZiSummary, performance_score: int,
                    in_high_clash: bool) -> FiringAdvisory:
    """Advisory retention recommendation.

    NEVER recommends firing solely on BaZi. Performance is the primary driver;
    a high-clash period only escalates an already-poor performer to
    ``review_for_replacement`` (a review signal, not a termination order).
    """
    if not 0 <= performance_score <= 100:
        raise ValueError(
            f"performance_score must be 0-100, got {performance_score}"
        )

    element = seat_bazi.day_master_element

    if performance_score < _PERFORMANCE_REPLACE_THRESHOLD and in_high_clash:
        verdict = "review_for_replacement"
        reasoning = (
            f"Low performance ({performance_score}/100) coinciding with a "
            f"high-severity clash period for the {element.value} Day Master. "
            "Review the role fit and support options before any action; the "
            "clash may be transient and should not drive the decision alone."
        )
    elif performance_score < _PERFORMANCE_REASSIGN_THRESHOLD:
        verdict = "reassign"
        reasoning = (
            f"Below-target performance ({performance_score}/100). Consider "
            f"reassignment, coaching or adjusted responsibilities that better "
            f"fit the {element.value} archetype before any separation review."
        )
    else:
        verdict = "retain"
        reasoning = (
            f"Adequate performance ({performance_score}/100). Retain; continue "
            "normal development and periodic review."
        )

    return FiringAdvisory(
        verdict=verdict,
        reasoning=reasoning,
        disclaimer=_FIRING_DISCLAIMER,
    )
