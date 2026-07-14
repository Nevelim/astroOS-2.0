"""BaZi partner compatibility (合婚) — B2C pair analysis (блок 5 отчёта).

Richer than the b2b_hr team pair_compatibility (which is GDPR-minimal): the
B2C report shows the percentage, the Five-Elements dynamic between the two
Day Masters, harmony/conflict zones, and concrete harmonization remedies.

Pure functions over Element + Stem + Pillar — no I/O, no birth-data leak
(the caller passes already-resolved Day Master profiles).

Five-Elements relationship scoring:
  - same element: 72 (shared nature, but risk of excess)
  - generating cycle (mother→child): 90 (nourishing, the classic "soulmate" pair)
  - controlling cycle: 48 (tension, needs conscious mediation)
  - complementary (different but neither generating nor controlling): 65
Plus modifiers: stem-polarity harmony, Day-Master-classic pairs (e.g. 甲-己
"noble combination" 天干五合) add bonuses.
"""
from __future__ import annotations

from dataclasses import dataclass

from services.bazi_engine.domain.constants import (
    Element, Stem, Polarity, STEM_ELEMENT, STEM_POLARITY,
    generates, controls,
)
from services.bazi_engine.domain.interpretation import ten_god, TenGod
from services.bazi_engine.domain.pillars import Pillar


# The 5 classical heavenly-stem combinations (天干五合) — the "noble pairs".
# 甲-己, 乙-庚, 丙-辛, 丁-壬, 戊-癸.
STEM_COMBINATIONS: frozenset[frozenset[Stem]] = frozenset({
    frozenset({Stem.JIA, Stem.JI}),
    frozenset({Stem.YI, Stem.GENG}),
    frozenset({Stem.BING, Stem.XIN}),
    frozenset({Stem.DING, Stem.REN}),
    frozenset({Stem.WU, Stem.GUI}),
})


@dataclass(frozen=True)
class CompatibilityReport:
    """Full BaZi partner-compatibility report (блок 5)."""
    score: int                          # 0-100 overall
    label: str                          # "harmonious" | "balanced" | "challenging"
    dynamic: str                        # EN description of the element dynamic
    dynamic_ru: str                     # RU description
    harmony_zones: tuple[str, ...]      # e.g. ("emotional", "intellectual")
    conflict_zones: tuple[str, ...]     # e.g. ("financial", "authority")
    remedies: tuple[str, ...]           # harmonization suggestions (element-based)
    is_noble_combination: bool          # 天干五合 — the 5 classical stem pairs


def _element_dynamic_label(ea: Element, eb: Element) -> tuple[str, str]:
    """(EN, RU) one-line description of how the two elements interact."""
    if ea == eb:
        return ("Same element — shared rhythm and values, but risk of excess",
                "Одна стихия — общие ценности и ритм, но риск избытка")
    if generates(ea, eb) or generates(eb, ea):
        return ("Generating cycle — one nourishes the other, a nurturing bond",
                "Созидательный цикл — один питает другого, заботливый союз")
    if controls(ea, eb) or controls(eb, ea):
        return ("Controlling cycle — productive tension, needs conscious mediation",
                "Контрольный цикл — конструктивное напряжение, требует осознанности")
    return ("Complementary — different natures that neither clash nor fuse",
            "Дополняющие — разные природы, без конфликта и слияния")


def _zones(ea: Element, eb: Element) -> tuple[tuple[str, ...], tuple[str, ...]]:
    """(harmony_zones, conflict_zones) by the element pair."""
    if generates(ea, eb) or generates(eb, ea):
        return (("emotional_support", "growth"), ("boundaries",))
    if controls(ea, eb) or controls(eb, ea):
        return (("passion",), ("authority", "financial", "communication"))
    if ea == eb:
        return (("understanding", "shared_goals"), ("excitement",))
    return (("balance", "complementarity"), ())


def _remedies(ea: Element, eb: Element) -> tuple[str, ...]:
    """Element-based harmonization suggestions."""
    if controls(ea, eb) or controls(eb, ea):
        # The controlling pair needs the "mediator" element (the one that
        # drains the controller / generates the controlled).
        return (
            "Wear or surround with the mediating element (the one between you in the generating cycle)",
            "Practice explicit communication about authority and finances",
            "A shared crystal that balances both elements (e.g. for Fire-Metal: Earth tones)",
        )
    if ea == eb:
        return (
            "Introduce the element that drains the shared one (to avoid excess)",
            "Cultivate separate interests to preserve individuality",
        )
    return (
        "Honor your different rhythms — neither is wrong",
        "Use the generating-cycle element to bridge your natures",
    )


def bazi_compatibility(
    day_pillar_a: Pillar,
    day_pillar_b: Pillar,
) -> CompatibilityReport:
    """Full partner-compatibility report from two Day Pillars (блок 5).

    The Day Pillar is the "self" — its stem is the Day Master. This function
    scores the pair on the Five-Elements relationship of the two Day Master
    elements, plus stem-level bonuses (noble combinations, polarity harmony).
    """
    sa, sb = day_pillar_a.stem, day_pillar_b.stem
    ea, eb = STEM_ELEMENT[sa], STEM_ELEMENT[sb]
    pa, pb = STEM_POLARITY[sa], STEM_POLARITY[sb]

    # Base score from the element relationship.
    if ea == eb:
        score = 72
    elif generates(ea, eb) or generates(eb, ea):
        score = 90
    elif controls(ea, eb) or controls(eb, ea):
        score = 48
    else:
        score = 65

    # Modifiers.
    noble = frozenset({sa, sb}) in STEM_COMBINATIONS
    if noble:
        score += 8  # 天干五合 — classical affinity
    if pa != pb:
        score += 3  # yin-yang balance is complementary
    else:
        score -= 2  # same polarity can amplify rigidity

    score = max(0, min(100, score))
    label = "harmonious" if score >= 75 else ("balanced" if score >= 55 else "challenging")
    dyn_en, dyn_ru = _element_dynamic_label(ea, eb)
    harmony, conflict = _zones(ea, eb)

    return CompatibilityReport(
        score=score,
        label=label,
        dynamic=dyn_en,
        dynamic_ru=dyn_ru,
        harmony_zones=harmony,
        conflict_zones=conflict,
        remedies=_remedies(ea, eb),
        is_noble_combination=noble,
    )
