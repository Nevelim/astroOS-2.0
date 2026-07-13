"""Astro adapter: skyfield-backed ephemeris provider.

OUTER ring — the only module that imports skyfield. Loads the DE421 JPL
ephemeris (~16MB) and computes equatorial (RA, Dec) positions of the 10
planets for a UTC instant + observer. The domain's pure
equatorial_to_ecliptic_longitude() converts these to ecliptic longitudes.

DE421 covers 1900-2050 — sufficient for AstroOS (birth dates from ~1900 on).
For broader coverage swap in DE422/DE430.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Optional

from services.astro_engine.domain.chart import (
    PlanetPosition,
    equatorial_to_ecliptic_longitude,
)
from services.astro_engine.domain.constants import PLANETS, Planet


# skyfield body names within the DE421 ephemeris file.
_SKYFIELD_BODY: dict[Planet, str] = {
    Planet.SUN: "sun",
    Planet.MOON: "moon",
    Planet.MERCURY: "MERCURY",
    Planet.VENUS: "VENUS",
    Planet.MARS: "MARS",
    Planet.JUPITER: "JUPITER BARYCENTER",
    Planet.SATURN: "SATURN BARYCENTER",
    Planet.URANUS: "URANUS BARYCENTER",
    Planet.NEPTUNE: "NEPTUNE BARYCENTER",
    Planet.PLUTO: "PLUTO BARYCENTER",
}


class SkyfieldEphemeris:
    """EphemerisProvider implementation backed by NASA JPL DE421.

    Lazy-loads the ephemeris file on first use. Set ASTRO_EPH_FILE to swap.
    """

    def __init__(self, ephemeris_file: Optional[str] = None) -> None:
        self._ephemeris_file = ephemeris_file or os.environ.get(
            "ASTRO_EPH_FILE", "de421.bsp"
        )
        self._eph = None
        self._ts = None

    def _ensure_loaded(self) -> None:
        if self._eph is None:
            from skyfield.api import load
            if os.path.exists(self._ephemeris_file):
                self._eph = load(self._ephemeris_file)
            else:
                self._eph = load(self._ephemeris_file)  # skyfield downloads
            self._ts = load.timescale()

    def positions(
        self, utc: datetime, lat: float, lng: float,
        planets: tuple[Planet, ...] = PLANETS,
    ) -> tuple[PlanetPosition, ...]:
        """Compute ecliptic longitudes for the given planets at UTC + observer.

        Uses topocentric (apparent) coordinates from the observer's location.
        Returns positions in tropical ecliptic longitude [0, 360).
        """
        self._ensure_loaded()
        if utc.tzinfo is None:
            utc = utc.replace(tzinfo=timezone.utc)
        t = self._ts.from_datetime(utc)
        from skyfield.api import wgs84
        observer = wgs84.latlon(lat, lng)
        # Correct skyfield pattern: earth + observer → VectorSum with .at().observe()
        observer_frame = self._eph["earth"] + observer

        out: list[PlanetPosition] = []
        for planet in planets:
            body = self._eph[_SKYFIELD_BODY[planet]]
            apparent = observer_frame.at(t).observe(body).apparent()
            ra, dec, _distance = apparent.radec()  # RA hours, Dec degrees
            ecl_lng = equatorial_to_ecliptic_longitude(ra.degrees, dec.degrees)
            retro = self._is_retrograde(planet, utc, lat, lng)
            out.append(PlanetPosition(
                planet=planet, ecliptic_longitude_deg=ecl_lng, retrograde=retro
            ))
        return tuple(out)

    def _is_retrograde(self, planet: Planet, utc: datetime,
                       lat: float, lng: float) -> bool:
        """True if the planet's ecliptic longitude is decreasing day-over-day."""
        from datetime import timedelta
        now = self._longitude_only(planet, utc, lat, lng)
        later = self._longitude_only(planet, utc + timedelta(days=1), lat, lng)
        diff = (later - now) % 360.0
        return diff > 180.0

    def _longitude_only(self, planet: Planet, utc: datetime,
                        lat: float, lng: float) -> float:
        self._ensure_loaded()
        if utc.tzinfo is None:
            utc = utc.replace(tzinfo=timezone.utc)
        t = self._ts.from_datetime(utc)
        from skyfield.api import wgs84
        observer = wgs84.latlon(lat, lng)
        observer_frame = self._eph["earth"] + observer
        body = self._eph[_SKYFIELD_BODY[planet]]
        apparent = observer_frame.at(t).observe(body).apparent()
        ra, dec, _ = apparent.radec()
        return equatorial_to_ecliptic_longitude(ra.degrees, dec.degrees)
