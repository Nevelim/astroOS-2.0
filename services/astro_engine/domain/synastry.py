"""Synastry: cross-chart aspects + soulmate scoring between two natal charts.

Synastry overlays two charts and measures how the planets/points of person A
aspect the planets/points of person B. This is the astrological foundation of
relationship compatibility — far deeper than Sun-sign matching.

The research literature (theinnerwheel, astrotales, upastrology, r/Advanced
astrology) converges on a clear priority ranking for synastry power:
  1. ANGLE CONTACTS — Sun/Moon/Venus to the other's Ascendant/Dsc/MC/IC
  2. NODAL CONTACTS — personal planets on the partner's North/South Node
     (the classic "fated/destined" soulmate indicator)
  3. SUN–MOON — one's Sun aspecting the other's Moon (core identity ↔
     emotional needs resonance)
  4. SATURN BONDS — Saturn to personal planets (longevity, commitment,
     staying power — the "glue" of long relationships)
  5. VENUS–MARS — romantic/sexual chemistry (conjunction/trine strongest)
  6. PLUTO CONTACTS — fated intensity, transformation (especially to Nodes
     or Venus)

This module computes cross-chart aspects with weighted scoring that follows
that consensus, flags soulmate indicators (nodal contacts especially), and
produces a 0-100 composite + human-readable highlights. Pure functions.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from services.astro_engine.domain.constants import (
    ASPECT_SPECS,
    AspectType,
    Planet,
    angular_separation,
)


# --------------------------------------------------------------------------- #
# Weighted importance per planet (research-consensus synastry priority)
# --------------------------------------------------------------------------- -*-
# Personal planets (Sun/Moon/Venus/Mars/Mercury) + ASC carry the most weight;
# Saturn is weighted for commitment; Jupiter for growth; outer planets less
# (they're generational and affect everyone born in the same years).
_PLANET_WEIGHT: dict[Planet, float] = {
    Planet.SUN: 1.0, Planet.MOON: 1.0,
    Planet.VENUS: 0.9, Planet.MARS: 0.8, Planet.MERCURY: 0.6,
    Planet.SATURN: 0.7,   # commitment/longevity
    Planet.JUPITER: 0.5,
    Planet.URANUS: 0.3, Planet.NEPTUNE: 0.3, Planet.PLUTO: 0.4,  # generational
}

# Aspect-type weight: harmonious (trine/sextile/conj) score higher than tense
# (square/opposition) for raw compatibility, but opposition still counts as a
# powerful attraction axis.
_ASPECT_WEIGHT: dict[AspectType, float] = {
    AspectType.CONJUNCTION: 1.0,
    AspectType.TRINE: 0.9,
    AspectType.SEXTILE: 0.7,
    AspectType.OPPOSITION: 0.6,    # attraction through polarity
    AspectType.SQUARE: 0.4,         # tension/friction
    AspectType.QUINCUNX: 0.2,
}

# Special "highlight" pairings — the soulmate-class indicators.
# Keys MUST be sorted tuples (matching how we look them up below).
_HIGHLIGHT_PAIRS: dict[tuple[str, str], str] = {
    ("moon", "sun"): "Sun–Moon resonance (core identity meets emotional needs)",
    ("mars", "venus"): "Venus–Mars chemistry (romantic & physical attraction)",
    ("sun", "venus"): "Sun–Venus (affection & appreciation)",
    ("moon", "venus"): "Moon–Venus (emotional tenderness)",
    ("saturn", "venus"): "Saturn–Venus (commitment & devotion)",
    ("moon", "saturn"): "Saturn–Moon (emotional security & loyalty)",
    ("saturn", "sun"): "Saturn–Sun (mutual respect & endurance)",
}


@dataclass(frozen=True)
class SynastryAspect:
    """One cross-chart aspect: A's planet aspecting B's planet."""
    a_planet: str
    b_planet: str
    aspect_type: AspectType
    orb_deg: float
    weight: float             # combined planet × aspect weight (importance)
    is_highlight: bool        # one of the soulmate-class pairings


@dataclass(frozen=True)
class NodalContact:
    """A planet on the partner's North or South Node — the fated indicator."""
    whose_node: str           # "A" or "B"
    which_node: str           # "north" or "south"
    whose_planet: str         # the other person
    planet: str
    orb_deg: float


@dataclass(frozen=True)
class SynastryResult:
    """Full synastry assessment between two charts."""
    aspects: tuple[SynastryAspect, ...]
    nodal_contacts: tuple[NodalContact, ...]
    composite_score: int          # 0-100, weighted by aspect importance
    highlights: tuple[str, ...]   # human-readable soulmate indicators found
    summary: str


