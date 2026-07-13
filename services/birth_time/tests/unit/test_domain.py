"""Unit tests for the domain layer.

Domain tests must be PURE: no I/O, no network, no clock, no zoneinfo.
They assert invariants on value objects and the pure shichen mapping.
"""
from __future__ import annotations

from datetime import date, time

import pytest

from services.birth_time.domain import entities as E


# --------------------------------------------------------------------------- #
# Coordinates
# --------------------------------------------------------------------------- #
class TestCoordinates:
    def test_longitude_offset_seconds_pavlodar(self):
        # Pavlodar 76.95°E → 5h07m48s = 18468 seconds
        c = E.Coordinates(52.30, 76.95)
        assert c.longitude_offset_seconds() == pytest.approx(18468.0, abs=0.5)

    def test_greenwich_zero_offset(self):
        assert E.Coordinates(51.47, 0.0).longitude_offset_seconds() == 0.0

    def test_western_longitude_negative(self):
        # Lisbon ~9.14°W → negative
        assert E.Coordinates(38.72, -9.14).longitude_offset_seconds() < 0

    @pytest.mark.parametrize("bad_lat", [-90.1, 90.1, 999])
    def test_latitude_out_of_range(self, bad_lat):
        with pytest.raises(ValueError, match="latitude"):
            E.Coordinates(bad_lat, 0.0)

    @pytest.mark.parametrize("bad_lng", [-180.1, 180.1, 999])
    def test_longitude_out_of_range(self, bad_lng):
        with pytest.raises(ValueError, match="longitude"):
            E.Coordinates(0.0, bad_lng)

    def test_frozen_immutable(self):
        c = E.Coordinates(1.0, 2.0)
        with pytest.raises(Exception):
            c.lat = 9.0  # type: ignore[misc]


# --------------------------------------------------------------------------- #
# Place
# --------------------------------------------------------------------------- #
class TestPlace:
    def _coords(self):
        return E.Coordinates(52.30, 76.95)

    def test_valid_place(self):
        p = E.Place("Павлодар", "KZ", self._coords(), "Asia/Almaty")
        assert p.name == "Павлодар"
        assert p.iana_zone == "Asia/Almaty"

    def test_missing_zone_rejected(self):
        with pytest.raises(ValueError, match="iana_zone"):
            E.Place("X", "Y", self._coords(), "")

    def test_missing_name_rejected(self):
        with pytest.raises(ValueError, match="name"):
            E.Place("", "Y", self._coords(), "Asia/Almaty")


# --------------------------------------------------------------------------- #
# BirthInput
# --------------------------------------------------------------------------- #
class TestBirthInput:
    def _place(self):
        return E.Place("Павлодар", "KZ", E.Coordinates(52.30, 76.95), "Asia/Almaty")

    def test_valid_input(self):
        bi = E.BirthInput(date(1989, 4, 15), time(16, 40), self._place())
        assert bi.naive_local().year == 1989

    def test_future_date_rejected(self):
        far_future = date(2999, 1, 1)
        with pytest.raises(ValueError, match="future"):
            E.BirthInput(far_future, time(12), self._place())

    def test_unknown_time_quality_allowed(self):
        bi = E.BirthInput(date(1989, 4, 15), time(0, 0), self._place(),
                          E.TimeQuality.UNKNOWN)
        assert bi.time_quality == E.TimeQuality.UNKNOWN


# --------------------------------------------------------------------------- #
# shichen_for_tst — table-driven
# --------------------------------------------------------------------------- #
class TestShichen:
    @pytest.mark.parametrize("tst,expected", [
        (time(14, 47), E.Shichen.WEI),   # the Pavlodar case → wei
        (time(16, 40), E.Shichen.SHEN),  # naive clock would give shen
        (time(13, 0),  E.Shichen.WEI),
        (time(14, 59), E.Shichen.WEI),
        (time(15, 0),  E.Shichen.SHEN),
        (time(11, 0),  E.Shichen.WU),
        (time(12, 59), E.Shichen.WU),
        (time(5, 0),   E.Shichen.MAO),
        (time(23, 30), E.Shichen.ZI),    # wraps
        (time(0, 30),  E.Shichen.ZI),    # wraps
        (time(1, 0),   E.Shichen.CHOU),
    ])
    def test_mapping(self, tst, expected):
        assert E.shichen_for_tst(tst) == expected

    def test_none_returns_none(self):
        assert E.shichen_for_tst(None) is None

    def test_pavlodar_tst_is_wei(self):
        # The load-bearing assertion from the spec: TST 14:47 ⇒ wei,
        # while naive clock 16:40 ⇒ shen. Different pillar.
        assert E.shichen_for_tst(time(14, 47)) == E.Shichen.WEI
        assert E.shichen_for_tst(time(16, 40)) == E.Shichen.SHEN
