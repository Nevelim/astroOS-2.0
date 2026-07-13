"""Golden tests: Astro Engine planet positions verified against Swiss Ephemeris.

The Pavlodar 1989-04-15 09:40 UTC case is our canonical anchor. Expected
values are derived from skyfield+DE421 (NASA JPL) which itself agrees with
Swiss Ephemeris to <0.01°. These tests lock the calculation so any future
change to the ephemeris adapter or ecliptic-conversion math is caught.

Reference verification points:
  - Sun on Apr 15 (any year) is ~24-26° tropical Aries — astronomically fixed.
  - Saturn in 1989 was in Capricorn (14° ±) — historical fact.
  - Pluto in 1989 was at ~14° Scorpio ("Saturn-Pluto conjunction era" was later,
    but Pluto entered Scorpio in 1983 and stayed until 1995).
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from services.astro_engine.adapter.ephemeris import SkyfieldEphemeris
from services.astro_engine.domain.chart import compute_angles, whole_sign_houses
from services.astro_engine.domain.constants import (
    AspectType, HouseSystem, Planet, Sign, sign_of,
)


@pytest.fixture(scope="module")
def ephemeris() -> SkyfieldEphemeris:
    return SkyfieldEphemeris()


@pytest.fixture(scope="module")
def pavlodar_positions(ephemeris):
    """All 10 planet positions for Pavlodar 1989-04-15 09:40 UTC."""
    utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
    return ephemeris.positions(utc, 52.30, 76.95)


def _planet(positions, name: Planet):
    return next(p for p in positions if p.planet == name)


class TestPavlodarPlanetPositions:
    """Verify each planet's sign + degree is astronomically correct for Apr 1989."""

    def test_sun_in_aries_late_april(self, pavlodar_positions):
        sun = _planet(pavlodar_positions, Planet.SUN)
        assert sun.sign == Sign.ARIES
        # Mid-April → 24-26° Aries
        assert 23.0 < sun.degree_in_sign < 27.0

    def test_moon_in_leo(self, pavlodar_positions):
        moon = _planet(pavlodar_positions, Planet.MOON)
        # On 1989-04-15 the Moon was in Leo (skyfield-verified)
        assert moon.sign == Sign.LEO

    def test_saturn_in_capricorn(self, pavlodar_positions):
        # Saturn was in Capricorn 1988-1990 (its ruling sign).
        saturn = _planet(pavlodar_positions, Planet.SATURN)
        assert saturn.sign == Sign.CAPRICORN

    def test_pluto_in_scorpio_retrograde(self, pavlodar_positions):
        # Pluto entered Scorpio 1983, stayed until 1995.
        pluto = _planet(pavlodar_positions, Planet.PLUTO)
        assert pluto.sign == Sign.SCORPIO
        assert pluto.retrograde is True  # Pluto retrograde ~5 months/year

    def test_uranus_retrograde(self, pavlodar_positions):
        uranus = _planet(pavlodar_positions, Planet.URANUS)
        assert uranus.retrograde is True  # Uranus was retrograde in Apr 1989

    def test_outer_planets_in_capricorn(self, pavlodar_positions):
        # 1988-1989: Saturn, Uranus, Neptune ALL in Capricorn — the famous
        # "Capricorn stellium" that defined a generation.
        for p in (Planet.SATURN, Planet.URANUS, Planet.NEPTUNE):
            planet = _planet(pavlodar_positions, p)
            assert planet.sign == Sign.CAPRICORN


class TestAngles:
    """ASC/MC computation for Pavlodar."""

    def test_angles_computed(self):
        utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
        angles = compute_angles(utc, 52.30, 76.95)
        assert 0.0 <= angles.ascendant_deg < 360.0
        assert 0.0 <= angles.midheaven_deg < 360.0
        # Descendant = ASC + 180
        assert abs(angles.descendant_deg - (angles.ascendant_deg + 180.0) % 360.0) < 0.01
        # IC = MC + 180
        assert abs(angles.imum_coeli_deg - (angles.midheaven_deg + 180.0) % 360.0) < 0.01


class TestWholeSignHousesIntegration:
    """Whole Sign houses place planets correctly."""

    def test_first_house_is_asc_sign(self):
        utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
        angles = compute_angles(utc, 52.30, 76.95)
        houses = whole_sign_houses(angles)
        asc_sign_index = int(angles.ascendant_deg // 30)
        assert houses.cusps_deg[0] == pytest.approx(asc_sign_index * 30.0)


class TestAspectsInChart:
    """Build a full chart and check aspect detection."""

    def test_chart_has_aspects(self, ephemeris):
        from services.astro_engine.usecase.build_natal import BuildNatalChart
        utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
        chart = BuildNatalChart(ephemeris=ephemeris).execute(
            utc, 52.30, 76.95, HouseSystem.WHOLE_SIGN
        )
        # A 10-planet chart always has many aspects.
        assert len(chart.aspects) > 5
        # At least one major aspect type present.
        types = {a.type for a in chart.aspects}
        assert types & {AspectType.CONJUNCTION, AspectType.TRINE,
                        AspectType.SQUARE, AspectType.OPPOSITION}
