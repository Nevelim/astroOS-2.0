"""Local Space — planetary azimuth/altitude from a birthplace.

Local Space astrology converts each planet's position to horizontal coordinates
(azimuth = compass bearing, altitude = angle above/below horizon) as seen from
the birthplace at the birth moment. Each planet's azimuth is drawn as a radial
line from the birthplace on a local map or compass rose.

This is DIFFERENT from Astrocartography (ACG):
  ACG → "Where on Earth is this planet angular?" (global great-circle lines)
  Local Space → "In which compass direction does this planet lie from here?"
                (local radial lines at a bearing)

Calculation (Meeus, ch.13 — equatorial → horizontal):
  Given: hour angle H, declination δ, observer latitude φ
  Altitude:  sin a = sin φ·sin δ + cos φ·cos δ·cos H
  Azimuth (from North, clockwise):
    A = atan2(sin H, cos H·sin φ − tan δ·cos φ)
  (This yields A measured from SOUTH clockwise in some conventions; the
  atan2 form above gives North=0 clockwise — the standard modern convention,
  matching skyfield's altaz() output.)

Pure math — the caller supplies RA, Dec, observer lat/lng, and the local
sidereal time (LST). No ephemeris dependency.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional


@dataclass(frozen=True)
class LocalSpaceLine:
    """One planet's horizontal position + compass direction from birthplace."""
    planet: str
    azimuth_deg: float        # compass bearing from North [0, 360)
    altitude_deg: float       # angle above (+) / below (−) horizon
    sector: str               # 8-point compass sector (N, NE, E, ...)
    above_horizon: bool


@dataclass(frozen=True)
class LocalSpaceResult:
    """The full local-space chart for all planets at a birthplace."""
    observer_lat: float
    observer_lng: float
    lines: tuple[LocalSpaceLine, ...]
    total_above: int
    total_below: int


_SECTORS_8 = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")


def _sector(azimuth_deg: float) -> str:
    """Map an azimuth to one of 8 compass sectors."""
    idx = int((azimuth_deg + 22.5) % 360.0 / 45.0)
    return _SECTORS_8[idx]


def equatorial_to_horizontal(
    ra_deg: float, dec_deg: float, observer_lat_deg: float, lst_deg: float
) -> tuple[float, float]:
    """Convert equatorial (RA, Dec) to horizontal (azimuth, altitude).

    Returns (azimuth_deg_from_north_cw, altitude_deg).
    Uses Meeus eq.13.5–13.6 (atan2 form for correct quadrant).
    """
    h_rad = math.radians(lst_deg - ra_deg)    # hour angle
    dec_rad = math.radians(dec_deg)
    phi_rad = math.radians(observer_lat_deg)

    # Altitude: sin a = sin φ·sin δ + cos φ·cos δ·cos H
    sin_alt = (math.sin(phi_rad) * math.sin(dec_rad) +
               math.cos(phi_rad) * math.cos(dec_rad) * math.cos(h_rad))
    sin_alt = max(-1.0, min(1.0, sin_alt))
    alt_rad = math.asin(sin_alt)

    # Azimuth from North clockwise: atan2(sin H, cos H·sin φ − tan δ·cos φ)
    az_rad = math.atan2(
        math.sin(h_rad),
        math.cos(h_rad) * math.sin(phi_rad) - math.tan(dec_rad) * math.cos(phi_rad)
    )
    # atan2 returns from South clockwise; convert to North=0 clockwise.
    az_deg = (math.degrees(az_rad) + 180.0) % 360.0
    alt_deg = math.degrees(alt_rad)

    return az_deg, alt_deg


def compute_local_space(
    planet_positions: dict[str, tuple[float, float]],  # {planet: (ra_deg, dec_deg)}
    observer_lat_deg: float,
    observer_lng_deg: float,
    lst_deg: float,  # local sidereal time in degrees
) -> LocalSpaceResult:
    """Compute the local-space chart (azimuth lines) for all planets.

    planet_positions: dict of planet name → (ra_deg, dec_deg).
    observer_lat/lng: the birthplace.
    lst_deg: local sidereal time at the birth moment (from chart.py or GMST+lng).
    """
    lines: list[LocalSpaceLine] = []
    above = 0
    below = 0

    for planet_name, (ra, dec) in planet_positions.items():
        az, alt = equatorial_to_horizontal(ra, dec, observer_lat_deg, lst_deg)
        is_above = alt >= 0
        if is_above:
            above += 1
        else:
            below += 1
        lines.append(LocalSpaceLine(
            planet=planet_name,
            azimuth_deg=round(az, 2),
            altitude_deg=round(alt, 2),
            sector=_sector(az),
            above_horizon=is_above,
        ))

    # Sort by azimuth for the compass display.
    lines.sort(key=lambda l: l.azimuth_deg)

    return LocalSpaceResult(
        observer_lat=observer_lat_deg,
        observer_lng=observer_lng_deg,
        lines=tuple(lines),
        total_above=above,
        total_below=below,
    )
