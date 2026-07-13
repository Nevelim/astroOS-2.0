"""Astro domain constants: zodiac signs, planets, house systems, aspects.

Pure reference data — no time, no I/O, no ephemeris. Other domain modules
import these tables to classify ecliptic longitudes into signs, aspects, etc.
"""
from __future__ import annotations

from enum import Enum


# --------------------------------------------------------------------------- #
# Zodiac signs (тропический, 0° = Овен = весеннее равноденствие)
# --------------------------------------------------------------------------- #
class Sign(str, Enum):
    ARIES = "aries"           # Овен  ♈
    TAURUS = "taurus"         # Телец ♉
    GEMINI = "gemini"         # Близнецы ♊
    CANCER = "cancer"         # Рак ♋
    LEO = "leo"               # Лев ♌
    VIRGO = "virgo"           # Дева ♍
    LIBRA = "libra"           # Весы ♎
    SCORPIO = "scorpio"       # Скорпион ♏
    SAGITTARIUS = "sagittarius" # Стрелец ♐
    CAPRICORN = "capricorn"   # Козерог ♑
    AQUARIUS = "aquarius"     # Водолей ♒
    PISCES = "pisces"         # Рыбы ♓


SIGNS: tuple[Sign, ...] = tuple(Sign)
SIGN_HANZI: dict[Sign, str] = {}  # not used, kept for symmetry with BaZi
SIGN_SYMBOL: dict[Sign, str] = {
    Sign.ARIES: "♈", Sign.TAURUS: "♉", Sign.GEMINI: "♊", Sign.CANCER: "♋",
    Sign.LEO: "♌", Sign.VIRGO: "♍", Sign.LIBRA: "♎", Sign.SCORPIO: "♏",
    Sign.SAGITTARIUS: "♐", Sign.CAPRICORN: "♑", Sign.AQUARIUS: "♒", Sign.PISCES: "♓",
}
SIGN_NAME_RU: dict[Sign, str] = {
    Sign.ARIES: "Овен", Sign.TAURUS: "Телец", Sign.GEMINI: "Близнецы",
    Sign.CANCER: "Рак", Sign.LEO: "Лев", Sign.VIRGO: "Дева",
    Sign.LIBRA: "Весы", Sign.SCORPIO: "Скорпион", Sign.SAGITTARIUS: "Стрелец",
    Sign.CAPRICORN: "Козерог", Sign.AQUARIUS: "Водолей", Sign.PISCES: "Рыбы",
}


class Element(str, Enum):
    FIRE = "fire"
    EARTH = "earth"
    AIR = "air"
    WATER = "water"


SIGN_ELEMENT: dict[Sign, Element] = {
    Sign.ARIES: Element.FIRE, Sign.LEO: Element.FIRE, Sign.SAGITTARIUS: Element.FIRE,
    Sign.TAURUS: Element.EARTH, Sign.VIRGO: Element.EARTH, Sign.CAPRICORN: Element.EARTH,
    Sign.GEMINI: Element.AIR, Sign.LIBRA: Element.AIR, Sign.AQUARIUS: Element.AIR,
    Sign.CANCER: Element.WATER, Sign.SCORPIO: Element.WATER, Sign.PISCES: Element.WATER,
}


class Modality(str, Enum):
    CARDINAL = "cardinal"
    FIXED = "fixed"
    MUTABLE = "mutable"


SIGN_MODALITY: dict[Sign, Modality] = {
    Sign.ARIES: Modality.CARDINAL, Sign.CANCER: Modality.CARDINAL,
    Sign.LIBRA: Modality.CARDINAL, Sign.CAPRICORN: Modality.CARDINAL,
    Sign.TAURUS: Modality.FIXED, Sign.LEO: Modality.FIXED,
    Sign.SCORPIO: Modality.FIXED, Sign.AQUARIUS: Modality.FIXED,
    Sign.GEMINI: Modality.MUTABLE, Sign.VIRGO: Modality.MUTABLE,
    Sign.SAGITTARIUS: Modality.MUTABLE, Sign.PISCES: Modality.MUTABLE,
}


