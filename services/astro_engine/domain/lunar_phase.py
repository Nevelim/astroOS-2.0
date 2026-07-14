"""Lunar phase calculation — Moon phase from Sun-Moon elongation.

The lunar phase is determined by the angular separation (elongation) between
the Sun and Moon as seen from Earth:
   0°   = New Moon
   90°  = First Quarter
   180° = Full Moon
   270° = Last Quarter

The phase cycles every ~29.53 days (synodic month). This module computes the
phase name, the illuminated fraction, and the days until the next major phase,
from the ecliptic longitudes of the Sun and Moon.

Pure math — the caller supplies the ecliptic longitudes (which the ephemeris
adapter already computes). No ephemeris dependency here.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum


class PhaseName(str, Enum):
    NEW = "new_moon"
    WAXING_CRESCENT = "waxing_crescent"
    FIRST_QUARTER = "first_quarter"
    WAXING_GIBBOUS = "waxing_gibbous"
    FULL = "full_moon"
    WANING_GIBBOUS = "waning_gibbous"
    LAST_QUARTER = "last_quarter"
    WANING_CRESCENT = "waning_crescent"


# Phase display names (EN + RU + emoji)
PHASE_DISPLAY: dict[PhaseName, dict[str, str]] = {
    PhaseName.NEW:             {"en": "New Moon", "ru": "Новолуние", "emoji": "🌑"},
    PhaseName.WAXING_CRESCENT: {"en": "Waxing Crescent", "ru": "Растущий серп", "emoji": "🌒"},
    PhaseName.FIRST_QUARTER:   {"en": "First Quarter", "ru": "Первая четверть", "emoji": "🌓"},
    PhaseName.WAXING_GIBBOUS:  {"en": "Waxing Gibbous", "ru": "Растущая Луна", "emoji": "🌔"},
    PhaseName.FULL:            {"en": "Full Moon", "ru": "Полнолуние", "emoji": "🌕"},
    PhaseName.WANING_GIBBOUS:  {"en": "Waning Gibbous", "ru": "Убывающая Луна", "emoji": "🌖"},
    PhaseName.LAST_QUARTER:    {"en": "Last Quarter", "ru": "Последняя четверть", "emoji": "🌗"},
    PhaseName.WANING_CRESCENT: {"en": "Waning Crescent", "ru": "Убывающий серп", "emoji": "🌘"},
}

SYNODIC_MONTH_DAYS = 29.530588853  # average synodic month


@dataclass(frozen=True)
class LunarPhase:
    """The Moon phase at a given moment."""
    phase: PhaseName
    elongation_deg: float       # Sun-Moon angular separation [0, 360)
    illumination_pct: float     # illuminated fraction of the Moon's disk [0, 100]
    age_days: float             # days since last new moon
    days_to_next_phase: float   # days until the next major (quarter) phase


def _normalize(deg: float) -> float:
    return deg % 360.0


def lunar_phase(sun_longitude_deg: float, moon_longitude_deg: float
                ) -> LunarPhase:
    """Compute the lunar phase from the Sun and Moon ecliptic longitudes.

    Elongation = Moon − Sun (mod 360). It increases through the cycle:
    0→new, 90→first quarter, 180→full, 270→last quarter.
    """
    elongation = _normalize(moon_longitude_deg - sun_longitude_deg)

    # Illuminated fraction: (1 − cos(elongation)) / 2 → 0 at new, 1 at full.
    illum = (1.0 - math.cos(math.radians(elongation))) / 2.0
    illumination_pct = round(illum * 100.0, 1)

    # Moon age: fraction of the synodic month elapsed.
    age_days = round(elongation / 360.0 * SYNODIC_MONTH_DAYS, 2)

    # Phase name from elongation (8 phases, each spanning 45°).
    phase = _phase_from_elongation(elongation)

    # Days to next major phase (new/first-quarter/full/last-quarter at 0/90/180/270).
    next_major = _next_major_elongation(elongation)
    days_to_next = round((next_major - elongation) % 360.0
                         / 360.0 * SYNODIC_MONTH_DAYS, 1)

    return LunarPhase(
        phase=phase, elongation_deg=round(elongation, 2),
        illumination_pct=illumination_pct, age_days=age_days,
        days_to_next_phase=days_to_next,
    )


def _phase_from_elongation(elongation: float) -> PhaseName:
    """Map an elongation [0,360) to one of 8 phase names."""
    # Define boundaries at the midpoints between major phases (±22.5°).
    if elongation < 22.5 or elongation >= 337.5:
        return PhaseName.NEW
    elif elongation < 67.5:
        return PhaseName.WAXING_CRESCENT
    elif elongation < 112.5:
        return PhaseName.FIRST_QUARTER
    elif elongation < 157.5:
        return PhaseName.WAXING_GIBBOUS
    elif elongation < 202.5:
        return PhaseName.FULL
    elif elongation < 247.5:
        return PhaseName.WANING_GIBBOUS
    elif elongation < 292.5:
        return PhaseName.LAST_QUARTER
    else:
        return PhaseName.WANING_CRESCENT


_MAJORS = (0.0, 90.0, 180.0, 270.0)


def _next_major_elongation(elongation: float) -> float:
    """The next major-phase elongation (0/90/180/270) after the current one."""
    for m in _MAJORS:
        if m > elongation:
            return m
    return 360.0  # wraps to 0 (next new moon)
