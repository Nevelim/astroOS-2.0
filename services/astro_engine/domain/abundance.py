"""Family Astrocartography & Synergy — multi-member abundance scoring.

Reference implementation of the customer's "family astrocartography" algorithm
(documented in FAMILY-ALGORITHM.md). Given the natal planet longitudes of each
family member and a list of candidate cities, it computes, for every city:

  1. Per-member score across 6 life spheres (career, love, travel, family,
     health, finance) — from the aspects each natal planet makes to that city's
     four chart angles (MC, IC, Asc, Desc), weighted by spatial buffer zones
     (1° ≈ 111 km) and a planet×sphere influence table.
  2. Three overlay rules: synergy ×1.5, pair crossings, dominance.
  3. Family-level aggregation: family average / min, abundance index,
     harmonic mean, balance ratio.
  4. Four family synergy types: resonance, cross-aspects, complementarity,
     harmony — combined into a single ``totalSynergy`` used to rank cities.

This module is PURE math. It takes planet longitudes and city coordinates as
inputs (like ``synastry.py`` and ``astrocartography.py``); the caller obtains
the longitudes from the ephemeris adapter or supplies precomputed ones.

Obliquity note: the reference uses ε = 23.44° (the rounded Meeus value) for the
MC/Asc angle formulas. We match it exactly here so outputs reproduce the
reference JSON dumps. (The ephemeris adapter uses 23.4393° for ecliptic
conversion; the resulting <0.15° longitude drift is acceptable and the angle
formulas dominate the score.)
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional


# --------------------------------------------------------------------------- #
# Reference constants (FAMILY-ALGORITHM.md — do NOT edit without re-verifying)
# --------------------------------------------------------------------------- #
OBLIQUITY_DEG: float = 23.44          # наклон эклиптики (эталон 23.44)
KM_PER_DEGREE: float = 111.0          # 1° отклонения ≈ 111 км
PAIR_PROXIMITY_KM: float = 40.0       # обе планеты ≤40км для перекрёстка
DOMINANCE_THRESHOLD: float = 0.3      # |score| < 0.3 → доминирование

SPHERES: tuple[str, ...] = ("career", "love", "travel", "family", "health", "finance")
PLANETS: tuple[str, ...] = (
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter",
    "Saturn", "Uranus", "Neptune", "Pluto", "NorthNode",
)

# Аспекты к углам гороскопа (Шаг 3): (name, angle°, orb°, multiplier)
ANGLE_ASPECTS: tuple[dict, ...] = (
    {"name": "conjunction", "angle": 0.0,   "orb": 3.0, "mult": 1.0},
    {"name": "sextile",     "angle": 60.0,  "orb": 2.0, "mult": 0.6},
    {"name": "square",      "angle": 90.0,  "orb": 2.0, "mult": -0.4},
    {"name": "trine",       "angle": 120.0, "orb": 2.5, "mult": 0.7},
)

# Кросс-аспекты (Шаг 7, тип 2) — между активированными планетами разных членов.
# Орбисы шире (синэстрия).
CROSS_ASPECTS: tuple[dict, ...] = (
    {"name": "conjunction", "angle": 0.0,   "orb": 8.0, "type": "harmonious"},
    {"name": "sextile",     "angle": 60.0,  "orb": 4.0, "type": "harmonious"},
    {"name": "square",      "angle": 90.0,  "orb": 6.0, "type": "challenging"},
    {"name": "trine",       "angle": 120.0, "orb": 8.0, "type": "harmonious"},
    {"name": "opposition",  "angle": 180.0, "orb": 8.0, "type": "challenging"},
)

SLOW_PLANETS: frozenset[str] = frozenset({"Jupiter", "Saturn"})
BENEFICS: frozenset[str] = frozenset({"Jupiter", "Venus", "Sun"})
MALEFICS: frozenset[str] = frozenset({"Saturn", "Mars"})

# Таблица весов планета × сфера (Шаг 4). + усиливает, − подавляет сферу.
PLANET_WEIGHTS: dict[str, dict[str, float]] = {
    "Sun":       {"career": 0.8, "love": 0.5, "travel": 0.6, "family": 0.7, "health": 1.0, "finance": 0.6},
    "Moon":      {"career": 0.2, "love": 0.9, "travel": 0.4, "family": 1.0, "health": 0.5, "finance": 0.3},
    "Mercury":   {"career": 0.8, "love": 0.3, "travel": 1.0, "family": 0.4, "health": 0.2, "finance": 0.7},
    "Venus":     {"career": 0.3, "love": 1.0, "travel": 0.6, "family": 0.9, "health": 0.4, "finance": 0.8},
    "Mars":      {"career": 1.0, "love": -0.2, "travel": -0.5, "family": -0.8, "health": -0.9, "finance": 0.4},
    "Jupiter":   {"career": 0.7, "love": 0.7, "travel": 0.9, "family": 0.8, "health": 0.6, "finance": 1.0},
    "Saturn":    {"career": 0.9, "love": -0.7, "travel": -0.6, "family": -0.5, "health": 0.2, "finance": 0.5},
    "Uranus":    {"career": -0.5, "love": 0.3, "travel": 0.8, "family": -0.9, "health": -0.2, "finance": 0.1},
    "Neptune":   {"career": -0.4, "love": 0.8, "travel": 0.9, "family": -0.3, "health": -0.8, "finance": -0.6},
    "Pluto":     {"career": 0.9, "love": 0.6, "travel": -0.4, "family": -0.2, "health": -0.3, "finance": 0.8},
    "NorthNode": {"career": 0.5, "love": 0.4, "travel": 0.5, "family": 0.5, "health": 0.3, "finance": 0.5},
}

# Перекрёстки пар планет (Шаг 5, правило 2). Обе ≤40км.
PAIR_BONUSES: tuple[dict, ...] = (
    {"p1": "Jupiter", "p2": "Venus",   "bonus": 0.8,  "sphere": "finance"},
    {"p1": "Sun",     "p2": "Jupiter", "bonus": 0.9,  "sphere": "career"},
    {"p1": "Venus",   "p2": "Moon",    "bonus": 0.7,  "sphere": "love"},
    {"p1": "Mercury", "p2": "Jupiter", "bonus": 0.6,  "sphere": "career"},
    {"p1": "Venus",   "p2": "Jupiter", "bonus": 0.5,  "sphere": "love"},
    {"p1": "Mars",    "p2": "Saturn",  "bonus": -0.9, "sphere": "career"},
    {"p1": "Mars",    "p2": "Saturn",  "bonus": -0.7, "sphere": "health"},
    {"p1": "Saturn",  "p2": "Uranus",  "bonus": -0.8, "sphere": "family"},
    {"p1": "Mars",    "p2": "Uranus",  "bonus": -0.7, "sphere": "health"},
    {"p1": "Neptune", "p2": "Saturn",  "bonus": -0.6, "sphere": "health"},
    {"p1": "Pluto",   "p2": "Mars",    "bonus": -0.5, "sphere": "family"},
)

# Весовые коэффициенты итоговой синергии (Шаг 8).
SYNERGY_WEIGHTS: dict[str, float] = {
    "resonance": 1.0,
    "crossAspect": 0.7,
    "complementarity": 0.8,
    "harmony": 1.0,
}


# --------------------------------------------------------------------------- #
# Value objects (inputs)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class MemberInput:
    """One family member. Either ``planets`` (precomputed longitudes) or
    ``gst_deg`` (Greenwich sidereal time at birth, degrees) must be provided —
    the caller picks based on whether longitudes are already known."""
    key: str                       # 'igor', 'yulia', ...
    name: str                      # display name (for reports)
    planets: dict[str, float]      # planet name → ecliptic longitude [0,360)
    gst_deg: float                 # GMST at birth (degrees) — drives city angles


@dataclass(frozen=True)
class CityInput:
    """A candidate city."""
    name: str
    country: str = ""
    lat: float = 0.0
    lng: float = 0.0
    region: str = ""


# --------------------------------------------------------------------------- #
# Internal value objects
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class _PlanetHit:
    """A planet making an aspect to a chart angle within an orbital buffer."""
    planet: str
    angle: str                # "MC" | "IC" | "Asc" | "Desc"
    aspect: str               # aspect name
    actual_angle: float       # angular distance planet↔angle [0,180]
    deviation: float          # |actual − exact aspect angle|
    dist_km: float            # deviation × 111 (rounded)
    buffer_zone: str          # "main" | "extended" | "fading" | "none"
    strength: float           # 1.0 exact → 0 at orb edge
    effective: float          # aspect.mult × buffer.factor × strength


@dataclass
class MemberScores:
    """Per-member scoring result for one city."""
    key: str
    scores: dict[str, float]               # sphere → score
    hits: tuple[_PlanetHit, ...]
    direct_hits_count: int                 # bufferZone == "main"
    has_synergy: bool                      # ≥2 direct hits


# --------------------------------------------------------------------------- #
# Output value objects
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Resonance:
    planet: str
    members: tuple[str, ...]
    count: int
    score: float


@dataclass(frozen=True)
class CrossAspect:
    m1: str
    m2: str
    p1: str
    p2: str
    aspect: str
    actual_angle: float
    deviation: float
    type: str               # "harmonious" | "challenging"
    score: float


@dataclass(frozen=True)
class SphereLeader:
    sphere: str
    leader: str
    score: float


@dataclass(frozen=True)
class CityReport:
    """Full report for one city: family-level metrics + synergy breakdown."""
    city: CityInput
    family_avg: dict[str, float]
    family_min: dict[str, float]
    all_members_all_positive: bool
    avg_all_positive: bool
    abundance_index: float
    min_score: float
    avg_score: float
    harmonic_mean: float
    balance_ratio: float
    # synergy breakdown
    resonances: tuple[Resonance, ...]
    resonance_score: float
    cross_aspects: tuple[CrossAspect, ...]
    cross_aspect_score: float
    sphere_leaders: tuple[SphereLeader, ...]
    complementarity_score: float
    member_avg: dict[str, float]
    harmony_ratio: float
    harmony_score: float
    total_synergy: float
    # per-member detail
    per_member_scores: dict[str, dict[str, float]]
    per_member_direct_hits: dict[str, int]
    per_member_has_synergy: dict[str, bool]


@dataclass
class FamilyReport:
    """Top-level report: ranking of all evaluated cities."""
    members: tuple[MemberInput, ...]
    cities: tuple[CityReport, ...]
    top_cities_by_synergy: tuple[CityReport, ...]
    top_cities_by_abundance: tuple[CityReport, ...]
    best_by_synergy_type: dict[str, CityReport]
    total_cities: int
    abundant_cities_count: int          # avgAllPositive
    strict_cities_count: int            # allMembersAllPositive


# --------------------------------------------------------------------------- #
# Pure helpers
# --------------------------------------------------------------------------- #
def _norm(deg: float) -> float:
    """Normalize degrees to [0, 360)."""
    return deg % 360.0


def angular_distance(a_deg: float, b_deg: float) -> float:
    """Shortest arc [0, 180] between two ecliptic longitudes."""
    d = abs(_norm(a_deg - b_deg))
    return d if d <= 180.0 else 360.0 - d


def buffer_factor(dist_km: float, planet: str) -> tuple[float, str]:
    """Spatial buffer multiplier for a hit at ``dist_km``.

    Returns (factor, zone). Slow planets (Jupiter/Saturn) extend the fading
    zone to 444 km. 1° ≈ 111 km.
    """
    fade_max = 444.0 if planet in SLOW_PLANETS else 333.0
    if dist_km <= 111.0:
        return 1.0, "main"
    if dist_km <= 222.0:
        return 0.7, "extended"
    if dist_km <= fade_max:
        return 0.3, "fading"
    return 0.0, "none"


# --------------------------------------------------------------------------- #
# Step 2 — chart angles for a member × city (GMST is per-member)
# --------------------------------------------------------------------------- #
def chart_angles(gst_deg: float, city_lat: float, city_lng: float
                 ) -> dict[str, Optional[float]]:
    """Four ecliptic angle longitudes {MC, IC, Asc, Desc} for a member's
    birth moment (via its GMST) at a city location.

    MC = atan2(sin LST, cos LST · cos ε)
    Asc = atan2(cos LST, −(sin ε·tan φ + cos ε·sin LST))
    IC = MC + 180, Desc = Asc + 180. Asc is None at polar latitudes.

    Uses ε = 23.44° to match the reference. LST = GMST + city longitude.
    """
    eps = math.radians(OBLIQUITY_DEG)
    phi = math.radians(city_lat)
    lst = _norm(gst_deg + city_lng)
    l = math.radians(lst)

    mc = math.degrees(math.atan2(math.sin(l), math.cos(l) * math.cos(eps))) % 360.0
    ic = _norm(mc + 180.0)

    denom = -(math.sin(eps) * math.tan(phi) + math.cos(eps) * math.sin(l))
    asc: Optional[float] = None
    if abs(denom) >= 1e-12:
        asc = math.degrees(math.atan2(math.cos(l), denom)) % 360.0
    desc = _norm(asc + 180.0) if asc is not None else None

    return {"MC": mc, "IC": ic, "Asc": asc, "Desc": desc}


# --------------------------------------------------------------------------- #
# Step 3 — find planet→angle hits
# --------------------------------------------------------------------------- #
def find_hits(member_planets: dict[str, float],
              angles: dict[str, Optional[float]]) -> tuple[_PlanetHit, ...]:
    """All aspects each natal planet makes to each angle, within buffer zones."""
    hits: list[_PlanetHit] = []
    for planet, p_lon in member_planets.items():
        for angle_name, a_lon in angles.items():
            if a_lon is None:
                continue
            actual = angular_distance(p_lon, a_lon)
            for asp in ANGLE_ASPECTS:
                dev = abs(actual - asp["angle"])
                if dev > asp["orb"]:
                    continue
                dist_km = round(dev * KM_PER_DEGREE)
                factor, zone = buffer_factor(dist_km, planet)
                if factor == 0.0:
                    continue
                strength = 1.0 - (dev / asp["orb"])
                effective = asp["mult"] * factor * strength
                hits.append(_PlanetHit(
                    planet=planet, angle=angle_name, aspect=asp["name"],
                    actual_angle=actual, deviation=dev, dist_km=dist_km,
                    buffer_zone=zone, strength=strength, effective=effective,
                ))
    # strongest first (matches reference sort order)
    hits.sort(key=lambda h: -abs(h.effective))
    return tuple(hits)


# --------------------------------------------------------------------------- #
# Step 4 + 5 — base scores + 3 overlay rules
# --------------------------------------------------------------------------- #
def _base_scores(hits: tuple[_PlanetHit, ...]) -> dict[str, float]:
    scores = {s: 0.0 for s in SPHERES}
    for h in hits:
        weights = PLANET_WEIGHTS.get(h.planet)
        if not weights:
            continue
        for s in SPHERES:
            scores[s] += weights[s] * h.effective
    return scores


def _apply_synergy_rule(scores: dict[str, float], direct_hits_count: int) -> None:
    """Rule 1: ≥2 direct (main-zone) hits → positive spheres ×1.5."""
    if direct_hits_count >= 2:
        for s in SPHERES:
            if scores[s] > 0:
                scores[s] *= 1.5


def _apply_pair_crossings(scores: dict[str, float],
                          hits: tuple[_PlanetHit, ...]) -> list[dict]:
    """Rule 2: 11 pair crossings — both planets ≤40 km."""
    crossings: list[dict] = []
    for pair in PAIR_BONUSES:
        h1 = next((h for h in hits if h.planet == pair["p1"]), None)
        h2 = next((h for h in hits if h.planet == pair["p2"]), None)
        if h1 and h2 and h1.dist_km < PAIR_PROXIMITY_KM and h2.dist_km < PAIR_PROXIMITY_KM:
            scores[pair["sphere"]] += pair["bonus"]
            crossings.append(pair)
    return crossings


def _apply_dominance_rule(scores: dict[str, float],
                          hits: tuple[_PlanetHit, ...]) -> None:
    """Rule 3: nearly-neutral sphere (|score|<0.3) → strongest planet's voice ×0.5."""
    if not hits:
        return
    for s in SPHERES:
        if abs(scores[s]) >= DOMINANCE_THRESHOLD:
            continue
        max_strength = 0.0
        dominant: Optional[str] = None
        for h in hits:
            st = abs(PLANET_WEIGHTS.get(h.planet, {}).get(s, 0.0))
            if st > max_strength:
                max_strength = st
                dominant = h.planet
        if dominant is not None:
            w = PLANET_WEIGHTS[dominant][s]
            if w > 0:
                scores[s] = max(scores[s], w * 0.5)
            elif w < 0:
                scores[s] = min(scores[s], w * 0.5)


