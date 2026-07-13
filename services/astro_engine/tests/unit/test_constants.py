"""Unit tests for Astro domain pure logic: signs, aspects, houses."""
from __future__ import annotations

import pytest

from services.astro_engine.domain.constants import (
    ASPECTS, Element, Modality, Planet, Sign,
    SIGN_ELEMENT, SIGN_MODALITY,
    angular_distance, find_aspect, sign_from_longitude, degree_in_sign,
)
from services.astro_engine.domain.chart import (
    Angles, Aspect, HouseCusps, PlanetPosition, NatalChart,
)


# --------------------------------------------------------------------------- #
# Sign from longitude
# --------------------------------------------------------------------------- #
class TestSignFromLongitude:
    @pytest.mark.parametrize("lng,sign", [
        (0.0, Sign.ARIES), (29.99, Sign.ARIES),
        (30.0, Sign.TAURUS), (60.0, Sign.GEMINI),
        (90.0, Sign.CANCER), (120.0, Sign.LEO),
        (150.0, Sign.VIRGO), (180.0, Sign.LIBRA),
        (210.0, Sign.SCORPIO), (240.0, Sign.SAGITTARIUS),
        (270.0, Sign.CAPRICORN), (300.0, Sign.AQUARIUS), (330.0, Sign.PISCES),
        (359.99, Sign.PISCES),
    ])
    def test_mapping(self, lng, sign):
        assert sign_from_longitude(lng) == sign

    def test_wraps_above_360(self):
        # 370° mod 360 = 10° → Aries
        assert sign_from_longitude(370.0) == Sign.ARIES
        # 390° mod 360 = 30° → Taurus
        assert sign_from_longitude(390.0) == Sign.TAURUS

    def test_degree_in_sign(self):
        assert degree_in_sign(45.0) == pytest.approx(15.0)
        assert degree_in_sign(350.0) == pytest.approx(20.0)


# --------------------------------------------------------------------------- #
# Sign element + modality
# --------------------------------------------------------------------------- #
class TestSignAttributes:
    def test_fire_signs(self):
        fire = {Sign.ARIES, Sign.LEO, Sign.SAGITTARIUS}
        for s in fire:
            assert SIGN_ELEMENT[s] == Element.FIRE

    def test_earth_signs(self):
        earth = {Sign.TAURUS, Sign.VIRGO, Sign.CAPRICORN}
        for s in earth:
            assert SIGN_ELEMENT[s] == Element.EARTH

    def test_cardinal_signs(self):
        cardinal = {Sign.ARIES, Sign.CANCER, Sign.LIBRA, Sign.CAPRICORN}
        for s in cardinal:
            assert SIGN_MODALITY[s] == Modality.CARDINAL

    def test_fixed_signs(self):
        fixed = {Sign.TAURUS, Sign.LEO, Sign.SCORPIO, Sign.AQUARIUS}
        for s in fixed:
            assert SIGN_MODALITY[s] == Modality.FIXED


# --------------------------------------------------------------------------- #
# Angular distance + aspects
# --------------------------------------------------------------------------- #
class TestAngularDistance:
    @pytest.mark.parametrize("a,b,expected", [
        (0.0, 0.0, 0.0),
        (0.0, 90.0, 90.0),
        (0.0, 180.0, 180.0),
        (0.0, 270.0, 90.0),     # wraps: 270 is 90 from 360
        (10.0, 350.0, 20.0),    # wraps
        (45.0, 135.0, 90.0),
    ])
    def test_distance(self, a, b, expected):
        assert angular_distance(a, b) == pytest.approx(expected)


class TestFindAspect:
    def test_conjunction(self):
        asp = find_aspect(100.0, 102.0)
        assert asp is not None
        assert asp.type.value == "conjunction"

    def test_opposition(self):
        asp = find_aspect(10.0, 185.0)
        assert asp is not None
        assert asp.type.value == "opposition"
        assert asp.harmonious is False

    def test_trine(self):
        asp = find_aspect(0.0, 122.0)
        assert asp is not None
        assert asp.type.value == "trine"

    def test_no_aspect_outside_orb(self):
        # 17° apart — no major aspect (septile/quincunx excluded)
        assert find_aspect(0.0, 17.0) is None

    def test_square_detected(self):
        asp = find_aspect(0.0, 92.0)
        assert asp is not None
        assert asp.type.value == "square"


# --------------------------------------------------------------------------- #
# House system: Whole Sign
# --------------------------------------------------------------------------- #
class TestWholeSignHouses:
    def test_whole_sign_assigns_first_house_to_asc_sign(self):
        from services.astro_engine.domain.compute import whole_sign_houses
        cusps, angles = whole_sign_houses(45.0)  # Taurus 15°
        # Whole-Sign 1st house = Taurus 0° (sign of Ascendant)
        assert cusps[0] == 30.0
        assert cusps[1] == 60.0  # Gemini
        assert angles.ascendant_deg == 45.0

    def test_house_of_in_whole_sign(self):
        from services.astro_engine.domain.compute import whole_sign_houses
        cusps, angles = whole_sign_houses(45.0)
        houses = HouseCusps(system="whole_sign", cusps=cusps)
        # A planet at 35° (Taurus 5°) → 1st house
        assert houses.house_of(35.0) == 1
        # A planet at 65° (Gemini 5°) → 2nd house
        assert houses.house_of(65.0) == 2
        # Wraps: planet at 25° (Aries 25°) → 12th house
        assert houses.house_of(25.0) == 12


# --------------------------------------------------------------------------- #
# PlanetPosition
# --------------------------------------------------------------------------- #
class TestPlanetPosition:
    def test_attributes(self):
        p = PlanetPosition(
            planet=Planet.SUN, longitude_deg=95.5,
            latitude_deg=2.0, speed_deg_per_day=1.0, house=4,
        )
        assert p.sign == Sign.CANCER
        assert p.degree_in_sign == pytest.approx(5.5)
        assert p.element == Element.WATER
        assert p.modality == Modality.CARDINAL
        assert p.retrograde is False

    def test_retrograde_detection(self):
        p = PlanetPosition(
            planet=Planet.MERCURY, longitude_deg=100.0,
            speed_deg_per_day=-0.5, house=5,
        )
        assert p.retrograde is True

    def test_glyph_summary(self):
        p = PlanetPosition(planet=Planet.SUN, longitude_deg=0.5)
        assert "0°" in p.glyph_summary()
        assert "♈" in p.glyph_summary()


# --------------------------------------------------------------------------- #
# NatalChart
# --------------------------------------------------------------------------- #
class TestNatalChart:
    def test_sun_accessor(self):
        from services.astro_engine.domain.compute import whole_sign_houses
        sun = PlanetPosition(planet=Planet.SUN, longitude_deg=10.0)
        moon = PlanetPosition(planet=Planet.MOON, longitude_deg=80.0)
        cusps, angles = whole_sign_houses(10.0)
        chart = NatalChart(positions=(sun, moon), houses=HouseCusps("whole_sign", cusps), angles=angles)
        assert chart.sun() is sun
        assert chart.position(Planet.MOON) is moon
        assert chart.position(Planet.MARS) is None
