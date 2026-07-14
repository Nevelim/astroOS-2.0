"""Unit tests for the Lunar Nodes (mean node calculation, Meeus formula)."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from services.astro_engine.domain.lunar_nodes import (
    LunarNodePosition,
    mean_lunar_node,
    node_sign,
)


class TestMeanNodeFormula:
    def test_j2000_epoch_value(self):
        """At J2000.0 (2000-01-01 12:00 UT) the mean node = 125.04452°."""
        n = mean_lunar_node(datetime(2000, 1, 1, 12, 0, 0, tzinfo=timezone.utc))
        assert abs(n.north_longitude_deg - 125.04) < 0.1

    def test_south_node_exactly_opposite(self):
        """South Node is always exactly 180° from North Node."""
        n = mean_lunar_node(datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc))
        assert abs(n.south_longitude_deg - (n.north_longitude_deg + 180) % 360) < 0.01

    def test_longitude_in_range(self):
        n = mean_lunar_node(datetime(2024, 6, 15, 0, 0, tzinfo=timezone.utc))
        assert 0 <= n.north_longitude_deg < 360
        assert 0 <= n.south_longitude_deg < 360


class TestNodeRetrogradeDrift:
    def test_node_moves_retrograde(self):
        """The mean node drifts retrograde (~19.35°/year)."""
        n1 = mean_lunar_node(datetime(2020, 1, 1, tzinfo=timezone.utc))
        n2 = mean_lunar_node(datetime(2020, 12, 1, tzinfo=timezone.utc))
        # Retrograde means the longitude DECREASES over time (mod 360).
        delta = (n1.north_longitude_deg - n2.north_longitude_deg) % 360
        assert 10 < delta < 25   # ~19° over ~11 months

    def test_18_6_year_cycle(self):
        """After ~18.6 years the node returns near its starting longitude."""
        n1 = mean_lunar_node(datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc))
        n2 = mean_lunar_node(datetime(2018, 7, 1, tzinfo=timezone.utc))
        delta = abs(n1.north_longitude_deg - n2.north_longitude_deg)
        delta = min(delta, 360 - delta)
        assert delta < 5.0   # back near 125°


class TestCanonicalCase:
    """Pavlodar 1989-04-15 09:40 UT — North Node in Pisces."""

    def test_north_node_pisces_1989(self):
        n = mean_lunar_node(datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc))
        assert node_sign(n.north_longitude_deg) == "pisces"
        assert 330 < n.north_longitude_deg < 340

    def test_south_node_virgo_1989(self):
        n = mean_lunar_node(datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc))
        assert node_sign(n.south_longitude_deg) == "virgo"


class TestNodeSign:
    @pytest.mark.parametrize("lng,sign", [
        (0, "aries"), (29.9, "aries"), (30, "taurus"), (60, "gemini"),
        (90, "cancer"), (120, "leo"), (150, "virgo"), (180, "libra"),
        (210, "scorpio"), (240, "sagittarius"), (270, "capricorn"),
        (300, "aquarius"), (330, "pisces"), (359, "pisces"),
    ])
    def test_sign_boundaries(self, lng, sign):
        assert node_sign(lng) == sign


class TestTimezoneHandling:
    def test_naive_datetime_treated_as_utc(self):
        """A naive datetime is treated as UTC (no crash)."""
        n = mean_lunar_node(datetime(2020, 6, 15, 12, 0, 0))
        assert 0 <= n.north_longitude_deg < 360

    def test_non_utc_timezone_converted(self):
        """A +05:00 datetime is converted to UTC before computing."""
        from datetime import timedelta
        tz_plus5 = timezone(timedelta(hours=5))
        local = datetime(2020, 6, 15, 17, 0, 0, tzinfo=tz_plus5)  # = 12:00 UTC
        utc = datetime(2020, 6, 15, 12, 0, 0, tzinfo=timezone.utc)
        n_local = mean_lunar_node(local)
        n_utc = mean_lunar_node(utc)
        assert abs(n_local.north_longitude_deg - n_utc.north_longitude_deg) < 0.001
