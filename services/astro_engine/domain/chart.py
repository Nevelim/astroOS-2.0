"""Astro domain: chart entities — planet positions, houses, aspects, natal chart."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from services.astro_engine.domain.constants import (
    HouseSystem,
    Modality,
    Planet,
    Sign,
    Element,
    SIGN_ELEMENT,
    SIGN_GLYPH,
    SIGN_MODALITY,
    degree_in_sign,
    sign_from_longitude,
)


@dataclass(frozen=True)
class PlanetPosition:
    """Position of one celestial body in the natal chart."""

    planet: Planet
    longitude_deg: float         # 0–360 ecliptic longitude (tropical)
    latitude_deg: float = 0.0    # ecliptic latitude
    speed_deg_per_day: float = 0.0   # for retrograde detection
    house: Optional[int] = None  # 1–12 (None if not assigned)

    @property
    def sign(self) -> Sign:
        return sign_from_longitude(self.longitude_deg)

    @property
    def degree_in_sign(self) -> float:
        return degree_in_sign(self.longitude_deg)

    @property
    def retrograde(self) -> bool:
        return self.speed_deg_per_day < 0.0

    @property
    def element(self) -> Element:
        return SIGN_ELEMENT[self.sign]

    @property
    def modality(self) -> Modality:
        return SIGN_MODALITY[self.sign]

    def glyph_summary(self) -> str:
        glyph = SIGN_GLYPH[self.sign]
        d = int(self.degree_in_sign)
        r = "℞" if self.retrograde else ""
        return f"{self.planet.value} {d}° {glyph}{r}"


@dataclass(frozen=True)
class HouseCusps:
    """The 12 house cusp positions in degrees. cusps[0] = 1st house cusp."""

    system: HouseSystem
    cusps: tuple[float, ...]   # exactly 12 entries, 0–360

    def __post_init__(self) -> None:
        if len(self.cusps) != 12:
            raise ValueError(f"need 12 cusps, got {len(self.cusps)}")

    def house_of(self, longitude_deg: float) -> int:
        """Return the house number (1–12) containing the given longitude."""
        c = self.cusps
        for i in range(12):
            start = c[i]
            end = c[(i + 1) % 12]
            if start <= end:
                if start <= longitude_deg < end:
                    return i + 1
            else:  # wraps
                if longitude_deg >= start or longitude_deg < end:
                    return i + 1
        return 12  # fallback


@dataclass(frozen=True)
class Angles:
    """The four cardinal points of the chart."""

    ascendant_deg: float     # 1st house cusp (rising)
    midheaven_deg: float     # MC (10th house cusp, culmination)
    descendant_deg: float    # 7th house cusp (setting)
    imum_coeli_deg: float    # IC (4th house cusp, nadir)


@dataclass(frozen=True)
class Aspect:
    """An aspect between two planets."""

    type: "AspectType"  # noqa: F821 (forward ref to constants.AspectType)
    angle: float
    orb: float
    harmonious: bool


@dataclass(frozen=True)
class NatalChart:
    """Complete natal chart: planets, houses, angles, aspects."""

    positions: tuple[PlanetPosition, ...]
    houses: HouseCusps
    angles: Angles
    aspects: tuple[Aspect, ...] = ()
    engine_version: str = "1.0.0"

    def position(self, planet: Planet) -> Optional[PlanetPosition]:
        for p in self.positions:
            if p.planet == planet:
                return p
        return None

    def sun(self) -> PlanetPosition:
        p = self.position(Planet.SUN)
        if p is None:
            raise ValueError("sun position missing")
        return p
