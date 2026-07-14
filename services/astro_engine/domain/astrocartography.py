"""Astrocartography — planetary lines across the globe (Jim Lewis ACG method).

Astrocartography maps where each planet in a birth chart sits on an angle
(Ascendant, Descendant, Midheaven, Imum Coeli) at the moment of birth. The
"lines" on the world map show longitudes where a planet is rising (on the
ASC), setting (on the DSC), culminating overhead (on the MC), or
anti-culminating underfoot (on the IC). Traveling to or living near a line
amplifies that planet's energy in your life.

Calculation basis (In Mundo, the standard ACG method):
  MC line  (culmination):  the planet is on the local meridian → the longitude
                           where GMST matches the planet's RA. A straight N-S line.
                           longitude = (GMST_hours × 15 − RA) mod 360.
  IC line  (anti-culmination): 180° opposite the MC line.
  ASC line (rising):  the planet is on the eastern horizon. The longitude
                      depends on latitude (curved line):
                      tan(H) = −1 / (cos(φ) · tan(δ)),  then lng = MC_lng − H.
  DSC line (setting): tan(H) = +1 / (cos(φ) · tan(δ)),  then lng = MC_lng − H.

Where φ = latitude, δ = planet declination, H = hour angle, RA = right
ascension. Lines are undefined where cos(φ)·tan(δ) makes the tangent blow up
(planets near the celestial poles at extreme latitudes) — we return None.

This module computes the MC longitude (straight line) and, per latitude band,
the ASC/DSC longitudes (curved). It is pure math given the planet's RA/Dec
and the birth UTC (for GMST).
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass(frozen=True)
class PlanetaryLine:
    """One angle line for a planet at a given latitude band."""
    planet: str
    angle: str               # "MC" | "IC" | "ASC" | "DSC"
    latitude_deg: float      # the latitude this longitude applies at
    longitude_deg: float     # the longitude where the planet is on this angle


def _gmst_hours(utc: datetime) -> float:
    """Greenwich Mean Sidereal Time in hours [0, 24), via Meeus eq.12.4.

    Standard form: θ₀ = 0.06570982441908 × D + 1.00273790935 × UT + 0.000026·T²
    where D = days since J2000.0 at 0h UT of the date, UT = universal time hours.
    """
    dt = utc
    # Julian Day at 0h UT of the given date.
    a = (14 - dt.month) // 12
    y = dt.year + 4800 - a
    m = dt.month + 12 * a - 3
    jd0 = (dt.day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400
           - 32045)
    d = (jd0 - 0.5) - 2451545.0    # JD at 0h UT minus J2000.0 epoch (noon-based JD)
    ut_hours = dt.hour + dt.minute / 60.0 + dt.second / 3600.0
    t = d / 36525.0
    gmst = (6.697374558
            + 0.06570982441908 * d
            + 1.00273790935 * ut_hours
            + 0.000026 * t * t)
    return gmst % 24.0


def mc_line_longitude(planet: str, ra_deg: float, utc: datetime) -> float:
    """The longitude where the planet culminates (on the MC) — a straight line.

    longitude = (GMST × 15° − RA) mod 360.
    """
    gmst_lng = _gmst_hours(utc) * 15.0
    return (gmst_lng - ra_deg) % 360.0


def ic_line_longitude(planet: str, ra_deg: float, utc: datetime) -> float:
    """The longitude where the planet anti-culminates (on the IC)."""
    return (mc_line_longitude(planet, ra_deg, utc) + 180.0) % 360.0


def asc_line_longitude(planet: str, ra_deg: float, dec_deg: float,
                       latitude_deg: float, utc: datetime) -> Optional[float]:
    """The longitude where the planet rises (on the ASC) at a given latitude.

    Returns None where the planet never rises at that latitude (circumpolar).
    """
    phi = math.radians(latitude_deg)
    delta = math.radians(dec_deg)
    cos_phi = math.cos(phi)
    tan_delta = math.tan(delta)
    denom = cos_phi * tan_delta
    # If |denom| is too small, the line is undefined at this latitude.
    if abs(denom) < 1e-9:
        return None
    # Admissible hemisphere check: planet must rise/set at this latitude.
    cos_h = -math.tan(phi) * tan_delta
    if abs(cos_h) > 1.0:
        return None  # circumpolar — never rises or sets
    h_rising = math.acos(cos_h)   # hour angle at rising (negative of setting convention)
    mc_lng = mc_line_longitude(planet, ra_deg, utc)
    # At rising, the local hour angle H = +h_rising (planet east of meridian).
    # Longitude where planet is on ASC = MC_longitude − H_degrees.
    h_deg = math.degrees(h_rising)
    return (mc_lng - h_deg) % 360.0


def dsc_line_longitude(planet: str, ra_deg: float, dec_deg: float,
                       latitude_deg: float, utc: datetime) -> Optional[float]:
    """The longitude where the planet sets (on the DSC) at a given latitude."""
    phi = math.radians(latitude_deg)
    delta = math.radians(dec_deg)
    cos_h = -math.tan(phi) * math.tan(delta)
    if abs(cos_h) > 1.0:
        return None
    h_setting = -math.acos(cos_h)  # hour angle at setting (negative)
    mc_lng = mc_line_longitude(planet, ra_deg, utc)
    h_deg = math.degrees(h_setting)
    return (mc_lng - h_deg) % 360.0


def planetary_lines(
    planet: str, ra_deg: float, dec_deg: float, utc: datetime,
    latitudes: tuple[float, ...] = (-60, -30, 0, 30, 60),
) -> list[PlanetaryLine]:
    """Compute all four angle lines for a planet across latitude bands.

    MC/IC are straight (same longitude at every latitude); ASC/DSC curve with
    latitude. Returns a flat list of PlanetaryLine points for map rendering.
    """
    lines: list[PlanetaryLine] = []
    mc = mc_line_longitude(planet, ra_deg, utc)
    ic = ic_line_longitude(planet, ra_deg, utc)
    for lat in latitudes:
        lines.append(PlanetaryLine(planet, "MC", lat, mc))
        lines.append(PlanetaryLine(planet, "IC", lat, ic))
        asc = asc_line_longitude(planet, ra_deg, dec_deg, lat, utc)
        if asc is not None:
            lines.append(PlanetaryLine(planet, "ASC", lat, asc))
        dsc = dsc_line_longitude(planet, ra_deg, dec_deg, lat, utc)
        if dsc is not None:
            lines.append(PlanetaryLine(planet, "DSC", lat, dsc))
    return lines