def score_member(member_planets: dict[str, float],
                 angles: dict[str, Optional[float]]) -> MemberScores:
    """Full per-member pipeline (Steps 3–5) for one city."""
    hits = find_hits(member_planets, angles)
    scores = _base_scores(hits)
    direct = sum(1 for h in hits if h.buffer_zone == "main")
    _apply_synergy_rule(scores, direct)               # rule 1
    _apply_pair_crossings(scores, hits)               # rule 2
    _apply_dominance_rule(scores, hits)               # rule 3
    return MemberScores(
        key="", scores=scores, hits=hits,
        direct_hits_count=direct, has_synergy=direct >= 2,
    )


# --------------------------------------------------------------------------- #
# Step 6 — family aggregation
# --------------------------------------------------------------------------- #
def _family_aggregate(per_member: list[MemberScores]) -> dict:
    """FamilyAvg, familyMin, abundance index, harmonic mean, balance ratio."""
    n = len(per_member)
    family_avg = {s: 0.0 for s in SPHERES}
    family_min = {s: math.inf for s in SPHERES}
    for ms in per_member:
        for s in SPHERES:
            family_avg[s] += ms.scores[s]
            if ms.scores[s] < family_min[s]:
                family_min[s] = ms.scores[s]
    for s in SPHERES:
        family_avg[s] = family_avg[s] / n if n else 0.0
        if family_min[s] == math.inf:
            family_min[s] = 0.0

    avg_all_positive = all(v > 0 for v in family_avg.values())
    all_members_all_positive = all(
        ms.scores[s] > 0 for ms in per_member for s in SPHERES
    )

    avg_vals = list(family_avg.values())
    min_score = min(avg_vals) if avg_vals else 0.0
    max_score = max(avg_vals) if avg_vals else 0.0
    sum_score = sum(avg_vals)
    avg_score = sum_score / len(SPHERES) if SPHERES else 0.0
    harmonic_mean = (
        len(SPHERES) / sum(1.0 / v for v in avg_vals if v != 0.0)
        if avg_all_positive and all(v != 0.0 for v in avg_vals) else 0.0
    )
    balance_ratio = (min_score / max_score) if max_score > 0 else 0.0
    abundance_index = (min_score * avg_score) if avg_all_positive else 0.0
    return {
        "family_avg": family_avg, "family_min": family_min,
        "avg_all_positive": avg_all_positive,
        "all_members_all_positive": all_members_all_positive,
        "min_score": min_score, "avg_score": avg_score,
        "harmonic_mean": harmonic_mean, "balance_ratio": balance_ratio,
        "abundance_index": abundance_index,
    }


