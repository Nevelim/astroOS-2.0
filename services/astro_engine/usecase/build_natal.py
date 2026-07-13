"""Astro use case: build a natal chart from birth facts.

Orchestrates the ephemeris adapter (planet positions) with pure domain math
(angles, houses, aspects). Returns an immutable NatalChart.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Protocol

from services.astro_engine.domain.chart import (
    NatalChart,
    PlanetPosition,
    compute_angles,
    compute_aspects,
    placidus_houses,
    whole_sign_houses,
)
from services.astro_engine.domain.constants import HouseSystem, Planet
from services.bazi_engine.adapter.solar_terms import BirthFacts


class EphemerisProvider(Protocol):
    def positions(
        self, utc: datetime, lat: float, lng: float,
        planets: tuple[Planet, ...] = ...,
    ) -> tuple[PlanetPosition, ...]:
        ...  # pragma: no cover


@dataclass
class BuildNatalChart:
    ephemeris: EphemerisProvider

    def execute(
        self,
        utc: datetime,
        lat: float,
        lng: float,
        house_system: HouseSystem = HouseSystem.WHOLE_SIGN,
    ) -> NatalChart:
        planets = self.ephemeris.positions(utc, lat, lng)
        angles = compute_angles(utc, lat, lng)
        if house_system == HouseSystem.PLACIDUS:
            houses = placidus_houses(utc, lat, lng, angles=angles)
        else:
            houses = whole_sign_houses(angles)
        aspects = compute_aspects(planets)
        return NatalChart(
            birth_utc=utc,
            latitude=lat,
            longitude=lng,
            house_system=house_system,
            planets=planets,
            houses=houses,
            aspects=aspects,
        )