# --------------------------------------------------------------------------- #
# Planets / bodies (astrology "10" + nodes + Chiron)
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


PLANETS: tuple[Planet, ...] = tuple(Planet)
PLANET_SYMBOL: dict[Planet, str] = {
    Planet.SUN: "☉", Planet.MOON: "☽", Planet.MERCURY: "☿", Planet.VENUS: "♀",
    Planet.MARS: "♂", Planet.JUPITER: "♃", Planet.SATURN: "♄",
    Planet.URANUS: "♅", Planet.NEPTUNE: "♆", Planet.PLUTO: "♇",
}
PLANET_NAME_RU: dict[Planet, str] = {
    Planet.SUN: "Солнце", Planet.MOON: "Луна", Planet.MERCURY: "Меркурий",
    Planet.VENUS: "Венера", Planet.MARS: "Марс", Planet.JUPITER: "Юпитер",
    Planet.SATURN: "Сатурн", Planet.URANUS: "Уран", Planet.NEPTUNE: "Нептун",
    Planet.PLUTO: "Плутон",
}

# Bodies whose ecliptic longitude never goes retrograde in longitude sign
# (used by interpretation; all modern planets CAN be retrograde — flag set by adapter).


# --------------------------------------------------------------------------- #
# House systems
# --------------------------------------------------------------------------- #
class HouseSystem(str, Enum):
    PLACIDUS = "placidus"
    WHOLE_SIGN = "whole_sign"


# --------------------------------------------------------------------------- #
# Aspects
# --------------------------------------------------------------------------- #
class AspectType(str, Enum):
    CONJUNCTION = "conjunction"
    OPPOSITION = "opposition"
    TRINE = "trine"
    SQUARE = "square"
    SEXTILE = "sextile"
    QUINCUNX = "quincunx"   # minor


# (angle_degrees, default_orb_degrees)
ASPECT_SPECS: dict[AspectType, tuple[float, float]] = {
    AspectType.CONJUNCTION: (0.0, 9.0),
    AspectType.OPPOSITION: (180.0, 9.0),
    AspectType.TRINE: (120.0, 8.0),
    AspectType.SQUARE: (90.0, 8.0),
    AspectType.SEXTILE: (60.0, 6.0),
    AspectType.QUINCUNX: (150.0, 3.0),
}

# Sun/Moon get a wider orb by tradition.
LUMINARY_EXTRA_ORB: float = 2.0


# --------------------------------------------------------------------------- #
# Pure helpers
# --------------------------------------------------------------------------- #
def sign_of(ecliptic_longitude_deg: float) -> Sign:
    """Sign for a tropical ecliptic longitude in degrees [0, 360)."""
    lng = ecliptic_longitude_deg % 360.0
    return SIGNS[int(lng // 30)]


def degree_in_sign(ecliptic_longitude_deg: float) -> float:
    """Position within the current sign, in degrees [0, 30)."""
    return ecliptic_longitude_deg % 30.0


def angular_separation(a_deg: float, b_deg: float) -> float:
    """Shortest arc between two ecliptic longitudes, in degrees [0, 180]."""
    d = abs(a_deg - b_deg) % 360.0
    return min(d, 360.0 - d)


def find_aspect(a_deg: float, b_deg: float, is_luminary: bool = False):
    """Return (AspectType, orb_applied, exact_separation) or None.

    Pure function: classify whether two longitudes form a major aspect.
    """
    sep = angular_separation(a_deg, b_deg)
    for aspect_type, (angle, orb) in ASPECT_SPECS.items():
        eff_orb = orb + (LUMINARY_EXTRA_ORB if is_luminary else 0.0)
        delta = abs(sep - angle)
        if delta <= eff_orb:
            return aspect_type, delta, sep  # delta = "orb used" (deviation from exact)
    return None