# --------------------------------------------------------------------------- #
# Step 7 — four synergy types
# --------------------------------------------------------------------------- #
def _planet_synergy_weight(planet: str) -> float:
    if planet in BENEFICS:
        return 1.5
    if planet in MALEFICS:
        return 0.8
    return 1.0


def _resonance_synergy(members: tuple[MemberInput, ...],
                       per_member: list[MemberScores]
                       ) -> tuple[tuple[Resonance, ...], float]:
    """Type 1: a planet activated (≤111 km, main zone) in 2+ members.
    Score = N² × planetWeight."""
    activation: dict[str, list[str]] = {}
    for m, ms in zip(members, per_member):
        activated = {h.planet for h in ms.hits if h.buffer_zone == "main"}
        for p in activated:
            activation.setdefault(p, []).append(m.name)
    resonances: list[Resonance] = []
    score = 0.0
    for planet, member_names in activation.items():
        if len(member_names) >= 2:
            pw = _planet_synergy_weight(planet)
            s = len(member_names) ** 2 * pw
            score += s
            resonances.append(Resonance(
                planet=planet, members=tuple(member_names),
                count=len(member_names), score=s,
            ))
    resonances.sort(key=lambda r: -r.score)
    return tuple(resonances), score


def _cross_aspect_synergy(members: tuple[MemberInput, ...],
                          per_member: list[MemberScores]
                          ) -> tuple[tuple[CrossAspect, ...], float]:
    """Type 2: activated planets of different members form natal aspects.
    Harmonious (☌⚹△) = +, challenging (□☍) = −0.5."""
    activated_by_member: list[set[str]] = []
    for ms in per_member:
        activated_by_member.append({h.planet for h in ms.hits if h.buffer_zone == "main"})

    aspects: list[CrossAspect] = []
    score = 0.0
    n = len(members)
    for i in range(n):
        for j in range(i + 1, n):
            m1, m2 = members[i], members[j]
            for p1 in activated_by_member[i]:
                for p2 in activated_by_member[j]:
                    if p1 == p2:
                        continue  # that's resonance, not a cross-aspect
                    lon1 = m1.planets.get(p1)
                    lon2 = m2.planets.get(p2)
                    if lon1 is None or lon2 is None:
                        continue
                    actual = angular_distance(lon1, lon2)
                    for asp in CROSS_ASPECTS:
                        dev = abs(actual - asp["angle"])
                        if dev > asp["orb"]:
                            continue
                        strength = 1.0 - (dev / asp["orb"])
                        sign = 1.0 if asp["type"] == "harmonious" else -0.5
                        asp_score = strength * sign
                        score += asp_score
                        aspects.append(CrossAspect(
                            m1=m1.name, m2=m2.name, p1=p1, p2=p2,
                            aspect=asp["name"], actual_angle=actual,
                            deviation=dev, type=asp["type"], score=asp_score,
                        ))
    aspects.sort(key=lambda a: -a.score)
    return tuple(aspects), score


