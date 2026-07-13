"""Astro adapter: skyfield-backed ephemeris provider.

Wraps the skyfield library to compute ecliptic longitudes of planets for a
given UTC instant + observer location. This is the OUTER ring — the only
module that imports skyfield.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Protocol

from services.astro_engine.domain.chart import PlanetPosition
from services.astro_engine.domain.constants import HouseSystem, Planet


# --------------------------------------------------------------------------- #
# Port
# --------------------------------------------------------------------------- #
class EphemerisProvider(Protocol):
    """Returns planet positions for an instant + observer."""

    def positions(
        self, utc: datetime, lat: float, lng: float,
        planets: tuple[Planet, ...],
    ) -> tuple[PlanetPosition, ...]:
        ...  # pragma: no cover


class HouseProvider(Protocol):
    """Returns the 12 house cusps + angles."""

    def houses(
        self, utc: datetime, lat: float, lng: float, system: HouseSystem,
    ) -> "tuple":
        ...  # pragma: no cover


# --------------------------------------------------------------------------- #
# Skyfield implementation
# --------------------------------------------------------------------------- #
_PLANET_SKYFIELD_KEY: dict[Planet, str] = {
    Planet.SUN: "sun",
    Planet.MOON: "moon",
    Planet.MERCURY: "MERCURY BARYCENTER",
    Planet.VENUS: "VENUS BARYCENTER",
    Planet.MARS: "MARS BARYCENTER",
    Planet.JUPITER: "JUPITER BARYCENTER",
    Planet.SATURN: "SATURN BARYCENTER",
    Planet.URANUS: "URANUS BARYCENTER",
    Planet.NEPTUNE: "NEPTUNE BARYCENTER",
    Planet.PLUTO: "PLUTO BARYCENTER",
}


class SkyfieldEphemeris:
    """EphemerisProvider implementation backed by NASA JPL ephemeris (DE421).

    Loads the ephemeris file on first use (cached by skyfield in ~/.skyfield).
    """

    def __init__(self, ephemeris_file: str = "de421.bsp") -> None:
        from skyfield.api import load
        self._load = load
        self._eph = None
        self._ephemeris_file = ephemeris_file
        self._ts = None

    def _ensure_loaded(self) -> None:
        if self._eph is None:
            self._eph = self._load(self._ephemeris_file)
            self._ts = self._load.timescale()

    def positions(
        self, utc: datetime, lat: float, lng: float,
        planets: tuple[Planet, ...],
    ) -> tuple[PlanetPosition, ...]:
        self._ensure_loaded()
        t = self._ts.from_datetime(utc.replace(tzinfo=__import__("datetime").timezone.utc)
                                   if utc.tzinfo is None else utc)
        earth = self._eph["earth"]
        observer = earth + self._load("wgs84.latlon")(lat, lng)

        out: list[PlanetPosition] = []
        for planet in planets:
            key = _PLANET_SKYFIELD_KEY.get(planet)
            if key is None:
                continue  # nodes/chiron handled elsewhere
            body = self._eph[key]
            astrometric = observer.at(t).observe(body)
            elat, elong, _ = astrometric.ecliptic_latlon()
            # apparent velocity — skyfield gives via .apparent() but ecliptic
            # speed requires a small step; use the .apparent radec difference.
            try:
                speed = self._daily_speed(t, observer, body)
            except Exception:
                speed = 0.0
            out.append(PlanetPosition(
                planet=planet,
                longitude_deg=elong.degrees % 360.0,
                latitude_deg=elat.degrees,
                speed_deg_per_day=speed,
            ))
        return tuple(out)

    def _daily_speed(self, t, observer, body) -> float:
        """Approximate ecliptic longitude speed (deg/day) by finite difference."""
        from skyfield.api import load
        ts = self._ts
        # half-day step
        t0 = ts.tt(t.tt - 0.5)
        t1 = ts.tt(t.tt + 0.5)
        e0 = observer.at(t0).observe(body)
        e1 = observer.at(t1).observe(body)
        _, lo0, _ = e0.ecliptic_latlon()
        _, lo1, _ = e1.ecliptic_latlon()
        d = (lo1.degrees - lo0.degrees) % 360.0
        if d > 180:
            d -= 360
        return d


# --------------------------------------------------------------------------- #
# Whole-Sign houses (the simplest, robust-to-unknown-time system)
# --------------------------------------------------------------------------- #
def whole_sign_houses(ascendant_deg: float) -> "tuple":
    """Compute Whole-Sign house cusps. Each house = one sign starting from
    the Ascendant's sign."""
    from services.astro_engine.domain.chart import HouseCusps, Angles
    sign_start = (ascendant_deg // 30) * 30
    cusps = tuple((sign_start + i * 30) % 360 for i in range(12))
    mc = (ascendant_deg + 270) % 360  # rough MC for Whole Sign
    return cusps, Angles(
        ascendant_deg=ascendant_deg,
        midheaven_deg=mc,
        descendant_deg=(ascendant_deg + 180) % 360,
        imum_coeli_deg=(mc + 180) % 360,
    )


def placidus_houses(utc: datetime, lat: float, lng: float, ascendant_deg: float,
                    mc_deg: float) -> "tuple":
    """Compute Placidus cusps. Requires precise Ascendant + MC (which come
    from the observer's location). For a production-grade Placidus one needs
    the full algorithm (Koch/Placidus iterative); here we approximate using
    MC as 10th cusp and Asc as 1st, deriving the others by interpolation.
    """
    from services.astro_engine.domain.chart import HouseCusps, Angles
    # 10th = MC, 11th, 12th approximated by equal steps in right ascension.
    # 1st = Asc, 2nd, 3rd mirrored. This is a known simplification.
    c10 = mc_deg
    c11 = (c10 + 30) % 360
    c12 = (c10 + 60) % 360
    c1 = ascendant_deg
    c2 = (c1 + 30) % 360
    c3 = (c1 + 60) % 360
    c4 = (c1 + 180) % 360
    c5 = (c11 + 180) % 360
    c6 = (c12 + 180) % 360
    c7 = (c1 + 180) % 360
    c8 = (c2 + 180) % 360
    c9 = (c3 + 180) % 360
    cusps = (c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12)
    return cusps, Angles(
        ascendant_deg=ascendant_deg,
        midheaven_deg=mc_deg,
        descendant_deg=c7,
        imum_coeli_deg=c4,
    )
