"""Astro domain: zodiac signs, planets, houses, aspects — Western astrology constants.

Pure reference data with no I/O. The classical tropical zodiac (0° = vernal
equinox). Sign boundaries at exact 30° increments from Aries 0°.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


# --------------------------------------------------------------------------- #
# Zodiac signs (тропический зодиак)
# --------------------------------------------------------------------------- #
class Sign(str, Enum):
    ARIES = "aries"            # Овен ♈   0–30°
    TAURUS = "taurus"          # Телец ♉  30–60°
    GEMINI = "gemini"          # Близнецы ♊
    CANCER = "cancer"          # Рак ♋
    LEO = "leo"                # Лев ♌
    VIRGO = "virgo"            # Дева ♍
    LIBRA = "libra"            # Весы ♎
    SCORPIO = "scorpio"        # Скорпион ♏
    SAGITTARIUS = "sagittarius"# Стрелец ♐
    CAPRICORN = "capricorn"    # Козерог ♑
    AQUARIUS = "aquarius"      # Водолей ♒
    PISCES = "pisces"          # Рыбы ♓


SIGNS: tuple[Sign, ...] = (
    Sign.ARIES, Sign.TAURUS, Sign.GEMINI, Sign.CANCER, Sign.LEO, Sign.VIRGO,
    Sign.LIBRA, Sign.SCORPIO, Sign.SAGITTARIUS, Sign.CAPRICORN, Sign.AQUARIUS, Sign.PISCES,
)

SIGN_GLYPH: dict[Sign, str] = {
    Sign.ARIES: "♈", Sign.TAURUS: "♉", Sign.GEMINI: "♊", Sign.CANCER: "♋",
    Sign.LEO: "♌", Sign.VIRGO: "♍", Sign.LIBRA: "♎", Sign.SCORPIO: "♏",
    Sign.SAGITTARIUS: "♐", Sign.CAPRICORN: "♑", Sign.AQUARIUS: "♒", Sign.PISCES: "♓",
}

# Element + polarity for each sign
class Element(str, Enum):
    FIRE = "fire"
    EARTH = "earth"
    AIR = "air"
    WATER = "water"


class Modality(str, Enum):
    CARDINAL = "cardinal"
    FIXED = "fixed"
    MUTABLE = "mutable"


SIGN_ELEMENT: dict[Sign, Element] = {
    Sign.ARIES: Element.FIRE, Sign.LEO: Element.FIRE, Sign.SAGITTARIUS: Element.FIRE,
    Sign.TAURUS: Element.EARTH, Sign.VIRGO: Element.EARTH, Sign.CAPRICORN: Element.EARTH,
    Sign.GEMINI: Element.AIR, Sign.LIBRA: Element.AIR, Sign.AQUARIUS: Element.AIR,
    Sign.CANCER: Element.WATER, Sign.SCORPIO: Element.WATER, Sign.PISCES: Element.WATER,
}

SIGN_MODALITY: dict[Sign, Modality] = {
    Sign.ARIES: Modality.CARDINAL, Sign.CANCER: Modality.CARDINAL,
    Sign.LIBRA: Modality.CARDINAL, Sign.CAPRICORN: Modality.CARDINAL,
    Sign.TAURUS: Modality.FIXED, Sign.LEO: Modality.FIXED,
    Sign.SCORPIO: Modality.FIXED, Sign.AQUARIUS: Modality.FIXED,
    Sign.GEMINI: Modality.MUTABLE, Sign.VIRGO: Modality.MUTABLE,
    Sign.SAGITTARIUS: Modality.MUTABLE, Sign.PISCES: Modality.MUTABLE,
}


def sign_from_longitude(longitude_deg: float) -> Sign:
    """Return the tropical zodiac sign for an ecliptic longitude in degrees.

    0° = Aries 0°. 360° maps to 12 signs of 30° each.
    """
    if not (0.0 <= longitude_deg < 360.0):
        longitude_deg = longitude_deg % 360.0
    return SIGNS[int(longitude_deg // 30)]


def degree_in_sign(longitude_deg: float) -> float:
    """The degree within the current sign (0.0–29.999)."""
    return longitude_deg % 30.0


# --------------------------------------------------------------------------- #
# Planets / celestial bodies
# --------------------------------------------------------------------------- #
class Planet(str, Enum):
    SUN = "sun"
    MOON = "moon"
    MERCURY = "mercury"
    VENUS = "venus"
    MARS = "mars"
    JUPITER = "jupiter"
    SATURN = "saturn"
    URANUS = "uranus"
    NEPTUNE = "neptune"
    PLUTO = "pluto"
    NORTH_NODE = "north_node"   # Rahu
    CHIRON = "chiron"


PLANETS: tuple[Planet, ...] = (
    Planet.SUN, Planet.MOON, Planet.MERCURY, Planet.VENUS, Planet.MARS,
    Planet.JUPITER, Planet.SATURN, Planet.URANUS, Planet.NEPTUNE, Planet.PLUTO,
)

PLANET_GLYPH: dict[Planet, str] = {
    Planet.SUN: "☉", Planet.MOON: "☽", Planet.MERCURY: "☿", Planet.VENUS: "♀",
    Planet.MARS: "♂", Planet.JUPITER: "♃", Planet.SATURN: "♄",
    Planet.URANUS: "♅", Planet.NEPTUNE: "♆", Planet.PLUTO: "♇",
    Planet.NORTH_NODE: "☊", Planet.CHIRON: "⚷",
}


# --------------------------------------------------------------------------- #
# Aspects ( major Ptolemaic)
# --------------------------------------------------------------------------- #
class AspectType(str, Enum):
    CONJUNCTION = "conjunction"   # 0°   ☌
    OPPOSITION = "opposition"     # 180° ☍
    TRINE = "trine"               # 120° △
    SQUARE = "square"             # 90°  □
    SEXTILE = "sextile"           # 60°  ⚹


@dataclass(frozen=True)
class AspectSpec:
    type: AspectType
    angle: float
    orb: float          # max orb in degrees for a "tight" aspect
    harmonious: bool


ASPECTS: tuple[AspectSpec, ...] = (
    AspectSpec(AspectType.CONJUNCTION, 0.0, 8.0, True),
    AspectSpec(AspectType.OPPOSITION, 180.0, 8.0, False),
    AspectSpec(AspectType.TRINE, 120.0, 7.0, True),
    AspectSpec(AspectType.SQUARE, 90.0, 7.0, False),
    AspectSpec(AspectType.SEXTILE, 60.0, 6.0, True),
)


def angular_distance(a_deg: float, b_deg: float) -> float:
    """Smallest angular distance between two ecliptic longitudes, 0–180°."""
    d = abs(a_deg - b_deg) % 360.0
    return min(d, 360.0 - d)


def find_aspect(a_deg: float, b_deg: float) -> "Aspect | None":
    """Return the strongest aspect between two longitudes, or None."""
    from services.astro_engine.domain.chart import Aspect  # avoid cycle
    dist = angular_distance(a_deg, b_deg)
    best: AspectSpec | None = None
    best_diff = 999.0
    for spec in ASPECTS:
        diff = abs(dist - spec.angle)
        if diff <= spec.orb and diff < best_diff:
            best = spec
            best_diff = diff
    if best is None:
        return None
    return Aspect(
        type=best.type,
        angle=best.angle,
        orb=round(best_diff, 2),
        harmonious=best.harmonious,
    )


# --------------------------------------------------------------------------- #
# House systems
# --------------------------------------------------------------------------- #
class HouseSystem(str, Enum):
    PLACIDUS = "placidus"
    WHOLE_SIGN = "whole_sign"