def _complementarity_synergy(per_member: list[MemberScores]
                             ) -> tuple[tuple[SphereLeader, ...], float]:
    """Type 3: different members lead different spheres (diversification)."""
    leaders: list[SphereLeader] = []
    score = 0.0
    # Determine which member name leads each sphere. We need names; reuse key
    # if name not set. For this helper we rely on MemberScores.key being the
    # member's display name (set by the caller before calling).
    for s in SPHERES:
        max_score = -math.inf
        leader_key: Optional[str] = None
        for ms in per_member:
            if ms.scores[s] > max_score:
                max_score = ms.scores[s]
                leader_key = ms.key
        if leader_key is not None:
            leaders.append(SphereLeader(sphere=s, leader=leader_key, score=max_score))
            if max_score > 1.0:
                score += 1.0
            if max_score > 2.0:
                score += 0.5  # super-leader
    unique_leaders = {l.leader for l in leaders}
    score += len(unique_leaders) * 0.5
    if len(unique_leaders) == 1:
        score -= 1.0  # one member dominates all spheres
    return tuple(leaders), score


def _harmony_synergy(members: tuple[MemberInput, ...],
                     per_member: list[MemberScores],
                     all_members_all_positive: bool) -> tuple[float, float]:
    """Type 4: nobody lags behind. Returns (harmonyRatio, harmonyScore)."""
    member_avg: dict[str, float] = {}
    for m, ms in zip(members, per_member):
        total = sum(ms.scores[s] for s in SPHERES)
        member_avg[m.name] = total / len(SPHERES) if SPHERES else 0.0
    vals = list(member_avg.values())
    max_avg = max(vals) if vals else 0.0
    min_avg = min(vals) if vals else 0.0
    harmony_ratio = (min_avg / max_avg) if max_avg > 0 else 0.0
    harmony_score = 0.0
    if min_avg > 0:
        harmony_score = min_avg * harmony_ratio * 2.0
    if all_members_all_positive:
        harmony_score += 1.0
    negative_count = sum(
        1 for ms in per_member for s in SPHERES if ms.scores[s] < 0
    )
    harmony_score -= negative_count * 0.3
    return harmony_ratio, harmony_score


