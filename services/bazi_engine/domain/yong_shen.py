"""BaZi 用神 (Yong Shen) selection — strength-aware favorable elements.

Replaces the old heuristic (always mother+wealth) with the traditional
扶抑 (support/suppress) method that the research literature is unanimous on:

  WEAK Day Master  → support it. Favorable = Resource (mother, generates DM)
                     + Companion (same element). These strengthen the DM.
  STRONG Day Master → drain it. Favorable = Output (DM generates, drains energy)
                     + Wealth (DM controls, consumes energy) + Officer (controls DM,
                     restrains excess). These reduce the DM's excess.
  BALANCED         → both paths work; return a balanced set (mother + wealth),
                     the safest advisory default.

This is still advisory — a master practitioner considers 格局 (chart structure)
and special patterns (从格 following-the-strong, 化格 transformation) which can
flip the selection. We label the output as advisory.

The unfavorable elements (忌神) are the opposite: what would worsen the
imbalance (e.g. for a weak DM, Output/Wealth/Officer drain/control it further).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from services.bazi_engine.domain.constants import (
    Element,
    Stem,
    generates,
    controls,
    same_element,
)
from services.bazi_engine.domain.strength import (
    DayMasterStrength,
    StrengthAssessment,
    assess_strength,
)


@dataclass(frozen=True)
class YongShen:
    """The result of 用神 selection — favorable + unfavorable elements."""
    favorable: tuple[Element, ...]     # 喜用神 — strengthen or balance the DM
    unfavorable: tuple[Element, ...]   # 忌神 — worsen the imbalance
    method: str                        # "support" | "drain" | "balance"
    reasoning: str


def _mother_of(element: Element) -> Element:
    """The element that generates `element` (the Resource/印)."""
    return next(e for e in Element if generates(e, element))


def _child_of(element: Element) -> Element:
    """The element that `element` generates (the Output/食伤 — drains DM)."""
    return next(e for e in Element if generates(element, e))


def _wealth_of(element: Element) -> Element:
    """The element that `element` controls (the Wealth/财 — consumes DM)."""
    return next(e for e in Element if controls(element, e))


def _officer_of(element: Element) -> Element:
    """The element that controls `element` (the Officer/官杀 — restrains DM)."""
    return next(e for e in Element if controls(e, element))


def select_yong_shen(
    dm_stem: Stem,
    month_branch=None,
    year_branch=None,
    day_branch=None,
    hour_branch=None,
    year_stem=None,
    hour_stem=None,
    assessment: Optional[StrengthAssessment] = None,
) -> YongShen:
    """Select favorable/unfavorable elements based on Day Master strength.

    If `assessment` is pre-computed, reuse it; otherwise compute from pillars.
    """
    dm_element = STEM_ELEMENT_LOOKUP[dm_stem]

    if assessment is None:
        assessment = assess_strength(
            dm_stem, month_branch, year_branch, day_branch,
            hour_branch, year_stem, hour_stem)

    mother = _mother_of(dm_element)

    if assessment.strength is DayMasterStrength.WEAK:
        # 扶: support the weak DM.
        # Favorable: Resource (mother) + Companion (same element).
        favorable = (mother, dm_element)
        # Unfavorable: Output (drains), Wealth (consumes), Officer (controls).
        unfavorable = (_child_of(dm_element), _wealth_of(dm_element),
                       _officer_of(dm_element))
        method = "support (扶) — strengthen the weak Day Master"
    elif assessment.strength is DayMasterStrength.STRONG:
        # 抑: drain the strong DM.
        # Favorable: Output (drains), Wealth (consumes), Officer (restrains).
        favorable = (_child_of(dm_element), _wealth_of(dm_element),
                     _officer_of(dm_element))
        # Unfavorable: Resource (mother, over-strengthens) + Companion (same).
        unfavorable = (mother, dm_element)
        method = "drain (抑) — reduce the strong Day Master's excess"
    else:
        # BALANCED — safe default.
        favorable = (mother, _wealth_of(dm_element))
        unfavorable = (_officer_of(dm_element),)
        method = "balance — Day Master is near equilibrium"

    reasoning = (
        f"Day Master {dm_stem.value} ({dm_element.value}) is {assessment.strength.value}. "
        f"Method: {method}. Favorable: {', '.join(e.value for e in favorable)}. "
        f"Advisory — a master reading may override based on chart structure (格局)."
    )

    return YongShen(
        favorable=favorable, unfavorable=unfavorable,
        method=method.split(" ")[0], reasoning=reasoning,
    )


# Local lookup to avoid circular import (strength.py already imports constants).
from services.bazi_engine.domain.constants import STEM_ELEMENT as STEM_ELEMENT_LOOKUP  # noqa: E402
