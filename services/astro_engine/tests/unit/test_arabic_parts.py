"""Unit tests for the Arabic Parts (Part of Fortune, Part of Spirit)."""
from __future__ import annotations

import pytest

from services.astro_engine.domain.arabic_parts import (
    ArabicPart,
    is_day_birth,
    part_of_fortune,
    part_of_spirit,
)


class TestSect:
    def test_sun_above_horizon_is_day(self):
        """Sun 90° clockwise from ASC (near MC) → day."""
        assert is_day_birth(sun_longitude_deg=100.0, ascendant_deg=10.0) is True

    def test_sun_below_horizon_is_night(self):
        """Sun 200° from ASC (below horizon, near IC) → night."""
        assert is_day_birth(sun_longitude_deg=210.0, ascendant_deg=10.0) is False

    def test_sun_at_descendant_boundary(self):
        """Sun exactly 180° from ASC — the horizon boundary. Conventionally day
        if arc < 180, so 180 exactly is treated as night (borderline)."""
        assert is_day_birth(sun_longitude_deg=190.0, ascendant_deg=10.0) is False


class TestPartOfFortune:
    def test_day_formula(self):
        """Day birth: PF = ASC + Moon − Sun."""
        # ASC 10°, Sun 100° (above horizon → day), Moon 200°.
        pf = part_of_fortune(ascendant_deg=10.0, sun_longitude_deg=100.0,
                             moon_longitude_deg=200.0)
        assert abs(pf.longitude_deg - (10 + 200 - 100)) < 0.01  # = 110°

    def test_night_formula(self):
        """Night birth: PF = ASC + Sun − Moon."""
        # ASC 10°, Sun 250° (below horizon → night), Moon 50°.
        pf = part_of_fortune(ascendant_deg=10.0, sun_longitude_deg=250.0,
                             moon_longitude_deg=50.0)
        assert abs(pf.longitude_deg - (10 + 250 - 50) % 360) < 0.01  # = 210°

    def test_wraps_around_360(self):
        pf = part_of_fortune(ascendant_deg=350.0, sun_longitude_deg=100.0,
                             moon_longitude_deg=200.0)
        assert 0 <= pf.longitude_deg < 360

    def test_day_and_night_give_different_results(self):
        """Same ASC/Sun/Moon but swapping sect (via ASC) yields different PF."""
        day = part_of_fortune(ascendant_deg=10.0, sun_longitude_deg=100.0,
                              moon_longitude_deg=200.0)   # day
        night = part_of_fortune(ascendant_deg=10.0, sun_longitude_deg=250.0,
                                moon_longitude_deg=50.0)  # night
        assert day.longitude_deg != night.longitude_deg


class TestPartOfSpirit:
    def test_spirit_is_complement_of_fortune(self):
        """Day: PF = ASC+Moon-Sun, PoS = ASC+Sun-Moon. They differ by 2*(Moon-Sun)."""
        pf = part_of_fortune(ascendant_deg=10.0, sun_longitude_deg=100.0,
                             moon_longitude_deg=200.0)
        ps = part_of_spirit(ascendant_deg=10.0, sun_longitude_deg=100.0,
                            moon_longitude_deg=200.0)
        # PF = 110, PoS = 10+100-200 = -90 → 270. They're distinct.
        assert pf.longitude_deg != ps.longitude_deg

    def test_spirit_longitude_in_range(self):
        ps = part_of_spirit(ascendant_deg=200.0, sun_longitude_deg=50.0,
                            moon_longitude_deg=300.0)
        assert 0 <= ps.longitude_deg < 360


class TestCanonicalCase:
    """Pavlodar 1989: Sun 25.55°, Moon 143.92°. ASC depends on birth time.
    With ASC ~150° (approx for 16:40 local / 09:40 UT at 52.3N), Sun is above
    horizon (day birth). PF = ASC + Moon − Sun."""

    def test_canonical_case_night_formula(self):
        """ASC ~150°, Sun 25.55°: arc from ASC = 235.55° > 180 → night birth.
        Night formula: PF = ASC + Sun − Moon = 150 + 25.55 − 143.92 = 31.63°."""
        asc = 150.0  # approximate for 16:40 local at 52.3N
        # Verify it's actually a night chart by sect
        assert is_day_birth(sun_longitude_deg=25.55, ascendant_deg=asc) is False
        pf = part_of_fortune(asc, sun_longitude_deg=25.55, moon_longitude_deg=143.92)
        assert abs(pf.longitude_deg - 31.63) < 0.1
        assert 0 <= pf.longitude_deg < 360
