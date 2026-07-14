"""BaZi Day Master strength analysis (旺衰判断) — traditional method.

Determines whether the Day Master (日主) is STRONG or WEAK by scoring three
classical factors (得令 / 得地 / 得势). This is the foundation for proper 用神
(Yong Shen) selection, which the research literature is unanimous about:
you CANNOT pick favorable elements without first judging DM strength.

The three factors (traditional weights):
  1. 得令 (seasonal support): the month branch's element. If it generates or
     equals the DM element, the DM is "in season" — the heaviest factor (~40%).
  2. 得地 (rootedness): do the other branches contain the DM element or its
     mother? Roots give the DM a foundation (~30%).
  3. 得势 (allies): do the other stems share the DM element or generate it?
     Companions/resources add momentum (~30%).

Score range: roughly -100..+100. > 0 → STRONG, ≤ 0 → WEAK. This is an
advisory heuristic (a master practitioner considers chart structure 格局
and special patterns 化气/从格 which override); it is labelled as such.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional

from services.bazi_engine.domain.constants import (
    BRANCH_ELEMENT,
    Element,
    Polarity,
    Stem,
    STEM_ELEMENT,
    generates,
    same_element,
)


class DayMasterStrength(str, Enum):
    STRONG = "strong"
    WEAK = "weak"
    BALANCED = "balanced"   # near the threshold; a master may read either way


@dataclass(frozen=True)
class StrengthAssessment:
    """The result of a Day Master strength analysis."""
    score: int                      # -100..+100
    strength: DayMasterStrength
    seasonal_support: bool          # 得令
    rooted: bool                    # 得地
    allied: bool                    # 得势
    reasoning: str                  # human-readable summary


# --------------------------------------------------------------------------- #
# Seasonal strength (得令): which element is strong in each month branch.
# The month branch determines the "season" — the dominant element. A DM is
# "in season" (旺) if its element matches the season, or "supported" (相) if
# the season generates it. These are the two favorable seasonal states.
# --------------------------------------------------------------------------- #
# Map each month branch → the element that is in season (当令).
# Traditional assignment (寅=spring-wood start, 卯=wood peak, 辰=earth transition,
# 巳=summer-fire start, 午=fire peak, 未=earth transition, etc.).
_SEASON_ELEMENT: dict = {
    #寅 Tiger (Jan-Feb start of spring) → Wood
    #卯 Rabbit → Wood (peak)
    #辰 Dragon → Earth (spring transition, but Wood余气 still strong)
    #巳 Snake → Fire (start of summer)
    #午 Horse → Fire (peak)
    #未 Goat → Earth (summer transition)
    #申 Monkey → Metal (start of autumn)
    #酉 Rooster → Metal (peak)
    #戌 Dog → Earth (autumn transition)
    #亥 Pig → Water (start of winter)
    #子 Rat → Water (peak)
    #丑 Ox → Earth (winter transition)
}


def _month_season_element(month_branch) -> Optional[Element]:
    """The dominant element of the month branch's season."""
    el = BRANCH_ELEMENT.get(month_branch)
    return el


def _seasonal_factor(dm_element: Element, month_branch) -> tuple[int, bool]:
    """Score the 得令 (seasonal) factor.

    Returns (score, is_supported). In-season (same element) = strong support;
    generated-by-season (mother) = moderate support; controlled-by-season =
    penalty; controlling-the-season = mild penalty.
    """
    season_el = _month_season_element(month_branch)
    if season_el is None:
        return (0, False)
    if same_element(dm_element, season_el):
        return (40, True)         # 旺 — in season
    if generates(season_el, dm_element):
        return (25, True)         # 相 — season generates DM (supported)
    if generates(dm_element, season_el):
        return (-15, False)       # DM generates season → DM is drained
    # Controlling relationship (one controls the other).
    return (-20, False)           # season controls DM or DM controls season


# --------------------------------------------------------------------------- #
# Rootedness (得地): branches containing DM element or its mother.
# --------------------------------------------------------------------------- -*-
def _rootedness_factor(dm_element: Element, branches: list) -> tuple[int, bool]:
    """Score 得地. Each branch that matches DM element or its mother adds root."""
    mother = next(
        (e for e in Element if generates(e, dm_element)), None)
    score = 0
    rooted = False
    for b in branches:
        b_el = BRANCH_ELEMENT.get(b)
        if b_el is None:
            continue
        if same_element(dm_element, b_el):
            score += 12
            rooted = True
        elif mother is not None and same_element(mother, b_el):
            score += 6
            rooted = True
    return (score, rooted)


# --------------------------------------------------------------------------- #
# Allies (得势): stems that share DM element or generate it.
# --------------------------------------------------------------------------- -*-
def _ally_factor(dm_element: Element, stems: list) -> tuple[int, bool]:
    """Score 得势. Each allied stem (same element or mother) adds momentum."""
    mother = next(
        (e for e in Element if generates(e, dm_element)), None)
    score = 0
    allied = False
    for s in stems:
        s_el = STEM_ELEMENT.get(s)
        if s_el is None:
            continue
        if same_element(dm_element, s_el):
            score += 8
            allied = True
        elif mother is not None and same_element(mother, s_el):
            score += 5
            allied = True
    return (score, allied)


def assess_strength(dm_stem: Stem, month_branch, year_branch=None,
                    day_branch=None, hour_branch=None, year_stem=None,
                    hour_stem=None) -> StrengthAssessment:
    """Assess Day Master strength from the full Four Pillars.

    The DM stem + month branch are the primary inputs (classical emphasis on
    月令 / the month as the decisive factor). The remaining pillars refine.
    """
    dm_element = STEM_ELEMENT[dm_stem]

    # 1. 得令 — seasonal (heaviest)
    season_score, seasonal_ok = _seasonal_factor(dm_element, month_branch)

    # 2. 得地 — rootedness across all branches
    all_branches = [b for b in (year_branch, month_branch, day_branch, hour_branch)
                    if b is not None]
    root_score, rooted = _rootedness_factor(dm_element, all_branches)

    # 3. 得势 — allies across all stems (excluding the DM itself)
    other_stems = [s for s in (year_stem, hour_stem) if s is not None]
    ally_score, allied = _ally_factor(dm_element, other_stems)

    total = season_score + root_score + ally_score

    if total > 15:
        strength = DayMasterStrength.STRONG
    elif total < -15:
        strength = DayMasterStrength.WEAK
    else:
        strength = DayMasterStrength.BALANCED

    season_name = {
        Element.WOOD: "spring (wood)", Element.FIRE: "summer (fire)",
        Element.EARTH: "transition (earth)", Element.METAL: "autumn (metal)",
        Element.WATER: "winter (water)",
    }.get(_month_season_element(month_branch), "unknown")

    reasoning = (
        f"Day Master {dm_stem.value} ({dm_element.value}) "
        f"born in {season_name} month. "
        f"得令(seasonal): {'supported' if seasonal_ok else 'not supported'} ({season_score:+d}), "
        f"得地(rooted): {'yes' if rooted else 'no'} ({root_score:+d}), "
        f"得势(allies): {'yes' if allied else 'no'} ({ally_score:+d}). "
        f"Total {total:+d} → {strength.value}."
    )

    return StrengthAssessment(
        score=total, strength=strength,
        seasonal_support=seasonal_ok, rooted=rooted, allied=allied,
        reasoning=reasoning,
    )
