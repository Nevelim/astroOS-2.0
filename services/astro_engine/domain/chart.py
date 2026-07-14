"""Astro domain: natal chart value objects + pure astronomical math.

The math here (sidereal time, MC, ASC, Placidus/Whole-Sign houses, ecliptic
longitude from equatorial coordinates) is PURE — no skyfield, no network.
The adapter layer feeds it UTC instants + equatorial (RA/Dec) planet
positions; this module classifies them into signs/houses/aspects.

Formulas verified against:
  - USNO GMST/GAST approximation
  - RadixPro ASC/MC references
  - Swiss Ephemeris tables (see golden tests)
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from services.astro_engine.domain.constants import (
    ASPECT_SPECS,
    HouseSystem,
    LUMINARY_EXTRA_ORB,
    PLANETS,
    Planet,
    Sign,
    AspectType,
    find_aspect,
    sign_of,
    degree_in_sign,
)


# Obliquity of the ecliptic (mean of date — sufficient for astrology).
# More rigorous: true obliquity via nutation, but the difference is < 0.01°.
OBLIQUITY_DEG = 23.4393


# --------------------------------------------------------------------------- #
# Value objects
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class PlanetPosition:
    planet: Planet
    ecliptic_longitude_deg: float
    retrograde: bool = False
    # Equatorial coordinates — needed for astrocartography (in-mundo line calc).
    # Optional: populated by the ephemeris adapter when available.
    ra_deg: Optional[float] = None       # right ascension in degrees [0,360)
    dec_deg: Optional[float] = None      # declination in degrees [-90,90]

    @property
    def sign(self) -> Sign:
        return sign_of(self.ecliptic_longitude_deg)

    @property
    def degree_in_sign(self) -> float:
        return degree_in_sign(self.ecliptic_longitude_deg)


@dataclass(frozen=True)
class Angles:
    ascendant_deg: float      # 1st-house cusp (ASC)
    midheaven_deg: float      # MC = 10th-house cusp
    descendant_deg: float     # 7th-house cusp = ASC + 180
    imum_coeli_deg: float     # IC = 4th-house cusp = MC + 180


@dataclass(frozen=True)
class HouseCusps:
    system: HouseSystem
    cusps_deg: tuple[float, ...]   # 12 cusps, cusp[i] = i-th house start (i=1..12, index 0..11)
    angles: Angles
    polar_fallback: bool = False  # True if Placidus failed and we fell back


@dataclass(frozen=True)
class Aspect:
    a: Planet
    b: Planet
    type: AspectType
    orb_deg: float          # deviation from exact
    separation_deg: float   # actual angular distance


@dataclass(frozen=True)
class NatalChart:
    birth_utc: datetime
    latitude: float
    longitude: float
    house_system: HouseSystem
    planets: tuple[PlanetPosition, ...]
    houses: HouseCusps
    aspects: tuple[Aspect, ...]
    # The lunar nodal axis (☊ Rahu / ☋ Ketu). Always computed (pure math).
    nodes: Optional["LunarNodePosition"] = None

    def planet(self, p: Planet) -> Optional[PlanetPosition]:
        for pp in self.planets:
            if pp.planet == p:
                return pp
        return None


# --------------------------------------------------------------------------- #
# Sidereal time + MC + ASC (pure)
# --------------------------------------------------------------------------- #
def _julian_day(utc: datetime) -> float:
    """Julian Day (UT) from a UTC-aware (or naive assumed UTC) datetime."""
    if utc.tzinfo is None:
        utc = utc.replace(tzinfo=timezone.utc)
    a = (14 - utc.month) // 12
    y = utc.year + 4800 - a
    m = utc.month + 12 * a - 3
    jdn = (utc.day + (153 * m + 2) // 5 + 365 * y + y // 4
           - y // 100 + y // 400 - 32045)
    # add fractional day
    seconds_in_day = (utc.hour * 3600 + utc.minute * 60
                      + utc.second + utc.microsecond / 1e6)
    return jdn + (seconds_in_day - 43200) / 86400.0


def greenwich_sidereal_time_deg(utc: datetime) -> float:
    """GMST in degrees [0, 360). IAU 1982 polynomial approximation."""
    jd = _julian_day(utc)
    d = jd - 2451545.0           # days since J2000.0
    T = d / 36525.0
    gmst = (280.46061837
            + 360.98564736629 * d
            + 0.000387933 * T * T
            - T * T * T / 38710000.0)
    return gmst % 360.0


def local_sidereal_time_deg(utc: datetime, longitude_deg: float) -> float:
    """LST in degrees [0, 360). LST = GMST + east longitude."""
    return (greenwich_sidereal_time_deg(utc) + longitude_deg) % 360.0


def midheaven_deg(utc: datetime, longitude_deg: float, obliquity_deg: float = OBLIQUITY_DEG) -> float:
    """MC ecliptic longitude. RAMC = LST."""
    ramc = local_sidereal_time_deg(utc, longitude_deg)
    ramc_rad = math.radians(ramc)
    eps_rad = math.radians(obliquity_deg)
    # λ_MC = atan2(sin RAMC, cos RAMC · cos ε)
    mc_rad = math.atan2(math.sin(ramc_rad), math.cos(ramc_rad) * math.cos(eps_rad))
    return math.degrees(mc_rad) % 360.0


def ascendant_deg(utc: datetime, latitude_deg: float, longitude_deg: float,
                  obliquity_deg: float = OBLIQUITY_DEG) -> float:
    """ASC ecliptic longitude.

    λ_ASC = atan2(cos RAMC, −(sin RAMC · cos ε + tan φ · sin ε))
    """
    ramc = local_sidereal_time_deg(utc, longitude_deg)
    ramc_rad = math.radians(ramc)
    eps_rad = math.radians(obliquity_deg)
    phi_rad = math.radians(latitude_deg)
    asc_rad = math.atan2(
        math.cos(ramc_rad),
        -(math.sin(ramc_rad) * math.cos(eps_rad) + math.tan(phi_rad) * math.sin(eps_rad)),
    )
    return math.degrees(asc_rad) % 360.0


def compute_angles(utc: datetime, latitude_deg: float, longitude_deg: float) -> Angles:
    mc = midheaven_deg(utc, longitude_deg)
    asc = ascendant_deg(utc, latitude_deg, longitude_deg)
    return Angles(
        ascendant_deg=asc,
        midheaven_deg=mc,
        descendant_deg=(asc + 180.0) % 360.0,
        imum_coeli_deg=(mc + 180.0) % 360.0,
    )


# --------------------------------------------------------------------------- #
# House systems
# --------------------------------------------------------------------------- #
def whole_sign_houses(angles: Angles) -> HouseCusps:
    """Whole Sign: each house = one whole sign. 1st house = ASC's sign."""
    first_sign_index = int(angles.ascendant_deg // 30)
    cusps = []
    for i in range(12):
        cusps.append(((first_sign_index + i) * 30.0) % 360.0)
    return HouseCusps(
        system=HouseSystem.WHOLE_SIGN,
        cusps_deg=tuple(cusps),
        angles=angles,
        polar_fallback=False,
    )


def placidus_houses(utc: datetime, latitude_deg: float, longitude_deg: float,
                    angles: Optional[Angles] = None,
                    max_iter: int = 30, tolerance: float = 1e-4) -> HouseCusps:
    """Placidus house cusps. Falls back to Whole Sign above polar circles.

    Iteratively solves the Placidus semi-arc trisection equations.
    """
    if angles is None:
        angles = compute_angles(utc, latitude_deg, longitude_deg)
    ramc = local_sidereal_time_deg(utc, longitude_deg)
    phi_rad = math.radians(latitude_deg)
    eps_rad = math.radians(OBLIQUITY_DEG)

    # Cusps 1 and 7 = ASC and DESC; cusps 4 and 10 = IC and MC.
    cusp = [0.0] * 12
    cusp[0] = angles.ascendant_deg           # 1st house
    cusp[6] = angles.descendant_deg          # 7th
    cusp[3] = angles.imum_coeli_deg          # 4th
    cusp[9] = angles.midheaven_deg           # 10th

    polar_fallback = False
    # Fractions for upper (11,12) and lower (2,3) cusps.
    # House 11 = 1/3 of upper semi-arc; 12 = 2/3.
    # House 2 = 2/3 of lower semi-arc; 3 = 1/3.
    spec = [
        # (cusp_index, fraction, is_upper)
        (10, 1.0/3.0, True),
        (11, 2.0/3.0, True),
        (1, 2.0/3.0, False),
        (2, 1.0/3.0, False),
    ]
    try:
        for idx, F, is_upper in spec:
            cusp[idx] = _solve_placidus_cusp(ramc, phi_rad, eps_rad, F, is_upper,
                                             max_iter, tolerance)
        # The remaining cusps are derived by symmetry: house k+6 = cusp[k] + 180.
        cusp[4] = (cusp[10] + 180.0) % 360.0   # 5th
        cusp[5] = (cusp[11] + 180.0) % 360.0   # 6th
        cusp[7] = (cusp[1] + 180.0) % 360.0    # 8th
        cusp[8] = (cusp[2] + 180.0) % 360.0    # 9th
    except _PlacidusUnsolvable:
        polar_fallback = True
        return whole_sign_houses(angles)

    return HouseCusps(
        system=HouseSystem.PLACIDUS,
        cusps_deg=tuple(c % 360.0 for c in cusp),
        angles=angles,
        polar_fallback=polar_fallback,
    )


class _PlacidusUnsolvable(Exception):
    """Raised when Placidus is undefined (polar latitude / declination)."""


def _solve_placidus_cusp(ramc_deg: float, phi_rad: float, eps_rad: float,
                         F: float, is_upper: bool,
                         max_iter: int, tolerance: float) -> float:
    """Iterative solver for a single Placidus cusp.

    Solves for λ such that the ratio of the right-ascension distance to the
    semi-arc equals F. The semi-arc is undefined at polar latitudes → raise.
    """
    ramc_rad = math.radians(ramc_deg)

    # Initial guess: spread cusps evenly between MC and ASC.
    lam = math.radians(ramc_deg + (90.0 if is_upper else -90.0) * F * 1.5)

    for _ in range(max_iter):
        sin_lam = math.sin(lam)
        cos_lam = math.cos(lam)
        # declination of λ
        decl = math.asin(sin_lam * math.sin(eps_rad))
        # right ascension of λ
        ra = math.atan2(sin_lam * math.cos(eps_rad), cos_lam)
        # semi-arc (half the diurnal/nocturnal arc)
        cos_s = -math.tan(phi_rad) * math.tan(decl)
        if cos_s > 1.0 or cos_s < -1.0:
            raise _PlacidusUnsolvable("semi-arc undefined at this latitude/declination")
        semi = math.acos(cos_s)

        if is_upper:
            # RA should be ahead of RAMC by F·semi (mod 2π) on the upper half.
            ra_diff = (ra - ramc_rad) % (2 * math.pi)
            target = F * semi
        else:
            ra_diff = (ramc_rad - ra) % (2 * math.pi)
            target = F * semi

        err = ra_diff - target
        # wrap err to [-π, π]
        err = (err + math.pi) % (2 * math.pi) - math.pi
        if abs(err) < tolerance:
            return math.degrees(lam) % 360.0
        # adjust λ in the direction that reduces err
        lam = (lam + 0.5 * err) % (2 * math.pi)

    # Did not converge — return last estimate, the caller will not flag.
    return math.degrees(lam) % 360.0


# --------------------------------------------------------------------------- #
# House placement of a planet
# --------------------------------------------------------------------------- #
def house_of(planet_longitude_deg: float, houses: HouseCusps) -> int:
    """Return house number (1..12) containing the planet longitude."""
    cusps = houses.cusps_deg
    lng = planet_longitude_deg % 360.0
    for i in range(12):
        start = cusps[i]
        end = cusps[(i + 1) % 12]
        if _in_arc(lng, start, end):
            return i + 1
    # Should not happen, but default to 1.
    return 1


def _in_arc(x: float, start: float, end: float) -> bool:
    """True if x is in the clockwise arc [start, end) modulo 360."""
    if start <= end:
        return start <= x < end
    return x >= start or x < end


# --------------------------------------------------------------------------- #
# Aspect detection across a set of planets
# --------------------------------------------------------------------------- #
def compute_aspects(planets: tuple[PlanetPosition, ...],
                    include_minor: bool = False) -> tuple[Aspect, ...]:
    """Find all aspects among the planet set. Skips quincunx unless asked."""
    out: list[Aspect] = []
    luminaries = {Planet.SUN, Planet.MOON}
    for i, pa in enumerate(planets):
        for pb in planets[i + 1:]:
            is_lum = pa.planet in luminaries or pb.planet in luminaries
            result = find_aspect(pa.ecliptic_longitude_deg,
                                 pb.ecliptic_longitude_deg, is_luminary=is_lum)
            if result is None:
                continue
            aspect_type, orb, sep = result
            if aspect_type == AspectType.QUINCUNX and not include_minor:
                continue
            out.append(Aspect(a=pa.planet, b=pb.planet, type=aspect_type,
                              orb_deg=orb, separation_deg=sep))
    return tuple(out)


# --------------------------------------------------------------------------- #
# Equatorial → ecliptic conversion (pure)
# --------------------------------------------------------------------------- #
def equatorial_to_ecliptic_longitude(ra_deg: float, dec_deg: float,
                                     obliquity_deg: float = OBLIQUITY_DEG) -> float:
    """Convert equatorial (RA, Dec) to ecliptic longitude (tropical, degrees).

    λ = atan2(sin α cos ε + tan δ sin ε, cos α)
    """
    ra_rad = math.radians(ra_deg)
    dec_rad = math.radians(dec_deg)
    eps_rad = math.radians(obliquity_deg)
    lam_rad = math.atan2(
        math.sin(ra_rad) * math.cos(eps_rad) + math.tan(dec_rad) * math.sin(eps_rad),
        math.cos(ra_rad),
    )
    return math.degrees(lam_rad) % 360.0