# --------------------------------------------------------------------------- #
# Pure computation
# --------------------------------------------------------------------------- -*-
def _aspect_between(lng_a: float, lng_b: float, orb_cap: float = 9.0
                    ) -> Optional[tuple[AspectType, float]]:
    """Find the closest major aspect between two longitudes, within orb."""
    sep = angular_separation(lng_a, lng_b)
    best: Optional[tuple[AspectType, float]] = None
    best_orb = orb_cap + 1
    for asp, (angle, default_orb) in ASPECT_SPECS.items():
        orb = abs(sep - angle)
        if orb <= default_orb and orb < best_orb:
            best = (asp, orb)
            best_orb = orb
    return best


def compute_synastry(
    planets_a: dict[str, float],         # planet_name → ecliptic longitude
    planets_b: dict[str, float],
    nodes_a: Optional[tuple[float, float]] = None,  # (north, south)
    nodes_b: Optional[tuple[float, float]] = None,
) -> SynastryResult:
    """Compute cross-chart synastry between two charts.

    `planets_a`/`planets_b` map planet names (e.g. "sun", "venus") to their
    ecliptic longitudes. `nodes_a`/`nodes_b` are optional (north, south) node
    longitudes — when present, nodal contacts (soulmate indicators) are scored.
    """
    aspects: list[SynastryAspect] = []
    highlights: list[str] = []

    for name_a, lng_a in planets_a.items():
        for name_b, lng_b in planets_b.items():
            result = _aspect_between(lng_a, lng_b)
            if result is None:
                continue
            asp_type, orb = result
            try:
                pa = Planet(name_a)
                pb = Planet(name_b)
            except ValueError:
                continue
            weight = (_PLANET_WEIGHT.get(pa, 0.3) +
                      _PLANET_WEIGHT.get(pb, 0.3)) / 2 * _ASPECT_WEIGHT[asp_type]
            pair_key = tuple(sorted((name_a, name_b)))
            highlight_label = _HIGHLIGHT_PAIRS.get(pair_key)
            is_hl = highlight_label is not None and asp_type in (
                AspectType.CONJUNCTION, AspectType.TRINE, AspectType.SEXTILE,
                AspectType.OPPOSITION)
            if is_hl:
                highlights.append(
                    f"{highlight_label} — {asp_type.value} (orb {orb:.1f}°)")
            aspects.append(SynastryAspect(
                a_planet=name_a, b_planet=name_b, aspect_type=asp_type,
                orb_deg=orb, weight=round(weight, 3), is_highlight=is_hl))

    # Nodal contacts (soulmate axis) — the highest-value indicator.
    nodal: list[NodalContact] = []
    if nodes_a is not None:
        _score_nodal(nodes_a, "A", planets_b, "B", nodal, highlights)
    if nodes_b is not None:
        _score_nodal(nodes_b, "B", planets_a, "A", nodal, highlights)

    # Composite score: weighted sum of aspect importances, normalized to 0-100.
    # Base of 40 (some baseline affinity) + up to 60 from aspects, + nodal bonus.
    raw = sum(a.weight * (10 - min(a.orb_deg, 9)) / 10 for a in aspects)
    score = 40 + min(40, raw * 1.5) + len(nodal) * 5
    score = round(max(0, min(100, score)))

    # Dedupe highlights.
    seen = set()
    unique_hl = []
    for h in highlights:
        if h not in seen:
            seen.add(h)
            unique_hl.append(h)

    summary_parts = [f"Composite compatibility: {score}/100."]
    if nodal:
        summary_parts.append(
            f"{len(nodal)} nodal contact(s) — a fated/karmic connection.")
    if unique_hl:
        summary_parts.append(
            f"{len(unique_hl)} highlight pairing(s) found.")
    if not unique_hl and not nodal:
        summary_parts.append("No major soulmate indicators; "
                             "a pleasant but ordinary connection.")

    return SynastryResult(
        aspects=tuple(sorted(aspects, key=lambda a: -a.weight)),
        nodal_contacts=tuple(nodal),
        composite_score=score,
        highlights=tuple(unique_hl),
        summary=" ".join(summary_parts),
    )


def _score_nodal(nodes: tuple[float, float], whose_node: str,
                 planets: dict[str, float], whose_planet: str,
                 out: list[NodalContact], highlights: list[str]) -> None:
    """Find planets conjunct the partner's North or South Node (≤5° orb)."""
    north, south = nodes
    for node_lng, which in ((north, "north"), (south, "south")):
        for pname, plng in planets.items():
            orb = angular_separation(plng, node_lng)
            if orb <= 5.0:
                out.append(NodalContact(
                    whose_node=whose_node, which_node=which,
                    whose_planet=whose_planet, planet=pname, orb_deg=orb))
                label_node = "North Node" if which == "north" else "South Node"
                highlights.append(
                    f"{whose_planet.title()}'s {pname} on {whose_node}'s "
                    f"{label_node} (orb {orb:.1f}°) — fated/karmic tie")
