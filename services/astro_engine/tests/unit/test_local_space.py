"""Unit tests for Local Space (azimuth/altitude) calculation."""
from __future__ import annotations

import math

import pytest

from services.astro_engine.domain.local_space import (
    LocalSpaceLine,
    LocalSpaceResult,
    _sector,
    compute_local_space,
    equatorial_to_horizontal,
)


class TestEquatorialToHorizontal:
    def test_planet_at_zenith(self):
        """A planet directly overhead (Dec = observer lat, H=0, LST=RA)."""
        # Observer at 45°N, planet Dec=45°, RA=100°, LST=100° (H=0)
        az, alt = equatorial_to_horizontal(ra_deg=100, dec_deg=45,
                                           observer_lat_deg=45, lst_deg=100)
        assert abs(alt - 90.0) < 1.0  # near zenith
        # Azimuth at zenith is undefined (any direction); just check it's valid.

    def test_planet_on_northern_horizon(self):
        """A planet rising due East should have azimuth ~90°."""
        # At equator (φ=0), planet with Dec=0, H=-90 (rising): az ≈ 90° (East)
        az, alt = equatorial_to_horizontal(ra_deg=0, dec_deg=0,
                                           observer_lat_deg=0, lst_deg=-90)
        assert abs(alt) < 2.0  # near horizon
        assert abs(az - 90.0) < 15.0  # roughly East

    def test_azimuth_in_range(self):
        az, alt = equatorial_to_horizontal(45, 20, 52.3, 100)
        assert 0 <= az < 360
        assert -90 <= alt <= 90

    def test_altitude_below_horizon(self):
        """Planet with H=180 (anti-transit) should be below horizon."""
        az, alt = equatorial_to_horizontal(ra_deg=0, dec_deg=0,
                                           observer_lat_deg=45, lst_deg=180)
        assert alt < 0


class TestSectorClassification:
    @pytest.mark.parametrize("az,expected", [
        (0, "N"), (44, "NE"), (45, "NE"), (90, "E"), (135, "SE"),
        (180, "S"), (225, "SW"), (270, "W"), (315, "NW"), (360, "N"),
    ])
    def test_sector_boundaries(self, az, expected):
        assert _sector(az) == expected


class TestComputeLocalSpace:
    def test_returns_lines_for_all_planets(self):
        planets = {
            "sun": (100.0, 10.0),
            "moon": (200.0, -5.0),
            "venus": (150.0, 20.0),
        }
        result = compute_local_space(planets, 52.3, 76.95, lst_deg=120.0)
        assert len(result.lines) == 3
        assert result.total_above + result.total_below == 3

    def test_lines_sorted_by_azimuth(self):
        planets = {
            "sun": (100.0, 10.0),
            "moon": (200.0, -5.0),
            "mars": (50.0, 15.0),
        }
        result = compute_local_space(planets, 0.0, 0.0, lst_deg=100.0)
        azs = [l.azimuth_deg for l in result.lines]
        assert azs == sorted(azs)

    def test_above_below_count(self):
        # Mix of planets above/below horizon
        planets = {
            "a": (0.0, 0.0),    # near transit → above
            "b": (0.0, 0.0),    # same → above
        }
        # LST=0 → H=0 for RA=0 → both near transit
        result = compute_local_space(planets, 45.0, 0.0, lst_deg=0.0)
        assert result.total_above == 2
        assert result.total_below == 0

    def test_planet_carries_sector(self):
        planets = {"sun": (100.0, 10.0)}
        result = compute_local_space(planets, 52.3, 76.95, lst_deg=120.0)
        assert result.lines[0].sector in ("N", "NE", "E", "SE", "S", "SW", "W", "NW")

    def test_planet_carries_above_horizon_flag(self):
        planets = {"sun": (0.0, 0.0)}
        result = compute_local_space(planets, 45.0, 0.0, lst_deg=0.0)
        assert result.lines[0].above_horizon is True

    def test_empty_planets(self):
        result = compute_local_space({}, 45.0, 0.0, lst_deg=100.0)
        assert len(result.lines) == 0
        assert result.total_above == 0
