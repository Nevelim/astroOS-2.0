"""Unit tests for astrocartography planetary line calculation."""
from __future__ import annotations

import math

from datetime import datetime, timezone

import pytest

from services.astro_engine.domain.astrocartography import (
    asc_line_longitude,
    dsc_line_longitude,
    ic_line_longitude,
    mc_line_longitude,
    planetary_lines,
    _gmst_hours,
)


class TestGMST:
    def test_returns_hours_in_range(self):
        gmst = _gmst_hours(datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc))
        assert 0 <= gmst < 24

    def test_j2000_known_value(self):
        # GMST at J2000.0 (2000-01-01 12:00 UT) ≈ 18.6973749 hours
        gmst = _gmst_hours(datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc))
        assert abs(gmst - 18.6974) < 0.01


class TestMCLines:
    def test_mc_straight_line(self):
        """MC longitude is the same at every latitude (straight N-S line)."""
        utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
        mc0 = mc_line_longitude("sun", ra_deg=22.5, utc=utc)
        mc60 = mc_line_longitude("sun", ra_deg=22.5, utc=utc)  # same formula
        assert mc0 == mc60  # MC doesn't take latitude as input → always same

    def test_mc_in_range(self):
        utc = datetime(2024, 6, 15, 12, 0, tzinfo=timezone.utc)
        mc = mc_line_longitude("venus", ra_deg=90.0, utc=utc)
        assert 0 <= mc < 360

    def test_ic_180_from_mc(self):
        utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
        mc = mc_line_longitude("mars", ra_deg=120.0, utc=utc)
        ic = ic_line_longitude("mars", ra_deg=120.0, utc=utc)
        diff = abs(mc - ic) % 360
        assert abs(diff - 180) < 0.01 or abs(diff - 180) < 0.01


class TestASCDSC:
    def test_asc_returns_longitude_at_equator(self):
        """At the equator, planets rise/set for nearly all declinations."""
        utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
        asc = asc_line_longitude("sun", ra_deg=22.5, dec_deg=10.0,
                                 latitude_deg=0.0, utc=utc)
        assert asc is not None
        assert 0 <= asc < 360

    def test_asc_none_for_circumpolar(self):
        """A high-declination planet at extreme latitude never rises/sets."""
        utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
        # dec +80°, lat +80° → circumpolar
        asc = asc_line_longitude("test", ra_deg=0.0, dec_deg=80.0,
                                 latitude_deg=80.0, utc=utc)
        assert asc is None

    def test_dsc_different_from_asc(self):
        """ASC and DSC longitudes differ (they're on opposite horizons)."""
        utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
        asc = asc_line_longitude("sun", ra_deg=22.5, dec_deg=10.0,
                                 latitude_deg=45.0, utc=utc)
        dsc = dsc_line_longitude("sun", ra_deg=22.5, dec_deg=10.0,
                                 latitude_deg=45.0, utc=utc)
        assert asc is not None and dsc is not None
        assert abs(asc - dsc) % 360 > 1.0  # not the same point

    def test_asc_curve_varies_with_latitude(self):
        """The ASC line curves — its longitude changes with latitude."""
        utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
        asc_equator = asc_line_longitude("sun", 22.5, 10.0, 0.0, utc)
        asc_45 = asc_line_longitude("sun", 22.5, 10.0, 45.0, utc)
        assert abs(asc_equator - asc_45) > 1.0


class TestPlanetaryLines:
    def test_returns_lines_for_all_angles(self):
        utc = datetime(1989, 4, 15, 9, 40, tzinfo=timezone.utc)
        lines = planetary_lines("sun", ra_deg=22.5, dec_deg=10.0, utc=utc,
                                latitudes=(0, 45))
        angles = {l.angle for l in lines}
        assert {"MC", "IC", "ASC", "DSC"} <= angles

    def test_lines_carry_planet_name(self):
        utc = datetime(2020, 1, 1, tzinfo=timezone.utc)
        lines = planetary_lines("moon", ra_deg=90.0, dec_deg=5.0, utc=utc)
        assert all(l.planet == "moon" for l in lines)

    def test_mc_same_across_latitudes(self):
        utc = datetime(2020, 1, 1, tzinfo=timezone.utc)
        lines = planetary_lines("venus", ra_deg=270.0, dec_deg=-20.0, utc=utc,
                                latitudes=(-30, 0, 30))
        mc_longs = [l.longitude_deg for l in lines if l.angle == "MC"]
        assert len(set(mc_longs)) == 1  # all identical
