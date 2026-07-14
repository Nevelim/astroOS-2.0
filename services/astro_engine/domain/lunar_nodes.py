"""Lunar Nodes (North/South Node = Rahu/Ketu) — mean node calculation.

The Lunar Nodes are the points where the Moon's orbital path crosses the
ecliptic. The North Node (☊ / Rahu / "Dragon's Head") marks where the Moon
crosses upward; the South Node (☋ / Ketu / "Dragon's Tail") is exactly
opposite (Node + 180°). Together they form the **karmic/nodal axis** — one
of the most important features in a natal chart and a primary soulmate axis
in synastry (the classic indicator: someone's planets on your Nodes = a
"fated" connection).

The MEAN node (used by most Western astrology software) is a smooth
mathematical function — no ephemeris file needed. The TRUE node oscillates
±1.5° around the mean (it occasionally stations direct); for a natal service
the mean node is the standard reference. Formula from Meeus, Astronomical
Algorithms (1991), ch.22.

Mean longitude of the ascending node (Ω):
  Ω = 125.04452° − 1934.13618°·T + 0.052954°·T² + ...  (T = Julian centuries
                                                       from J2000.0)
The node drifts retrograde ~19.35°/year (a full cycle ≈ 18.6 years).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional


@dataclass(frozen=True)
class LunarNodePosition:
    """The nodal axis (North + South are always exactly 180° apart)."""
    north_longitude_deg: float    # ☊ Rahu — ecliptic longitude [0,360)
    south_longitude_deg: float    # ☋ Ketu — exactly north + 180 mod 360


# J2000.0 epoch: 2000-01-01 12:00 UT. Julian Day 2451545.0.
_J2000_JD = 2451545.0


def _julian_day(utc: datetime) -> float:
    """Julian Day (UT) for a timezone-aware UTC datetime (Meeus ch.7)."""
    dt = utc.astimezone(timezone.utc) if utc.tzinfo else utc.replace(tzinfo=timezone.utc)
    year = dt.year
    month = dt.month
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    jd = (dt.day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400
          - 32045)
    # Add fractional day (hours/minutes/seconds).
    day_fraction = (dt.hour - 12) / 24.0 + dt.minute / 1440.0 + dt.second / 86400.0
    return jd + day_fraction


def mean_lunar_node(utc: datetime) -> LunarNodePosition:
    """Compute the MEAN lunar node longitude (Meeus, Astronomical Algorithms).

    Returns the nodal axis: north (ascending, ☊) + south (descending, ☋).
    """
    jd = _julian_day(utc)
    t = (jd - _J2000_JD) / 36525.0   # Julian centuries from J2000.0

    # Mean longitude of the ascending node (Meeus eq. 22.1), truncated.
    omega = (125.04452
             - 1934.13618 * t
             + 0.052954 * t * t)
    north = omega % 360.0
    south = (north + 180.0) % 360.0

    return LunarNodePosition(
        north_longitude_deg=north,
        south_longitude_deg=south,
    )


def node_sign(north_longitude_deg: float) -> str:
    """The tropical zodiac sign of the North Node (convenience helper)."""
    signs = ("aries", "taurus", "gemini", "cancer", "leo", "virgo",
             "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces")
    return signs[int(north_longitude_deg // 30) % 12]
