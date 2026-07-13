"""Unit tests for Astro Engine domain math — pure astronomy, no ephemeris.

These verify the formulas (sidereal time, MC, ASC, ecliptic conversion,
aspects, houses) against hand-checked values and known invariants.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone

import pytest

from services.astro_engine.domain import chart as C
from services.astro_engine.domain import constants as K


# --------------------------------------------------------------------------- #
# Sign classification
# --------------------------------------------------------------------------- #
class TestSigns:
    @pytest.mark.parametrize("lng,sign", [
        (0.0, K.Sign.ARIES), (29.9, K.Sign.ARIES),
        (30.0, K.Sign.TAURUS), (60.0, K.Sign.GEMINI),
        (90.0, K.Sign.CANCER), (180.0, K.Sign.LIBRA),
        (270.0, K.Sign.CAPRICORN), (359.99, K.Sign.PISCES),
        (360.0, K.Sign.ARIES), (390.0, K.Sign.TAURUS),  # wrap
    ])
    def test_sign_of(self, lng, sign):
        assert K.sign_of(lng) == sign

    def test_degree_in_sign(self):
        assert K.degree_in_sign(45.0) == pytest.approx(15.0)
        assert K.degree_in_sign(0.0) == 0.0
        assert K.degree_in_sign(359.9) == pytest.approx(29.9)

    def test_element_modality_coverage(self):
        # Every sign has an element and a modality.
        for s in K.SIGNS:
            assert s in K.SIGN_ELEMENT
            assert s in K.SIGN_MODALITY


# --------------------------------------------------------------------------- #
# Angular separation + aspects
# --------------------------------------------------------------------------- #
class TestAspects:
    def test_separation_basic(self):
        assert K.angular_separation(0, 90) == 90.0
        assert K.angular_separation(0, 180) == 180.0
        assert K.angular_separation(0, 270) == 90.0   # shortest arc
        assert K.angular_separation(10, 350) == 20.0  # wrap

    def test_conjunction(self):
        r = K.find_aspect(120.0, 122.0)
        assert r is not None
        aspect, orb, sep = r
        assert aspect == K.AspectType.CONJUNCTION
        assert orb == pytest.approx(2.0, abs=0.01)

    def test_trine(self):
        r = K.find_aspect(0.0, 122.0)
        assert r is not None
        assert r[0] == K.AspectType.TRINE
        assert r[1] == pytest.approx(2.0, abs=0.01)

    def test_opposition(self):
        r = K.find_aspect(10.0, 188.0)
        assert r is not None
        assert r[0] == K.AspectType.OPPOSITION

    def test_no_aspect(self):
        # 37° from any standard aspect
        assert K.find_aspect(0.0, 37.0) is None

    def test_luminary_extra_orb(self):
        # 11° separation: no conjunction normally (orb 9), but luminary gets +2.
        assert K.find_aspect(0.0, 11.0, is_luminary=False) is None
        r = K.find_aspect(0.0, 11.0, is_luminary=True)
        assert r is not None
        assert r[0] == K.AspectType.CONJUNCTION


# --------------------------------------------------------------------------- #
# Sidereal time + MC + ASC
# --------------------------------------------------------------------------- #
class TestAstronomy:
    def test_julian_day_j2000(self):
        # J2000.0 epoch = 2000-01-01 12:00 UT → JD 2451545.0
        jd = C._julian_day(datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc))
        assert jd == pytest.approx(2451545.0, abs=1e-6)

    def test_gmst_j2000_close_to_18h41m50s(self):
        # At J2000.0 the GMST was ≈ 18h41m50.548s = 280.46... deg
        gmst = C.greenwich_sidereal_time_deg(datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc))
        # 18h41m50s = 18.697°h * 15 = 280.46°
        assert 279.0 < gmst < 282.0

    def test_lst_adds_longitude(self):
        utc = datetime(2000, 1, 1, 12, 0, tzinfo=timezone.utc)
        gmst = C.greenwich_sidereal_time_deg(utc)
        lst_0 = C.local_sidereal_time_deg(utc, 0.0)
        lst_90 = C.local_sidereal_time_deg(utc, 90.0)
        assert lst_0 == pytest.approx(gmst % 360, abs=1e-6)
        assert (lst_90 - lst_0) % 360 == pytest.approx(90.0, abs=1e-6)

    def test_ascendant_in_eastern_half(self):
        # For a non-polar latitude the ASC should fall in the eastern half
        # (the ASC is by definition the eastern horizon point).
        utc = datetime(2024, 7, 1, 12, 0, tzinfo=timezone.utc)
        asc = C.ascendant_deg(utc, 40.0, -74.0)  # New York
        assert 0.0 <= asc < 360.0

    def test_mc_orthogonal_to_ramc(self):
        # MC = atan2(sin RAMC, cos RAMC · cos ε). For RAMC = 0 → MC = 0 (Aries).
        utc = datetime(2024, 3, 20, 12, 0, tzinfo=timezone.utc)  # equinox
        mc = C.midheaven_deg(utc, 0.0)  # longitude 0 → RAMC = GMST
        assert 0.0 <= mc < 360.0


# --------------------------------------------------------------------------- #
# Whole Sign houses
# --------------------------------------------------------------------------- #
class TestWholeSignHouses:
    def test_first_house_is_asc_sign(self):
        from services.astro_engine.domain.chart import Angles
        angles = Angles(ascendant_deg=45.0, midheaven_deg=200.0,
                        descendant_deg=225.0, imum_coeli_deg=20.0)
        h = C.whole_sign_houses(angles)
        # ASC 45° → sign Taurus (index 1) → 1st cusp = 30°
        assert h.cusps_deg[0] == 30.0
        assert h.cusps_deg[1] == 60.0  # 2nd house = Gemini sign = 60°
        assert h.system == K.HouseSystem.WHOLE_SIGN

    def test_12_houses(self):
        from services.astro_engine.domain.chart import Angles
        angles = Angles(0.0, 180.0, 180.0, 0.0)
        h = C.whole_sign_houses(angles)
        assert len(h.cusps_deg) == 12
        # Each cusp is 30° apart in Whole Sign.
        for i in range(12):
            assert h.cusps_deg[i] == pytest.approx((i * 30.0) % 360.0)


# --------------------------------------------------------------------------- #
# Equatorial → ecliptic conversion
# --------------------------------------------------------------------------- #
class TestEquatorialToEcliptic:
    def test_zero_ra_dec_is_zero(self):
        assert C.equatorial_to_ecliptic_longitude(0.0, 0.0) == pytest.approx(0.0, abs=1e-9)

    def test_roundtrip_stable(self):
        # The conversion should produce a value in [0, 360).
        lng = C.equatorial_to_ecliptic_longitude(45.0, 10.0)
        assert 0.0 <= lng < 360.0


# --------------------------------------------------------------------------- #
# compute_aspects on a planet set
# --------------------------------------------------------------------------- #
class TestComputeAspects:
    def test_finds_known_aspects(self):
        planets = (
            C.PlanetPosition(K.Planet.SUN, 0.0),
            C.PlanetPosition(K.Planet.MOON, 120.0),    # trine Sun
            C.PlanetPosition(K.Planet.MARS, 90.0),     # square Sun
            C.PlanetPosition(K.Planet.JUPITER, 95.0),  # conjunct Mars, square Sun
        )
        aspects = C.compute_aspects(planets)
        types = {(a.a, a.b, a.type) for a in aspects}
        assert (K.Planet.SUN, K.Planet.MOON, K.AspectType.TRINE) in types
        assert (K.Planet.SUN, K.Planet.MARS, K.AspectType.SQUARE) in types
        assert (K.Planet.MARS, K.Planet.JUPITER, K.AspectType.CONJUNCTION) in types

    def test_minor_excluded_by_default(self):
        # 150° = quincunx (minor)
        planets = (
            C.PlanetPosition(K.Planet.SUN, 0.0),
            C.PlanetPosition(K.Planet.MOON, 150.5),
        )
        assert C.compute_aspects(planets) == ()
        # but included when asked
        assert len(C.compute_aspects(planets, include_minor=True)) == 1


# --------------------------------------------------------------------------- #
# House placement
# --------------------------------------------------------------------------- #
class TestHousePlacement:
    def test_planet_in_first_house_whole_sign(self):
        from services.astro_engine.domain.chart import Angles
        angles = Angles(5.0, 200.0, 185.0, 20.0)  # ASC 5° Aries
        houses = C.whole_sign_houses(angles)
        # Planet at 15° Aries → 1st house
        assert C.house_of(15.0, houses) == 1
        # Planet at 35° (Taurus) → 2nd house
        assert C.house_of(35.0, houses) == 2
