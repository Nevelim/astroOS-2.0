"""Unit tests for ResolveBirthTime use case.

Uses FAKE ports — no real zoneinfo, no real EoT. This guarantees the test
is pure, fast, deterministic. The real adapters are exercised in integration
tests; the golden Pavlodar case is its own file.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Optional

import pytest

from services.birth_time.domain.entities import (
    AmbiguityReason,
    BirthInput,
    Coordinates,
    Place,
    Shichen,
    TimeQuality,
)
from services.birth_time.usecase.resolve_birth_time import (
    ResolveBirthTime,
    ZoneResolution,
    _birth_data_hash,
)


# --------------------------------------------------------------------------- #
# Fakes — stand in for adapters, no I/O
# --------------------------------------------------------------------------- #
@dataclass
class FakeTzResolver:
    """Returns a canned ZoneResolution for a given zone."""
    offset_minutes: int = 420            # +07:00 (Pavlodar DST)
    dst_active: bool = True
    ambiguity: AmbiguityReason = AmbiguityReason.NONE
    note: str = ""

    def resolve(self, naive_local: datetime, iana_zone: str) -> ZoneResolution:
        utc = naive_local - timedelta(minutes=self.offset_minutes)
        return ZoneResolution(
            utc=utc.replace(tzinfo=None),   # keep UTC naive for downstream math
            utc_offset_minutes=self.offset_minutes,
            dst_active=self.dst_active,
            ambiguity=self.ambiguity,
            note=self.note,
        )


@dataclass
class FakeSolar:
    eot: float = -0.24                    # Pavlodar 15 Apr value

    def equation_of_time_minutes(self, utc: datetime) -> float:
        return self.eot


@dataclass
class FakeTzdata:
    v: str = "2026a"

    def version(self) -> str:
        return self.v


def _pavlodar() -> Place:
    return Place(
        name="Павлодар",
        country="KZ",
        coordinates=Coordinates(52.30, 76.95),
        iana_zone="Asia/Almaty",
        place_id="geonames:1520132",
    )


# --------------------------------------------------------------------------- #
# Hash
# --------------------------------------------------------------------------- #
class TestBirthDataHash:
    def test_deterministic(self):
        b = BirthInput(date(1989, 4, 15), time(16, 40), _pavlodar())
        h1 = _birth_data_hash(b, "2026a", -0.24)
        h2 = _birth_data_hash(b, "2026a", -0.24)
        assert h1 == h2
        assert h1.startswith("sha256:")

    def test_changes_with_eot(self):
        b = BirthInput(date(1989, 4, 15), time(16, 40), _pavlodar())
        h1 = _birth_data_hash(b, "2026a", -0.24)
        h2 = _birth_data_hash(b, "2026a", 3.5)
        assert h1 != h2

    def test_changes_with_tzdata_version(self):
        b = BirthInput(date(1989, 4, 15), time(16, 40), _pavlodar())
        assert (_birth_data_hash(b, "2026a", -0.24)
                != _birth_data_hash(b, "2026b", -0.24))

    def test_changes_with_place(self):
        p2 = Place("X", "Y", Coordinates(40.0, -3.7), "Europe/Madrid")
        b1 = BirthInput(date(1989, 4, 15), time(16, 40), _pavlodar())
        b2 = BirthInput(date(1989, 4, 15), time(16, 40), p2)
        assert (_birth_data_hash(b1, "2026a", -0.24)
                != _birth_data_hash(b2, "2026a", -0.24))


# --------------------------------------------------------------------------- #
# ResolveBirthTime — the Pavlodar case via fakes (golden mirror)
# --------------------------------------------------------------------------- #
class TestResolveBirthTimePavlodar:
    def setup_method(self):
        self.uc = ResolveBirthTime(
            tz_resolver=FakeTzResolver(offset_minutes=420, dst_active=True),
            solar=FakeSolar(eot=-0.24),
            tzdata=FakeTzdata("2026a"),
        )
        self.birth = BirthInput(date(1989, 4, 15), time(16, 40), _pavlodar())
        self.res = self.uc.execute(self.birth)

    def test_utc_is_0940(self):
        # 16:40 − 07:00 = 09:40 UTC
        assert self.res.resolution.utc.hour == 9
        assert self.res.resolution.utc.minute == 40

    def test_offset_and_dst(self):
        assert self.res.resolution.utc_offset_minutes == 420
        assert self.res.resolution.dst_active is True

    def test_lmt_is_around_1447(self):
        # UTC 09:40 + 5h07m48s = 14:47:48
        lmt = self.res.resolution.local_mean_time
        assert lmt.hour == 14
        assert lmt.minute == 47
        assert abs(lmt.second - 48) <= 1

    def test_tst_is_around_1447_minus_eot(self):
        # TST = LMT + EoT (EoT = -0.24 min = -14.4 s) → 14:47:33-34
        tst = self.res.resolution.true_solar_time
        assert tst.hour == 14
        assert tst.minute == 47
        assert abs(tst.second - 34) <= 1

    def test_shichen_is_wei(self):
        assert self.res.bazi.shichen == Shichen.WEI

    def test_bazi_note_warns_about_shen(self):
        assert "wei" in self.res.bazi.note
        assert "shen" in self.res.bazi.note

    def test_hash_present_and_stable(self):
        assert self.res.birth_data_hash.startswith("sha256:")
        res2 = self.uc.execute(self.birth)
        assert res2.birth_data_hash == self.res.birth_data_hash

    def test_etag_uses_hash(self):
        assert self.res.etag() == self.res.birth_data_hash

    def test_summary_contains_place(self):
        assert "Павлодар" in self.res.input_summary


# --------------------------------------------------------------------------- #
# Edge: ambiguity propagation
# --------------------------------------------------------------------------- #
class TestAmbiguityPropagation:
    def test_dst_fold_flagged(self):
        uc = ResolveBirthTime(
            tz_resolver=FakeTzResolver(
                offset_minutes=420,
                dst_active=False,
                ambiguity=AmbiguityReason.DST_FOLD,
                note="02:30 existed twice",
            ),
            solar=FakeSolar(),
            tzdata=FakeTzdata(),
        )
        res = uc.execute(BirthInput(date(1989, 9, 24), time(2, 30), _pavlodar()))
        assert res.resolution.ambiguity is AmbiguityReason.DST_FOLD
        assert "twice" in res.resolution.ambiguity_note

    def test_dst_gap_flagged(self):
        uc = ResolveBirthTime(
            tz_resolver=FakeTzResolver(ambiguity=AmbiguityReason.DST_GAP),
            solar=FakeSolar(),
            tzdata=FakeTzdata(),
        )
        res = uc.execute(BirthInput(date(1989, 3, 26), time(2, 30), _pavlodar()))
        assert res.resolution.ambiguity is AmbiguityReason.DST_GAP


# --------------------------------------------------------------------------- #
# Edge: unknown time quality is carried through (no hour pillar preferred)
# --------------------------------------------------------------------------- #
class TestUnknownTimeQuality:
    def test_unknown_quality_flows_through(self):
        uc = ResolveBirthTime(
            tz_resolver=FakeTzResolver(offset_minutes=420),
            solar=FakeSolar(eot=0.0),
            tzdata=FakeTzdata(),
        )
        birth = BirthInput(
            date(1989, 4, 15), time(12, 0), _pavlodar(),
            time_quality=TimeQuality.UNKNOWN,
        )
        res = uc.execute(birth)
        # Use case doesn't branch on quality (the BaZi engine does), but
        # the field must be preserved on input for downstream serialization.
        assert birth.time_quality == TimeQuality.UNKNOWN
        assert res.resolution.utc is not None
