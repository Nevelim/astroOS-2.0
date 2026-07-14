"""B2B HR team analysis: role suitability + compatibility (B2B-4), pure math.

Two algorithms, both pure functions of BaZiSummary (Day Master element only —
never birth data):

  - role_suitability(bazi) → fit scores across 5 role dimensions (leadership,
    execution, collaboration, creativity, stability) derived from the element's
    archetypal strengths. Always advisory.

  - pair_compatibility(a, b) → 0-100 score + a human-readable dynamic, from the
    Five Elements generating/controlling cycle (mirrors bazi_engine's logic
    but kept local for EU isolation).

Element archetypes (advisory mapping, grounded in traditional BaZi reading):
  WOOD  → growth, planning, expansion      → creativity/leadership
  FIRE  → visibility, passion, persuasion  → leadership/creativity
  EARTH → stability, reliability, support  → stability/collaboration
  METAL → precision, structure, discipline → execution/stability
  WATER → wisdom, adaptability, flow        → collaboration/creativity
"""
from __future__ import annotations

from services.b2b_hr.domain.entities import (
    BaZiSummary,
    Element,
    RoleSuitability,
    TeamCompatibilityEdge,
)


# --------------------------------------------------------------------------- #
# Element → role-fit archetype (advisory). Each dimension 0-100.
# --------------------------------------------------------------------------- #
_ELEMENT_FIT: dict[Element, dict[str, int]] = {
    Element.WOOD:  {"leadership": 72, "execution": 60, "collaboration": 68,
                    "creativity": 88, "stability": 55},
    Element.FIRE:  {"leadership": 85, "execution": 65, "collaboration": 62,
                    "creativity": 82, "stability": 48},
    Element.EARTH: {"leadership": 60, "execution": 78, "collaboration": 85,
                    "creativity": 52, "stability": 90},
    Element.METAL: {"leadership": 65, "execution": 90, "collaboration": 58,
                    "creativity": 60, "stability": 82},
    Element.WATER: {"leadership": 58, "execution": 55, "collaboration": 80,
                    "creativity": 75, "stability": 60},
}

_DIMENSIONS = ("leadership", "execution", "collaboration", "creativity", "stability")

_PRIMARY_STRENGTH: dict[Element, str] = {
    Element.WOOD: "creativity — growth-oriented planning",
    Element.FIRE: "leadership — inspiring visibility",
    Element.EARTH: "stability — reliable team foundation",
    Element.METAL: "execution — disciplined precision",
    Element.WATER: "collaboration — adaptive wisdom",
}


def role_suitability(seat_id: str, bazi: BaZiSummary) -> RoleSuitability:
    """Advisory role-fit scores for one employee (B2B-4)."""
    base = _ELEMENT_FIT.get(bazi.day_master_element, _ELEMENT_FIT[Element.EARTH])
    # Polarity tweak: yang adds assertiveness (leadership+), yin adds receptivity (collaboration+).
    fit = dict(base)
    if bazi.day_master_polarity == "yang":
        fit["leadership"] = min(100, fit["leadership"] + 5)
    else:
        fit["collaboration"] = min(100, fit["collaboration"] + 5)
    primary = _PRIMARY_STRENGTH.get(bazi.day_master_element, "balanced")
    return RoleSuitability(
        seat_id=seat_id,
        fit_scores=fit,
        primary_strength=primary,
        advisory_note="Advisory only — derived from Day Master archetype, "
                      "not a deterministic assessment.",
    )


# --------------------------------------------------------------------------- #
# Pair compatibility via Five Elements cycle
# --------------------------------------------------------------------------- -*-
_GENERATES = {
    (Element.WOOD, Element.FIRE), (Element.FIRE, Element.EARTH),
    (Element.EARTH, Element.METAL), (Element.METAL, Element.WATER),
    (Element.WATER, Element.WOOD),
}
_CONTROLS = {
    (Element.WOOD, Element.EARTH), (Element.EARTH, Element.WATER),
    (Element.WATER, Element.FIRE), (Element.FIRE, Element.METAL),
    (Element.METAL, Element.WOOD),
}


def pair_compatibility(seat_a: str, bazi_a: BaZiSummary,
                       seat_b: str, bazi_b: BaZiSummary
                       ) -> TeamCompatibilityEdge:
    """0-100 compatibility + dynamic label for two consenting employees."""
    ea, eb = bazi_a.day_master_element, bazi_b.day_master_element
    if ea == eb:
        return TeamCompatibilityEdge(seat_a, seat_b, 78,
                                     "same element — shared rhythm, risk of groupthink")
    if (ea, eb) in _GENERATES or (eb, ea) in _GENERATES:
        return TeamCompatibilityEdge(seat_a, seat_b, 88,
                                     "generating cycle — naturally collaborative")
    if (ea, eb) in _CONTROLS or (eb, ea) in _CONTROLS:
        return TeamCompatibilityEdge(seat_a, seat_b, 52,
                                     "controlling cycle — productive tension, needs mediation")
    return TeamCompatibilityEdge(seat_a, seat_b, 65,
                                 "neutral — complementary but independent")


def build_matrix(seats: list) -> list[TeamCompatibilityEdge]:
    """All pairwise edges for consenting seats with bazi summaries."""
    edges: list[TeamCompatibilityEdge] = []
    analyzable = [s for s in seats if s.analyzable and s.bazi_summary is not None]
    for i, a in enumerate(analyzable):
        for b in analyzable[i + 1:]:
            edges.append(pair_compatibility(
                a.seat_id, a.bazi_summary, b.seat_id, b.bazi_summary))
    return edges
