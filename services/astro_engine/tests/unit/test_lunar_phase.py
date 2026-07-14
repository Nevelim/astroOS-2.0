"""Unit tests for lunar phase calculation."""
from __future__ import annotations

import pytest

from services.astro_engine.domain.lunar_phase import (
    LunarPhase,
    PhaseName,
    PHASE_DISPLAY,
    SYNODIC_MONTH_DAYS,
    lunar_phase,
)


class TestPhaseNames:
    @pytest.mark.parametrize("sun,moon,expected", [
        (0, 0, PhaseName.NEW),
        (0, 45, PhaseName.WAXING_CRESCENT),
        (0, 90, PhaseName.FIRST_QUARTER),
        (0, 135, PhaseName.WAXING_GIBBOUS),
        (0, 180, PhaseName.FULL),
        (0, 225, PhaseName.WANING_GIBBOUS),
        (0, 270, PhaseName.LAST_QUARTER),
        (0, 315, PhaseName.WANING_CRESCENT),
        (0, 359, PhaseName.NEW),        # near new (wraps)
        (10, 10, PhaseName.NEW),        # same longitude = new
    ])
    def test_phase_from_elongation(self, sun, moon, expected):
        lp = lunar_phase(sun, moon)
        assert lp.phase is expected

    def test_all_8_phases_have_display(self):
        for p in PhaseName:
            assert p in PHASE_DISPLAY
            assert "en" in PHASE_DISPLAY[p]
            assert "emoji" in PHASE_DISPLAY[p]


class TestIllumination:
    def test_new_moon_zero_illumination(self):
        lp = lunar_phase(0, 0)
        assert lp.illumination_pct == 0.0

    def test_full_moon_full_illumination(self):
        lp = lunar_phase(0, 180)
        assert lp.illumination_pct == 100.0

    def test_first_quarter_half_illumination(self):
        lp = lunar_phase(0, 90)
        assert abs(lp.illumination_pct - 50.0) < 0.5

    def test_illumination_in_range(self):
        for sep in range(0, 360, 30):
            lp = lunar_phase(0, sep)
            assert 0 <= lp.illumination_pct <= 100


class TestMoonAge:
    def test_new_moon_age_zero(self):
        lp = lunar_phase(0, 0)
        assert lp.age_days == 0.0

    def test_full_moon_age_half_cycle(self):
        lp = lunar_phase(0, 180)
        assert abs(lp.age_days - SYNODIC_MONTH_DAYS / 2) < 0.5

    def test_age_increases_with_elongation(self):
        ages = [lunar_phase(0, e).age_days for e in (0, 90, 180, 270)]
        assert ages == sorted(ages)


class TestDaysToNextPhase:
    def test_new_moon_to_first_quarter(self):
        lp = lunar_phase(0, 0)
        # Next major after 0° is 90° (first quarter) ≈ 7.4 days
        assert 7.0 < lp.days_to_next_phase < 8.0

    def test_approaching_full_moon(self):
        lp = lunar_phase(0, 170)  # near full
        assert lp.days_to_next_phase < 2.0  # full soon

    def test_positive(self):
        for sep in range(0, 360, 45):
            assert lunar_phase(0, sep).days_to_next_phase >= 0


class TestRealisticScenario:
    def test_wrap_around(self):
        """Elongation near 360° wraps to new moon."""
        lp = lunar_phase(10, 369)  # = 359° elongation → near new
        assert lp.phase is PhaseName.NEW or lp.phase is PhaseName.WANING_CRESCENT
