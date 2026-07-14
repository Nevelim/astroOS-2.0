"""Transits — current planetary positions aspecting a natal chart.

Transits are the primary timing technique in modern Western astrology: the
*current* positions of the planets (where they are today) form aspects to the
*fixed* positions in your birth chart. Each active transit-to-natal aspect
carries a specific theme (e.g. transiting Mars conjunct natal Venus =
energized relationships/passion).

For DAILY horoscopes, the inner planets (Moon, Sun, Mercury, Venus, Mars)
carry the most weight — they move fast enough to shift the picture day to day.
The research consensus (astrostyle, numerologist, kathrynhocking):
  - Moon: hours-scale mood; Sun: daily identity focus
  - Mercury/Venus/Mars: days-scale triggers (use major aspects)
  - Major aspects (conjunction, opposition, square, trine, sextile) only

This module computes transit-to-natal aspects, scores them by planet
importance + aspect type + orb tightness, and produces a themed daily
forecast. Pure functions — the caller supplies current + natal longitudes.

The planet-theme map (transiting planet → what it activates) follows
standard astrological symbolism, usable by the daily content service to
generate dynamic (non-template) horoscope text.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from services.astro_engine.domain.constants import (
    ASPECT_SPECS,
    AspectType,
    Planet,
    angular_separation,
)


# --------------------------------------------------------------------------- #
# Planet themes (transiting planet → what it activates in the natal chart)
# --------------------------------------------------------------------------- -*-
class TransitTheme(str, Enum):
    """The archetypal theme a transiting planet brings."""
    IDENTITY = "identity"          # Sun — vitality, self-focus
    EMOTION = "emotion"            # Moon — mood, feelings, instincts
    COMMUNICATION = "communication"  # Mercury — thinking, messages, exchange
    RELATIONSHIP = "relationship"  # Venus — love, beauty, values, harmony
    ACTION = "action"              # Mars — drive, energy, conflict, initiative
    GROWTH = "growth"              # Jupiter — opportunity, expansion
    STRUCTURE = "structure"        # Saturn — discipline, limitation, responsibility
    CHANGE = "change"              # Uranus — disruption, freedom, surprise
    DISSOLUTION = "dissolution"    # Neptune — dreams, confusion, inspiration
    TRANSFORMATION = "transformation"  # Pluto — power, renewal, depth


_PLANET_THEME: dict[Planet, TransitTheme] = {
    Planet.SUN: TransitTheme.IDENTITY,
    Planet.MOON: TransitTheme.EMOTION,
    Planet.MERCURY: TransitTheme.COMMUNICATION,
    Planet.VENUS: TransitTheme.RELATIONSHIP,
    Planet.MARS: TransitTheme.ACTION,
    Planet.JUPITER: TransitTheme.GROWTH,
    Planet.SATURN: TransitTheme.STRUCTURE,
    Planet.URANUS: TransitTheme.CHANGE,
    Planet.NEPTUNE: TransitTheme.DISSOLUTION,
    Planet.PLUTO: TransitTheme.TRANSFORMATION,
}

# Transiting-planet weight for daily relevance: fast planets dominate the
# day-to-day picture; outer planets are background (generational).
_DAILY_WEIGHT: dict[Planet, float] = {
    Planet.MOON: 1.0,      # fastest — dominates daily mood
    Planet.SUN: 0.9,
    Planet.MERCURY: 0.8,
    Planet.VENUS: 0.8,
    Planet.MARS: 0.7,
    Planet.JUPITER: 0.4,   # slower — weekly/monthly flavor
    Planet.SATURN: 0.3,
    Planet.URANUS: 0.2, Planet.NEPTUNE: 0.2, Planet.PLUTO: 0.2,
}

# Aspect-type weight: harmonious > tense for daily "feel-good" score.
_ASPECT_FEEL: dict[AspectType, float] = {
    AspectType.TRINE: 1.0,        # easy flow
    AspectType.SEXTILE: 0.8,      # opportunity
    AspectType.CONJUNCTION: 0.7,  # amplification (neutral)
    AspectType.OPPOSITION: 0.4,   # tension/awareness
    AspectType.SQUARE: 0.3,       # friction/challenge
    AspectType.QUINCUNX: 0.2,
}

# Tone for forecast text.
_TONE: dict[AspectType, str] = {
    AspectType.TRINE: "a harmonious flow",
    AspectType.SEXTILE: "a supportive opening",
    AspectType.CONJUNCTION: "an amplification",
    AspectType.OPPOSITION: "a moment of tension and awareness",
    AspectType.SQUARE: "a challenge to navigate",
    AspectType.QUINCUNX: "a subtle adjustment",
}

_THEME_TEXT: dict[TransitTheme, str] = {
    TransitTheme.IDENTITY: "your sense of self and vitality",
    TransitTheme.EMOTION: "your emotional landscape and instincts",
    TransitTheme.COMMUNICATION: "how you think and communicate",
    TransitTheme.RELATIONSHIP: "love, connection, and what you value",
    TransitTheme.ACTION: "your drive and initiative",
    TransitTheme.GROWTH: "opportunity and expansion",
    TransitTheme.STRUCTURE: "discipline and responsibility",
    TransitTheme.CHANGE: "surprise and the urge for freedom",
    TransitTheme.DISSOLUTION: "inspiration and sensitivity",
    TransitTheme.TRANSFORMATION: "depth, power, and renewal",
}


@dataclass(frozen=True)
class TransitAspect:
    """One transiting-planet to natal-planet aspect."""
    transiting: str           # e.g. "venus"
    natal_planet: str         # e.g. "sun"
    aspect_type: AspectType
    orb_deg: float
    weight: float             # combined daily-relevance weight
    theme: TransitTheme


@dataclass(frozen=True)
class DailyForecast:
    """The result of a transit analysis for one day."""
    aspects: tuple[TransitAspect, ...]
    dominant_theme: Optional[TransitTheme]
    score: int                # 0-100 daily "feel" score (harmonious → high)
    summary: str              # human-readable forecast
    highlights: tuple[str, ...]


# --------------------------------------------------------------------------- #
# Pure computation
# --------------------------------------------------------------------------- -*-
def _closest_aspect(lng_a: float, lng_b: float
                    ) -> Optional[tuple[AspectType, float]]:
    sep = angular_separation(lng_a, lng_b)
    best: Optional[tuple[AspectType, float]] = None
    best_orb = 99
    for asp, (angle, orb_cap) in ASPECT_SPECS.items():
        orb = abs(sep - angle)
        if orb <= orb_cap and orb < best_orb:
            best = (asp, orb)
            best_orb = orb
    return best


def compute_transits(
    current_positions: dict[str, float],   # today's planet longitudes
    natal_positions: dict[str, float],     # birth-chart planet longitudes
    include_minor: bool = False,
) -> tuple[TransitAspect, ...]:
    """Compute all active transit-to-natal aspects.

    Returns aspects sorted by weight (most relevant first).
    """
    aspects: list[TransitAspect] = []
    for t_name, t_lng in current_positions.items():
        for n_name, n_lng in natal_positions.items():
            result = _closest_aspect(t_lng, n_lng)
            if result is None:
                continue
            asp_type, orb = result
            if asp_type is AspectType.QUINCUNX and not include_minor:
                continue
            try:
                t_planet = Planet(t_name)
            except ValueError:
                continue
            weight = (_DAILY_WEIGHT.get(t_planet, 0.3)
                      * _ASPECT_FEEL[asp_type]
                      * (1.0 - orb / 10.0))   # tighter orb = stronger
            theme = _PLANET_THEME.get(t_planet, TransitTheme.ACTION)
            aspects.append(TransitAspect(
                transiting=t_name, natal_planet=n_name,
                aspect_type=asp_type, orb_deg=round(orb, 2),
                weight=round(weight, 3), theme=theme))
    aspects.sort(key=lambda a: -a.weight)
    return tuple(aspects)


def daily_forecast(
    current_positions: dict[str, float],
    natal_positions: dict[str, float],
    natal_sun_sign: Optional[str] = None,
) -> DailyForecast:
    """Build a themed daily forecast from today's transits."""
    aspects = compute_transits(current_positions, natal_positions)

    # Score: base 50, adjusted by aspect feel (harmonious raises, tense lowers).
    if aspects:
        avg_feel = sum(
            a.weight * _ASPECT_FEEL[a.aspect_type] for a in aspects
        ) / max(sum(a.weight for a in aspects), 0.01)
        score = round(50 + (avg_feel - 0.55) * 80)
    else:
        score = 50
    score = max(0, min(100, score))

    # Dominant theme = highest-weighted transit.
    dominant = aspects[0].theme if aspects else None

    # Highlights (top 3 transits, human-readable).
    highlights: list[str] = []
    for a in aspects[:3]:
        tone = _TONE.get(a.aspect_type, "an influence")
        theme_text = _THEME_TEXT.get(a.theme, "your life")
        highlights.append(
            f"Transiting {a.transiting} {a.aspect_type.value} natal "
            f"{a.natal_planet}: {tone} touching {theme_text} (orb {a.orb_deg:.1f}°).")

    # Summary.
    if aspects:
        sign_phrase = f" for {natal_sun_sign.title()}" if natal_sun_sign else ""
        dom_text = _THEME_TEXT.get(dominant, "your day") if dominant else "your day"
        summary = (f"Today{sign_phrase} centers on {dom_text}. "
                   + (" ".join(highlights[:2]))
                   + f" Overall energy: {score}/100.")
    else:
        summary = "A quiet day astrologically — no major transits active."

    return DailyForecast(
        aspects=aspects, dominant_theme=dominant, score=score,
        summary=summary, highlights=tuple(highlights),
    )
