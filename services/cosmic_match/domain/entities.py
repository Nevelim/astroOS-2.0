"""Cosmic Match domain: compatibility computation + matching entities.

Pure domain — no DB, no Socket.io. The 3-layer compatibility algorithm
(Western synastry + BaZi + shared astrocartography) lives here as pure
functions. Privacy invariants enforced: birth_data never leaks.

Layer 1: Western synastry — aspects between two natal charts.
Layer 2: BaZi compatibility — Day Master + Earthly Branch relations.
Layer 3: Shared astrocartography — cities favorable for both (V2).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class MatchIntent(str, Enum):
    ROMANTIC = "romantic"
    FRIENDSHIP = "friendship"
    BUSINESS = "business"
    TRAVEL = "travel"


@dataclass(frozen=True)
class NatalSummary:
    """Compact natal data needed for matching (NOT full chart — privacy)."""
    sun_sign: str
    moon_sign: str
    venus_sign: str
    mars_sign: str
    ascendant_sign: Optional[str] = None
    # Optional planet longitudes — when present, enable true synastry (cross-chart
    # aspect) scoring instead of the element-level heuristic. These are ecliptic
    # degrees, NOT signs; the BFF computes them from the astro engine and passes
    # only the matching-eligible subset. Still privacy-safe: longitudes alone
    # cannot reverse-engineer birth data.
    planet_longitudes: Optional[dict] = None     # {"sun": 25.5, "venus": 28.2, ...}
    node_axis: Optional[tuple] = None            # (north_deg, south_deg)


@dataclass(frozen=True)
class BaZiSummary:
    """Compact BaZi data for matching (NOT raw birth data)."""
    day_master_stem: str
    day_master_element: str
    year_branch: str
    month_branch: str
    day_branch: str


@dataclass(frozen=True)
class MemberProfile:
    """The matching-eligible profile. BIRTH DATA NEVER INCLUDED."""
    profile_id: str
    display_name: str
    age: Optional[int] = None
    approx_distance_km: Optional[int] = None  # approximate, not precise
    natal: Optional[NatalSummary] = None
    bazi: Optional[BaZiSummary] = None
    intents: tuple[MatchIntent, ...] = (MatchIntent.ROMANTIC,)


@dataclass(frozen=True)
class CompatibilityScores:
    """5-sphere compatibility breakdown. Each 0-100."""
    love: int
    communication: int
    values: int
    lifestyle: int
    growth: int

    @property
    def composite(self) -> int:
        """Weighted average. Romantic intent weights love higher."""
        return round(
            self.love * 0.30 +
            self.communication * 0.20 +
            self.values * 0.20 +
            self.lifestyle * 0.15 +
            self.growth * 0.15
        )


@dataclass(frozen=True)
class CompatibilityResult:
    """Full compatibility assessment between two profiles."""
    profile_a: str
    profile_b: str
    scores: CompatibilityScores
    explanation: str
    layers_used: tuple[str, ...]  # ("western", "bazi", "astrocarto")


# --------------------------------------------------------------------------- #
# Sign-based element compatibility (Western)
# --------------------------------------------------------------------------- #
_ELEMENTS = {
    "aries": "fire", "leo": "fire", "sagittarius": "fire",
    "taurus": "earth", "virgo": "earth", "capricorn": "earth",
    "gemini": "air", "libra": "air", "aquarius": "air",
    "cancer": "water", "scorpio": "water", "pisces": "water",
}

# Element compatibility matrix: 0-100 base score for sign-pairs.
# Same element = trine (harmonious), complementary = good, quincunx = challenging.
_ELEMENT_HARMONY = {
    ("fire", "fire"): 85, ("fire", "air"): 80,     # fire-air: mutual fuel
    ("fire", "earth"): 45, ("fire", "water"): 35,   # challenging
    ("earth", "earth"): 80, ("earth", "water"): 75, # earth-water: nurturing
    ("earth", "air"): 40,
    ("air", "air"): 75, ("air", "water"): 40,
    ("water", "water"): 75,
}


def _element_pair_score(e1: str, e2: str) -> int:
    """Base element harmony, symmetric."""
    if e1 == e2:
        return _ELEMENT_HARMONY.get((e1, e2), 70)
    return _ELEMENT_HARMONY.get((e1, e2), _ELEMENT_HARMONY.get((e2, e1), 50))


# --------------------------------------------------------------------------- #
# Pure compatibility computation
# --------------------------------------------------------------------------- #
def western_synastry_score(a: NatalSummary, b: NatalSummary) -> tuple[int, int, int, int]:
    """Returns (love, communication, values, lifestyle) from Western signs.

    love:        Sun+Venus harmony
    communication: Mercury (approximated by Sun proximity) + Moon
    values:      Sun sign agreement (shared life direction)
    lifestyle:   Moon + Mars (daily rhythm + energy)
    """
    def el(s: str) -> str:
        return _ELEMENTS.get(s.lower(), "fire")

    love = round((
        _element_pair_score(el(a.venus_sign), el(b.venus_sign)) * 0.6 +
        _element_pair_score(el(a.sun_sign), el(b.sun_sign)) * 0.4
    ))
    communication = round(_element_pair_score(el(a.moon_sign), el(b.moon_sign)))
    values = round(_element_pair_score(el(a.sun_sign), el(b.sun_sign)))
    lifestyle = round((
        _element_pair_score(el(a.moon_sign), el(b.moon_sign)) * 0.5 +
        _element_pair_score(el(a.mars_sign), el(b.mars_sign)) * 0.5
    ))
    # Clamp to 0-100
    return tuple(max(0, min(100, v)) for v in (love, communication, values, lifestyle))


# BaZi element compatibility (simplified Five Elements generating cycle)
_BAZI_GENERATES = {
    ("wood", "fire"), ("fire", "earth"), ("earth", "metal"),
    ("metal", "water"), ("water", "wood"),
}
_BAZI_CONTROLS = {
    ("wood", "earth"), ("earth", "water"), ("water", "fire"),
    ("fire", "metal"), ("metal", "wood"),
}


def bazi_compatibility_score(a: BaZiSummary, b: BaZiSummary) -> int:
    """Day Master element harmony (0-100). Generates cycle = favorable."""
    ea = a.day_master_element.lower()
    eb = b.day_master_element.lower()
    if ea == eb:
        return 75  # same element: companion
    if (ea, eb) in _BAZI_GENERATES or (eb, ea) in _BAZI_GENERATES:
        return 85  # mutual generation
    if (ea, eb) in _BAZI_CONTROLS or (eb, ea) in _BAZI_CONTROLS:
        return 45  # controlling: tension
    return 60  # neutral


def compute_compatibility(
    a: MemberProfile, b: MemberProfile,
    intent: MatchIntent = MatchIntent.ROMANTIC,
) -> CompatibilityResult:
    """Full multi-layer compatibility.

    Layers (additive, each refines the scores):
      - western: element-level sign harmony (always available from signs)
      - synastry: TRUE cross-chart aspects when planet longitudes are present
        (soulmate indicators, nodal contacts — the deepest signal)
      - bazi: Day Master element cycle
    """
    layers = []
    love = comm = values = lifestyle = growth = 50  # defaults
    synastry_summary = None

    if a.natal and b.natal:
        love, comm, values, lifestyle = western_synastry_score(a.natal, b.natal)
        layers.append("western")

        # Upgrade to true synastry when longitudes are available.
        if (a.natal.planet_longitudes and b.natal.planet_longitudes):
            from services.astro_engine.domain.synastry import compute_synastry
            nodes_a = a.natal.node_axis
            nodes_b = b.natal.node_axis
            result = compute_synastry(
                a.natal.planet_longitudes, b.natal.planet_longitudes,
                nodes_a, nodes_b)
            # Blend: synastry carries the deeper signal, so weight it heavily
            # (60% synastry / 40% element-level) for the composite spheres.
            syn_score = result.composite_score
            love = round(love * 0.4 + syn_score * 0.6)
            comm = round(comm * 0.4 + syn_score * 0.6)
            values = round(values * 0.4 + syn_score * 0.6)
            lifestyle = round(lifestyle * 0.4 + syn_score * 0.6)
            layers.append("synastry")
            synastry_summary = result.summary

    if a.bazi and b.bazi:
        bazi_score = bazi_compatibility_score(a.bazi, b.bazi)
        growth = round((growth + bazi_score) / 2)  # blend with default
        layers.append("bazi")

    scores = CompatibilityScores(
        love=love, communication=comm, values=values,
        lifestyle=lifestyle, growth=growth,
    )

    # Explanation text (privacy-safe: no birth data)
    explanation_parts = []
    if "western" in layers and a.natal and b.natal:
        explanation_parts.append(
            f"Sun signs {a.natal.sun_sign.title()}/{b.natal.sun_sign.title()}"
        )
    if "synastry" in layers and synastry_summary:
        explanation_parts.append(synastry_summary)
    if "bazi" in layers:
        explanation_parts.append(
            f"Day Masters {a.bazi.day_master_stem}/{b.bazi.day_master_stem}"
            if a.bazi and b.bazi else "BaZi elements"
        )

    return CompatibilityResult(
        profile_a=a.profile_id,
        profile_b=b.profile_id,
        scores=scores,
        explanation=" + ".join(explanation_parts) if explanation_parts else "Limited data",
        layers_used=tuple(layers),
    )
