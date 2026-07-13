"""Astro use case: build a natal chart from birth facts."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from services.astro_engine.domain.chart import (
    Angles, Aspect, HouseCusps, NatalChart, PlanetPosition,
)
from services.astro_engine.domain.compute import (
    EphemerisProvider, placidus_houses, whole_sign_houses,
)
from services.astro_engine.domain.constants import (
    ASPECTS, AspectSpec, AspectType, HouseSystem, Planet, find_aspect,
)
from services.bazi_engine.adapter.solar_terms import BirthFacts


@dataclass
class BuildNatalChart:
    ephemeris: EphemerisProvider

    def execute(
        self,
        facts: BirthFacts,
        utc: datetime,
        lat: float,
        lng: float,
        house_system: HouseSystem = HouseSystem.WHOLE_SIGN,
        ascendant_deg: Optional[float] = None,
        mc_deg: Optional[float] = None,
    ) -> NatalChart:
        planets = tuple(Planet)  # all 10 + nodes + chiron handled by provider
        positions = self.ephemeris.positions(utc, lat, lng, planets)

        # Compute houses.
        if ascendant_deg is None:
            ascendant_deg = self._estimate_ascendant(utc, lat, lng)
        if mc_deg is None:
            mc_deg = (ascendant_deg + 270) % 360

        if house_system == HouseSystem.WHOLE_SIGN:
            cusps, angles = whole_sign_houses(ascendant_deg)
        else:
            cusps, angles = placidus_houses(utc, lat, lng, ascendant_deg, mc_deg)
        houses = HouseCusps(system=house_system, cusps=cusps)

        # Assign houses to planets.
        positioned: list[PlanetPosition] = []
        for p in positions:
            h = houses.house_of(p.longitude_deg)
            positioned.append(PlanetPosition(
                planet=p.planet, longitude_deg=p.longitude_deg,
                latitude_deg=p.latitude_deg,
                speed_deg_per_day=p.speed_deg_per_day, house=h,
            ))

        # Aspects: scan all planet pairs.
        aspects = self._compute_aspects(tuple(positioned))

        return NatalChart(
            positions=tuple(positioned),
            houses=houses, angles=angles, aspects=tuple(aspects),
        )

    @staticmethod
    def _compute_aspects(positions: tuple[PlanetPosition, ...]) -> list[Aspect]:
        out: list[Aspect] = []
        for i, a in enumerate(positions):
            for b in positions[i + 1:]:
                asp = find_aspect(a.longitude_deg, b.longitude_deg)
                if asp is not None:
                    out.append(asp)
        return out

    @staticmethod
    def _estimate_ascendant(utc: datetime, lat: float, lng: float) -> float:
        """Rough Ascendant estimate from local sidereal time + latitude.

        Production code uses the full topocentric formula; for the service
        this approximation (±a few degrees) is acceptable when the user does
        not have exact time, and the real Asc is computed by the BFF when
        time_quality is EXACT.
        """
        import math
        # Compute local sidereal time (degrees) from UTC.
        from datetime import timezone
        if utc.tzinfo is None:
            utc = utc.replace(tzinfo=timezone.utc)
        jd = utc.toordinal() + 1721424.5 + (
            (utc.hour + utc.minute / 60 + utc.second / 3600) / 24
        )
        # Greenwich sidereal time in degrees (Meeus 12.4, simplified).
        t = (jd - 2451545.0) / 36525.0
        gst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) \
              + 0.000387933 * t * t - (t ** 3) / 38710000
        gst = gst % 360
        lst = (gst + lng) % 360  # local sidereal time
        # Ascendant ≈ arctan2(cos(lst), sin(lst) * cos(obl) + tan(lat) * sin(obl))
        obl = 23.44 * math.pi / 180
        lat_r = lat * math.pi / 180
        lst_r = lst * math.pi / 180
        asc = math.atan2(
            math.cos(lst_r),
            math.sin(lst_r) * math.cos(obl) + math.tan(lat_r) * math.sin(obl),
        )
        return (math.degrees(asc) + 360) % 360
