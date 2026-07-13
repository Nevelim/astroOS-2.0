"""Golden tests — frozen reference values against REAL adapters.

These are the load-bearing tests: they wire the actual ZoneInfoResolver,
NoaaSolarProvider and TzdataVersion (not fakes) and assert that the entire
chain produces the spec-verified numbers for the canonical case:
Pavlodar, 15 April 1989, 16:40 local.

If any of these break, something in the timezone database, the EoT formula,
or the pipeline changed — investigate before touching the expected values.

Verified externally:
  - 1989 USSR DST: active on 15 Apr (started 26 Mar, ended 24 Sep) → +07:00
  - UTC          = 09:40
  - LMT (76.95°E)= UTC + 5h07m48s = 14:47:48
  - EoT (15 Apr) ≈ -0.24 min (zero-crossing)
  - TST          = LMT + EoT ≈ 14:47:33
  - BaZi shichen = WEI (13:00-15:00) — NOT SHEN, which naive clock would give
"""
from __future__ import annotations

from datetime import date, time

import pytest

from services.birth_time.adapter.solar_time import NoaaSolarProvider
from services.birth_time.adapter.timezone_resolver import (
    TzdataVersion,
    ZoneInfoResolver,
)
from services.birth_time.domain.entities import (
    AmbiguityReason,
    BirthInput,
    Coordinates,
    Place,
    Shichen,
)
from services.birth_time.usecase.resolve_birth_time import ResolveBirthTime


@pytest.fixture(scope="module")
def resolver() -> ResolveBirthTime:
    return ResolveBirthTime(
        tz_resolver=ZoneInfoResolver(),
        solar=NoaaSolarProvider(),
        tzdata=TzdataVersion(),
    )


def _pavlodar() -> Place:
    return Place("Павлодар", "KZ", Coordinates(52.30, 76.95), "Asia/Almaty",
                 "geonames:1520132")


class TestPavlodarGolden:
    """The canonical verified case."""

    def test_full_chain_pavlodar(self, resolver: ResolveBirthTime):
        birth = BirthInput(date(1989, 4, 15), time(16, 40), _pavlodar())
        res = resolver.execute(birth)
        r = res.resolution

        # ---- UTC step ----
        assert r.utc.year == 1989 and r.utc.month == 4 and r.utc.day == 15
        assert r.utc.hour == 9 and r.utc.minute == 40, "UTC must be 09:40"
        assert r.utc_offset_minutes == 420, "active offset must be +07:00"
        assert r.dst_active is True, "DST must be active on 15 Apr 1989"

        # ---- LMT step: UTC + 5h07m48s = 14:47:48 ----
        assert r.local_mean_time.hour == 14
        assert r.local_mean_time.minute == 47
        # ±2s tolerance: longitude is rounded to 76.95°
        assert 45 <= r.local_mean_time.second <= 50, \
            f"LMT seconds off: {r.local_mean_time.second}"

        # ---- EoT: near-zero on 15 Apr (NOAA gives ~-0.2 min) ----
        assert -1.5 <= r.equation_of_time_minutes <= 0.0, \
            f"EoT out of expected range: {r.equation_of_time_minutes}"

        # ---- TST: LMT + EoT ≈ 14:47:33 ----
        assert r.true_solar_time.hour == 14
        assert r.true_solar_time.minute == 47
        assert r.true_solar_time.second < 50

        # ---- BaZi shichen: WEI, not SHEN ----
        assert res.bazi.shichen == Shichen.WEI
        assert "wei" in res.bazi.note and "shen" in res.bazi.note

        # ---- Immutability / determinism ----
        res2 = resolver.execute(birth)
        assert res2.birth_data_hash == res.birth_data_hash

        # ---- tzdata version captured ----
        assert r.tzdata_version and r.tzdata_version != "unknown"

        # ---- Ambiguity: 15 Apr is unambiguous ----
        assert r.ambiguity is AmbiguityReason.NONE


class TestEoTZeroCrossings:
    """The Equation of Time crosses zero near 15 Apr, 13 Jun, 1 Sep, 25 Dec.
    Assert the sign flips on the right side of those dates for sanity."""

    @pytest.mark.parametrize("month,day,sign", [
        (2, 12, -1),    # mid-Feb minimum (~ -14 min)
        (4, 15, 0),     # near zero (allow either sign)
        (5, 15, 1),     # positive
        (11, 3, 1),     # near maximum (~ +16 min)
    ])
    def test_eot_sign(self, resolver: ResolveBirthTime, month, day, sign):
        from datetime import datetime, timezone
        utc = datetime(2024, month, day, 12, 0, tzinfo=timezone.utc).replace(tzinfo=None)
        eot = resolver.solar.equation_of_time_minutes(utc)
        if sign == -1:
            assert eot < 0
        elif sign == 1:
            assert eot > 0
        else:
            assert abs(eot) < 3.0


class TestDSTEdges:
    """Real DST fold/gap detection via zoneinfo."""

    def test_spring_gap_europe_london(self, resolver: ResolveBirthTime):
        # UK DST started 26 Mar 1989 at 01:00 GMT → 02:00 BST.
        # 02:30 on that day did NOT exist (gap).
        from datetime import datetime
        zr = resolver.tz_resolver
        naive = datetime(1989, 3, 26, 2, 30)
        res = zr.resolve(naive, "Europe/London")
        assert res.ambiguity is AmbiguityReason.DST_GAP

    def test_autumn_fold_europe_london(self, resolver: ResolveBirthTime):
        # UK DST ended 29 Oct 1989 at 02:00 BST → 01:00 GMT.
        # 01:30 occurred twice (fold).
        from datetime import datetime
        zr = resolver.tz_resolver
        naive = datetime(1989, 10, 29, 1, 30)
        res = zr.resolve(naive, "Europe/London")
        assert res.ambiguity is AmbiguityReason.DST_FOLD

    def test_unambiguous_summer(self, resolver: ResolveBirthTime):
        from datetime import datetime
        zr = resolver.tz_resolver
        naive = datetime(1989, 7, 1, 12, 0)
        res = zr.resolve(naive, "Europe/London")
        assert res.ambiguity is AmbiguityReason.NONE
        assert res.dst_active is True


class TestGlobalCoverage:
    """Smoke tests across geographies the service must handle."""

    @pytest.mark.parametrize("zone,lat,lng,exp_offset_min", [
        ("Asia/Kolkata",   19.07,  72.87,  330),   # India +05:30, no DST ever
        ("Asia/Shanghai",  39.91, 116.40,  480),   # China +08:00, no DST
        ("America/New_York", 40.71, -74.01, None), # DST-dependent → skip exact
        ("Europe/Madrid",  40.42,  -3.70, None),
    ])
    def test_offset_in_expected_range(self, resolver, zone, lat, lng, exp_offset_min):
        from datetime import date as d
        birth = BirthInput(
            d(2024, 6, 15), time(12, 0),
            Place("X", "Y", Coordinates(lat, lng), zone),
        )
        res = resolver.execute(birth)
        if exp_offset_min is not None:
            assert res.resolution.utc_offset_minutes == exp_offset_min
        else:
            # Just assert it resolved to something plausible (whole hours).
            assert res.resolution.utc_offset_minutes % 60 == 0 or \
                   res.resolution.utc_offset_minutes % 30 == 0
