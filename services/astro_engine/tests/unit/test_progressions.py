"""Unit tests for secondary progressions ("a day for a year").

Covers the pure domain functions in services.astro_engine.domain.progressions:
progressed_longitude, progressed_date, progressed_chart, and
progressed_sun_sign_change.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from services.astro_engine.domain.progressions import (
    PLANET_DAILY_MOTIONS_DEG,
    MOON_DAILY_MOTION_DEG,
    SUN_DAILY_MOTION_DEG,
    progressed_chart,
    progressed_date,
    progressed_longitude,
    progressed_sun_sign_change,
)


BIRTH = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)  # 1989-04-15 09:40 UTC


# --------------------------------------------------------------------------- #
# progressed_date — "a day for a year"
# --------------------------------------------------------------------------- #
class TestProgressedDate:
    def test_thirty_years_is_thirty_days(self):
        # The core of the technique: age 30 -> 30 days after birth.
        pd = progressed_date(BIRTH, 30)
        assert pd.date() == datetime(1989, 5, 15).date()

    def test_returns_datetime_same_type(self):
        pd = progressed_date(BIRTH, 1)
        assert isinstance(pd, datetime)
        assert pd.tzinfo is not None  # timezone-aware preserved

    def test_zero_age_is_birth(self):
        assert progressed_date(BIRTH, 0) == BIRTH

    def test_fractional_age_uses_fractional_days(self):
        # age 0.5 -> 12 hours after birth.
        pd = progressed_date(BIRTH, 0.5)
        assert (pd - BIRTH).total_seconds() == pytest.approx(12 * 3600, rel=1e-6)


# --------------------------------------------------------------------------- #
# progressed_longitude — advancing a single longitude
# --------------------------------------------------------------------------- #
class TestProgressedLongitude:
    def test_sun_advances_one_degree_per_year(self):
        # 30 days * 0.9856 deg/day ~ 29.57 deg. Natal 25.55 -> ~55.1.
        advanced = progressed_longitude(25.55, 30, planet="sun")
        assert advanced == pytest.approx(25.55 + 0.9856 * 30, abs=1e-6)
        assert 54 < advanced < 56

    def test_uses_explicit_daily_motion(self):
        # When daily_motion_deg is given, it overrides the planet lookup.
        advanced = progressed_longitude(10.0, 100, daily_motion_deg=0.5)
        assert advanced == pytest.approx(60.0, abs=1e-9)

    def test_normalizes_to_360(self):
        # 350 + 30 deg of motion should wrap to 20.
        advanced = progressed_longitude(350.0, 30, daily_motion_deg=1.0)
        assert advanced == pytest.approx(20.0, abs=1e-9)
        assert 0 <= advanced < 360

    def test_requires_motion_source(self):
        with pytest.raises(ValueError):
            progressed_longitude(10.0, 30)  # no planet, no daily_motion_deg

    def test_unknown_planet_raises(self):
        with pytest.raises(ValueError):
            progressed_longitude(10.0, 30, planet="unknown_planet")

    def test_sun_motion_constant(self):
        # The mean solar motion rate used throughout the codebase.
        assert SUN_DAILY_MOTION_DEG == pytest.approx(0.9856)


# --------------------------------------------------------------------------- #
# progressed_chart — the whole chart
# --------------------------------------------------------------------------- #
class TestProgressedChart:
    NATAL = {
        "sun": 25.55, "moon": 143.9, "mercury": 10.0, "venus": 50.0,
        "mars": 100.0, "jupiter": 200.0, "saturn": 300.0,
    }

    def test_all_known_planets_progress_forward(self):
        pc = progressed_chart(self.NATAL, BIRTH, 36)
        for name, natal_lng in self.NATAL.items():
            motion = PLANET_DAILY_MOTIONS_DEG[name]
            expected = (natal_lng + motion * 36) % 360.0
            assert pc[name] == pytest.approx(expected, abs=1e-6)

    def test_sun_value_at_age_thirty(self):
        # The headline example from the spec: 25.55 -> ~55 at age 30.
        pc = progressed_chart({"sun": 25.55}, BIRTH, 30)
        assert pc["sun"] == pytest.approx(25.55 + 0.9856 * 30, abs=1e-6)
        assert 54 < pc["sun"] < 56

    def test_all_longitudes_in_range(self):
        pc = progressed_chart(self.NATAL, BIRTH, 50)
        for name, lng in pc.items():
            assert 0 <= lng < 360, f"{name} longitude {lng} out of range"

    def test_moon_progresses_much_faster_than_sun(self):
        # Over one year the Moon advances ~13°, the Sun only ~1°.
        pc = progressed_chart({"sun": 25.55, "moon": 143.9}, BIRTH, 1)
        sun_delta = pc["sun"] - 25.55
        moon_delta = pc["moon"] - 143.9
        assert moon_delta > sun_delta * 10
        assert MOON_DAILY_MOTION_DEG > SUN_DAILY_MOTION_DEG * 10

    def test_unknown_planet_passed_through_unchanged(self):
        # Uranus/Neptune/Pluto are not in the motion table — returned as-is.
        pc = progressed_chart({"uranus": 270.0, "neptune": 280.0}, BIRTH, 40)
        assert pc["uranus"] == pytest.approx(270.0, abs=1e-9)
        assert pc["neptune"] == pytest.approx(280.0, abs=1e-9)

    def test_age_zero_returns_natal(self):
        pc = progressed_chart(self.NATAL, BIRTH, 0)
        for name, natal_lng in self.NATAL.items():
            assert pc[name] == pytest.approx(natal_lng % 360.0, abs=1e-9)


# --------------------------------------------------------------------------- #
# progressed_sun_sign_change — life-theme shift detection
# --------------------------------------------------------------------------- #
class TestProgressedSunSignChange:
    def test_detects_aries_to_taurus_near_birth(self):
        # Natal Sun 25.55 Aries -> the 30 Taurus boundary is ~4.5 yrs away.
        events = progressed_sun_sign_change(25.55, BIRTH, current_age=0,
                                            years_ahead=5)
        assert len(events) == 1
        ev = events[0]
        assert ev["from_sign"] == "aries"
        assert ev["to_sign"] == "taurus"
        assert 4.0 < ev["age_at_change"] < 5.0
        # The date is ~4.5 days after birth (day-for-a-year).
        assert ev["date"].startswith("1989-04-19")

    def test_only_returns_future_events(self):
        # The Aries->Taurus change at ~4.5 yrs is in the past for a 10-yr-old.
        events = progressed_sun_sign_change(25.55, BIRTH, current_age=10,
                                            years_ahead=5)
        assert all(ev["age_at_change"] > 10 for ev in events)

    def test_respects_years_ahead_window(self):
        # A natal Sun at 0 Aries won't hit 30 Taurus until ~30 yrs of age.
        events = progressed_sun_sign_change(0.0, BIRTH, current_age=0,
                                            years_ahead=10)
        assert events == []  # first change (~30 yrs) is outside the 10-yr window

    def test_sign_change_around_thirty_years(self):
        # Sun at 0 Aries: the first boundary (30 Taurus) is ~30.4 yrs out.
        events = progressed_sun_sign_change(0.0, BIRTH, current_age=0,
                                            years_ahead=35)
        assert len(events) >= 1
        ev = events[0]
        assert ev["from_sign"] == "aries"
        assert ev["to_sign"] == "taurus"
        assert 29 < ev["age_at_change"] < 31

    def test_events_sorted_by_age(self):
        events = progressed_sun_sign_change(5.0, BIRTH, current_age=0,
                                            years_ahead=100)
        ages = [e["age_at_change"] for e in events]
        assert ages == sorted(ages)

    def test_event_fields_present(self):
        events = progressed_sun_sign_change(25.55, BIRTH, current_age=0,
                                            years_ahead=5)
        ev = events[0]
        for field in ("age_at_change", "date", "from_sign", "to_sign"):
            assert field in ev
