"""BaZi clash detection — branch interactions (六冲 / 三刑 / 害).

These classical branch-relationship patterns flag tension/risk periods when
a transiting pillar (Luck Pillar or annual pillar) interacts with the natal
branches. Used for:
  - Блок 9 отчёта: годы переезда и рисков (relocation/health risk years)
  - HR burnout/firing advisory (Luck Pillar clash = stress period)

Pure functions over Branch enums — no astronomy, no I/O.

Six Clashes (六冲): pairs 6 positions apart (opposite on the zodiac wheel):
  子-午, 丑-未, 寅-申, 卯-酉, 辰-戌, 巳-亥. Conflict, sudden change, instability.

Six Harms (害/穿): subtle undermining:
  子-未, 丑-午, 寅-巳, 卯-辰, 申-亥, 酉-戌.

Three Punishments (三刑): internal friction, self-sabotage, legal/health:
  寅-巳-申 (ungrateful punishment), 丑-戌-未 (ungracious), 子-卯 (rude),
  辰-辰 / 午-午 / 酉-酉 / 亥-亥 (self-punishment).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from services.bazi_engine.domain.constants import Branch


# --------------------------------------------------------------------------- #
# Reference tables (verified against classical BaZi references)
# --------------------------------------------------------------------------- #
SIX_CLASHES: frozenset[frozenset[Branch]] = frozenset({
    frozenset({Branch.ZI, Branch.WU}),
    frozenset({Branch.CHOU, Branch.WEI}),
    frozenset({Branch.YIN, Branch.SHEN}),
    frozenset({Branch.MAO, Branch.YOU}),
    frozenset({Branch.CHEN, Branch.XU}),
    frozenset({Branch.SI, Branch.HAI}),
})

SIX_HARMS: frozenset[frozenset[Branch]] = frozenset({
    frozenset({Branch.ZI, Branch.WEI}),
    frozenset({Branch.CHOU, Branch.WU}),
    frozenset({Branch.YIN, Branch.SI}),
    frozenset({Branch.MAO, Branch.CHEN}),
    frozenset({Branch.SHEN, Branch.HAI}),
    frozenset({Branch.YOU, Branch.XU}),
})

# Ungrateful punishment (无恩之刑): 寅-巳-申 — all three pairwise.
_PUNISHMENT_UNGRATEFUL: frozenset[Branch] = frozenset({Branch.YIN, Branch.SI, Branch.SHEN})
# Ungracious punishment (恃势之刑): 丑-戌-未.
_PUNISHMENT_UNGRACIOUS: frozenset[Branch] = frozenset({Branch.CHOU, Branch.XU, Branch.WEI})
# Rude punishment (无礼之刑): 子-卯.
_PUNISHMENT_RUDE: frozenset[Branch] = frozenset({Branch.ZI, Branch.MAO})
# Self-punishment (自刑): 辰-辰, 午-午, 酉-酉, 亥-亥.
SELF_PUNISHMENT: frozenset[Branch] = frozenset({Branch.CHEN, Branch.WU, Branch.YOU, Branch.HAI})


# --------------------------------------------------------------------------- #
# Risk classification
# --------------------------------------------------------------------------- #
class ClashType(str):
    """Categories of branch interaction, with life-domain risk labels."""


@dataclass(frozen=True)
class Clash:
    """One detected branch interaction between a transiting pillar and natal."""
    kind: str               # "clash" | "harm" | "punishment" | "self_punishment"
    transit_branch: Branch  # the Luck/annual pillar branch
    natal_branch: Branch    # the natal pillar branch it interacts with
    natal_pillar: str       # "year" | "month" | "day" | "hour"
    risk_domains: tuple[str, ...]   # ("health", "career", "relationships", "relocation")
    severity: str           # "high" | "medium" | "low"
    description: str


# Risk-domain mapping by clash kind (classical interpretation).
_RISK_BY_KIND: dict[str, tuple[str, ...]] = {
    "clash": ("relocation", "career", "health"),
    "harm": ("relationships", "health"),
    "punishment": ("health", "career", "legal"),
    "self_punishment": ("health", "emotional"),
}


def _severity_for(kind: str, natal_pillar: str) -> str:
    """Day-pillar clashes are most personal/severe; year/month less so."""
    base = {"clash": "high", "punishment": "high", "harm": "medium", "self_punishment": "medium"}
    sev = base.get(kind, "low")
    if natal_pillar == "day":
        return sev  # day pillar (self/spouse) — full severity
    if sev == "high":
        return "medium"
    return sev


# --------------------------------------------------------------------------- #
# Detection
# --------------------------------------------------------------------------- #
def detect_branch_interaction(a: Branch, b: Branch) -> Optional[str]:
    """Classify the interaction between two branches, or None if harmonious.

    Checks (in priority order): six clash, harm, punishment pairs,
    self-punishment. Returns the kind string.
    """
    pair = frozenset({a, b})
    if pair in SIX_CLASHES:
        return "clash"
    if pair in SIX_HARMS:
        return "harm"
    # Punishment: any two of a 3-set, or the rude pair.
    for group in (_PUNISHMENT_UNGRATEFUL, _PUNISHMENT_UNGRACIOUS):
        if a in group and b in group and a != b:
            return "punishment"
    if pair == frozenset({Branch.ZI, Branch.MAO}):
        return "punishment"  # rude punishment 子-卯
    if a == b and a in SELF_PUNISHMENT:
        return "self_punishment"
    return None


def find_clashes(
    transit_branch: Branch,
    natal_branches: dict[str, Branch],
) -> list[Clash]:
    """All interactions between a transiting pillar branch and natal branches.

    `natal_branches` maps pillar-name → branch (e.g. {"year": ..., "month": ...,
    "day": ..., "hour": ...}). Returns one Clash per detected interaction.
    """
    out: list[Clash] = []
    for pillar_name, natal_b in natal_branches.items():
        kind = detect_branch_interaction(transit_branch, natal_b)
        if kind is None:
            continue
        risks = _RISK_BY_KIND.get(kind, ("general",))
        out.append(Clash(
            kind=kind,
            transit_branch=transit_branch,
            natal_branch=natal_b,
            natal_pillar=pillar_name,
            risk_domains=risks,
            severity=_severity_for(kind, pillar_name),
            description=_describe(kind, transit_branch, natal_b, pillar_name),
        ))
    return out


def _describe(kind: str, transit: Branch, natal: Branch, pillar: str) -> str:
    """Human-readable description (EN; the frontend localizes)."""
    labels = {
        "clash": f"{transit.value} clashes {natal.value} ({pillar} pillar) — sudden change, instability",
        "harm": f"{transit.value} harms {natal.value} ({pillar} pillar) — subtle undermining",
        "punishment": f"{transit.value} punishes {natal.value} ({pillar} pillar) — friction, legal/health risk",
        "self_punishment": f"{transit.value} self-punishment ({pillar} pillar) — self-sabotage, emotional",
    }
    return labels.get(kind, f"{transit.value} interacts with {natal.value}")


def is_high_risk_period(transit_branch: Branch,
                        natal_branches: dict[str, Branch]) -> bool:
    """True if a transit pillar brings a HIGH-severity clash to natal.

    Used by the forecast (блок 9) and HR burnout advisory: a high-severity
    clash on the day or month pillar signals a caution year.
    """
    clashes = find_clashes(transit_branch, natal_branches)
    return any(c.severity == "high" for c in clashes)
