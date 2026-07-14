"""BaZi date selection (择日) + daily forecast (流日).

Date selection: given a goal (open business, wedding, relocation) and the
natal chart's Day Master + favorable elements, rank candidate dates by how
well their day-pillar element harmonizes with the chart. This is the
"ze-ri" (择日) technique — picking auspicious days.

Daily forecast: the day-pillar (流日) for any Gregorian date, its element,
and a brief harmony assessment vs the Day Master (блок: ежедневный прогноз).

Pure functions. Day-pillar computation reuses pillars.day_pillar().
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

from services.bazi_engine.domain.constants import Element, Stem
from services.bazi_engine.domain.interpretation import ten_god, TenGod
from services.bazi_engine.domain.pillars import Pillar, day_pillar
from services.bazi_engine.domain.clashes import detect_branch_interaction


# Goal → the elements most supportive of that activity (classical associations).
GOAL_FAVORABLE_ELEMENTS: dict[str, frozenset[Element]] = {
    "business": frozenset({Element.METAL, Element.EARTH}),    # wealth/structure
    "wedding": frozenset({Element.EARTH, Element.FIRE}),       # union/passion
    "relocation": frozenset({Element.WATER, Element.WOOD}),    # movement/growth
    "health": frozenset({Element.EARTH, Element.WOOD}),        # stability/vitality
    "travel": frozenset({Element.WATER, Element.METAL}),       # flow/speed
    "contract": frozenset({Element.METAL}),                    # precision/binding
}


@dataclass(frozen=True)
class DateRating:
    """The auspiciousness rating of a single date for a goal."""
    date: date
    day_pillar: Pillar
    score: int               # -3..+3
    label: str               # "excellent" | "good" | "neutral" | "caution" | "avoid"
    stem_element: Element
    branch_element: Element
    ten_god: Optional[TenGod]
    clash_with_natal: Optional[str]   # clash kind if the day branch hits natal, else None
    reason: str


def rate_date(
    d: date,
    day_master_stem: Stem,
    natal_branches: Optional[dict] = None,
    goal: str = "business",
) -> DateRating:
    """Rate a single date for a goal, relative to the Day Master.

    Scoring:
      +2 if the day stem element is goal-favorable
      +1 if the day branch element is goal-favorable
      +1 if the day stem's Ten God is a "constructive" god (wealth/officer/resource)
      -2 if the day branch clashes/punishes a natal branch
    Score range -3..+3.
    """
    pillar = day_pillar(d)
    stem_el = pillar.element
    branch_el = pillar.branch_element()
    gods = {TenGod.DIRECT_WEALTH, TenGod.INDIRECT_WEALTH,
            TenGod.DIRECT_OFFICER, TenGod.DIRECT_RESOURCE,
            TenGod.EATING_GOD}
    tg = ten_god(day_master_stem, pillar.stem)
    goal_fav = GOAL_FAVORABLE_ELEMENTS.get(goal, frozenset())

    score = 0
    reasons: list[str] = []
    if stem_el in goal_fav:
        score += 2; reasons.append(f"day stem {stem_el.value} supports {goal}")
    if branch_el in goal_fav:
        score += 1; reasons.append(f"day branch {branch_el.value} supports {goal}")
    if tg in gods:
        score += 1; reasons.append(f"{tg.value} is constructive")
    # Clash check
    clash_kind = None
    if natal_branches:
        for nb in natal_branches.values():
            kind = detect_branch_interaction(pillar.branch, nb)
            if kind:
                score -= 2
                clash_kind = kind
                reasons.append(f"{pillar.branch.value} {kind} natal {nb.value}")
                break

    if score >= 3: label = "excellent"
    elif score >= 1: label = "good"
    elif score == 0: label = "neutral"
    elif score >= -1: label = "caution"
    else: label = "avoid"

    return DateRating(
        date=d, day_pillar=pillar, score=score, label=label,
        stem_element=stem_el, branch_element=branch_el,
        ten_god=tg, clash_with_natal=clash_kind,
        reason="; ".join(reasons) if reasons else "neutral day",
    )


def select_dates(
    start: date,
    day_master_stem: Stem,
    goal: str = "business",
    days_ahead: int = 90,
    top_n: int = 5,
    natal_branches: Optional[dict] = None,
) -> list[DateRating]:
    """Pick the most auspicious `top_n` dates in the next `days_ahead` days.

    Returns the top-rated dates (descending score), filtered to label ≥ "good".
    Used by the "Выбор даты" tool (block: выбор дат).
    """
    candidates: list[DateRating] = []
    for i in range(days_ahead):
        d = start + timedelta(days=i)
        r = rate_date(d, day_master_stem, natal_branches, goal)
        if r.score >= 1:
            candidates.append(r)
    candidates.sort(key=lambda r: (-r.score, r.date))
    return candidates[:top_n]


def daily_forecast(
    d: date,
    day_master_stem: Stem,
) -> DateRating:
    """The daily forecast for a date (блок: ежедневный прогноз).

    Same as rate_date with a generic 'general' goal — the day pillar's
    harmony with the Day Master drives the tone.
    """
    return rate_date(d, day_master_stem, natal_branches=None, goal="business")