# --------------------------------------------------------------------------- #
# Top-level: one city
# --------------------------------------------------------------------------- #
def evaluate_city(members: tuple[MemberInput, ...], city: CityInput) -> CityReport:
    """Compute the full family report for a single city."""
    # Per-member scoring (Steps 2–5).
    per_member: list[MemberScores] = []
    for m in members:
        angles = chart_angles(m.gst_deg, city.lat, city.lng)
        ms = score_member(m.planets, angles)
        ms.key = m.name  # display name for synergy reports
        per_member.append(ms)

    # Family aggregation (Step 6).
    agg = _family_aggregate(per_member)

    # Synergy (Step 7).
    resonances, resonance_score = _resonance_synergy(members, per_member)
    cross_aspects, cross_aspect_score = _cross_aspect_synergy(members, per_member)
    sphere_leaders, complementarity_score = _complementarity_synergy(per_member)
    harmony_ratio, harmony_score = _harmony_synergy(
        members, per_member, agg["all_members_all_positive"])

    total_synergy = (
        resonance_score * SYNERGY_WEIGHTS["resonance"]
        + cross_aspect_score * SYNERGY_WEIGHTS["crossAspect"]
        + complementarity_score * SYNERGY_WEIGHTS["complementarity"]
        + harmony_score * SYNERGY_WEIGHTS["harmony"]
    )

    member_avg = {}
    for m, ms in zip(members, per_member):
        total = sum(ms.scores[s] for s in SPHERES)
        member_avg[m.name] = total / len(SPHERES) if SPHERES else 0.0

    return CityReport(
        city=city,
        family_avg=agg["family_avg"],
        family_min=agg["family_min"],
        all_members_all_positive=agg["all_members_all_positive"],
        avg_all_positive=agg["avg_all_positive"],
        abundance_index=agg["abundance_index"],
        min_score=agg["min_score"],
        avg_score=agg["avg_score"],
        harmonic_mean=agg["harmonic_mean"],
        balance_ratio=agg["balance_ratio"],
        resonances=resonances,
        resonance_score=resonance_score,
        cross_aspects=cross_aspects,
        cross_aspect_score=cross_aspect_score,
        sphere_leaders=sphere_leaders,
        complementarity_score=complementarity_score,
        member_avg=member_avg,
        harmony_ratio=harmony_ratio,
        harmony_score=harmony_score,
        total_synergy=total_synergy,
        per_member_scores={m.key: dict(ms.scores) for m, ms in zip(members, per_member)},
        per_member_direct_hits={m.key: ms.direct_hits_count for m, ms in zip(members, per_member)},
        per_member_has_synergy={m.key: ms.has_synergy for m, ms in zip(members, per_member)},
    )


# --------------------------------------------------------------------------- #
# Top-level: all cities → ranked report
# --------------------------------------------------------------------------- #
def compute_family_report(members: tuple[MemberInput, ...],
                          cities: tuple[CityInput, ...],
                          top_limit: int = 50) -> FamilyReport:
    """Evaluate every city, rank by totalSynergy, return the full report.

    Ranking and filters follow the reference:
      - ``top_cities_by_synergy``: cities sorted by totalSynergy desc.
      - ``top_cities_by_abundance``: cities sorted by abundanceIndex desc
        (only ``avg_all_positive``).
      - ``best_by_synergy_type``: best city per synergy component.
      - ``abundant_cities_count``: ``avg_all_positive`` cities.
      - ``strict_cities_count``: ``all_members_all_positive`` cities.
    """
    reports = tuple(evaluate_city(members, c) for c in cities)

    by_synergy = sorted(reports, key=lambda r: -r.total_synergy)
    by_abundance = sorted(
        (r for r in reports if r.avg_all_positive),
        key=lambda r: -r.abundance_index,
    )
    abundant_count = sum(1 for r in reports if r.avg_all_positive)
    strict_count = sum(1 for r in reports if r.all_members_all_positive)

    best_by_type: dict[str, CityReport] = {}
    if reports:
        best_by_type["resonance"] = max(reports, key=lambda r: r.resonance_score)
        best_by_type["crossAspect"] = max(reports, key=lambda r: r.cross_aspect_score)
        best_by_type["complementarity"] = max(reports, key=lambda r: r.complementarity_score)
        best_by_type["harmony"] = max(reports, key=lambda r: r.harmony_score)

    return FamilyReport(
        members=members,
        cities=reports,
        top_cities_by_synergy=tuple(by_synergy[:top_limit]),
        top_cities_by_abundance=tuple(by_abundance[:top_limit]),
        best_by_synergy_type=best_by_type,
        total_cities=len(reports),
        abundant_cities_count=abundant_count,
        strict_cities_count=strict_count,
    )
