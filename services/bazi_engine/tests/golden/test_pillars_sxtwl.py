"""Golden tests: BaZi pillar computation verified against sxtwl.

sxtwl (https://github.com/yuangu/sxtwl) is the canonical C++ Chinese
astronomy library wrapped in Python, used as ground truth by production BaZi
calculators. We compare our pure-Python domain math against it across a
spread of dates spanning decades and the Lichun boundary.

If ANY of these break, something fundamental changed in the pillar math —
investigate before updating expected values.
"""
from __future__ import annotations

from datetime import date

import pytest

# sxtwl is a dev/test-only dependency — NOT imported by production code.
sxtwl = pytest.importorskip("sxtwl")

from services.bazi_engine.domain import pillars as P
from services.bazi_engine.domain.constants import STEMS, BRANCHES


# Ground truth collected from sxtwl (see collection script in commit history).
# Each row: (y, m, d, tst_hour, year_tg, year_dz, month_tg, month_dz,
#            day_tg, day_dz, hour_tg, hour_dz)
GOLDEN = [
    # Pavlodar case: TST 14:47 → hour 14
    (1989, 4, 15, 14, 5, 5, 4, 4, 1, 5, 9, 7),
    # Same date, naive clock hour 16 (would give WRONG hour pillar)
    (1989, 4, 15, 16, 5, 5, 4, 4, 1, 5, 0, 8),
    # Pre-Lichun 1984 → year is still 癸亥 (1983 BaZi year)
    (1984, 2, 2, 12, 9, 11, 1, 1, 2, 2, 0, 6),
    # Post-Lichun 1984 → year becomes 甲子 (1984 BaZi year)
    (1984, 2, 5, 12, 0, 0, 2, 2, 5, 5, 6, 6),
    # Modern anchors
    (2000, 1, 7, 12, 5, 3, 3, 1, 0, 0, 6, 6),
    (2024, 2, 10, 12, 0, 4, 2, 2, 0, 4, 6, 6),
    (1990, 6, 15, 13, 6, 6, 8, 6, 7, 11, 1, 7),
]


def _sexagenary_index(tg: int, dz: int) -> int:
    for i in range(60):
        if i % 10 == tg and i % 12 == dz:
            return i
    raise AssertionError(f"bad tg/dz: {tg}/{dz}")


@pytest.mark.parametrize("y,m,d,h,yt,yz,mt,mz,dt,dz,ht,hz", GOLDEN)
class TestPillarsVsSxtwl:

    def test_day_pillar_matches(self, y, m, d, h, yt, yz, mt, mz, dt, dz, ht, hz):
        """Day pillar: our formula vs sxtwl."""
        ours = P.day_pillar(date(y, m, d))
        assert ours.stem == STEMS[dt], \
            f"day stem {date(y,m,d)}: ours={ours.stem} expected={STEMS[dt]}"
        assert ours.branch == BRANCHES[dz], \
            f"day branch {date(y,m,d)}: ours={ours.branch} expected={BRANCHES[dz]}"

    def test_hour_pillar_matches(self, y, m, d, h, yt, yz, mt, mz, dt, dz, ht, hz):
        """Hour pillar computed from day pillar + TST hour vs sxtwl."""
        day = P.day_pillar(date(y, m, d))
        ours = P.hour_pillar(day, h)
        assert ours.stem == STEMS[ht], \
            f"hour stem (tst={h}): ours={ours.stem} expected={STEMS[ht]}"
        assert ours.branch == BRANCHES[hz], \
            f"hour branch (tst={h}): ours={ours.branch} expected={BRANCHES[hz]}"


class TestPavlodarTstVsNaive:
    """The load-bearing assertion: TST 14 and naive clock 16 give DIFFERENT
    hour pillars — exactly why True Solar Time matters for BaZi."""

    def test_tst_and_naive_hour_pillars_differ(self):
        day = P.day_pillar(date(1989, 4, 15))
        from_tst = P.hour_pillar(day, 14)    # wei hour (correct, from TST)
        from_naive = P.hour_pillar(day, 16)  # shen hour (wrong, from clock)
        assert from_tst.branch != from_naive.branch
        assert from_tst.stem != from_naive.stem
        # Sanity: branch names match expectation
        assert from_tst.branch.value == "wei"
        assert from_naive.branch.value == "shen"


# --------------------------------------------------------------------------- #
# Year pillar: must respect the Lichun boundary (sxtwl agrees)
# --------------------------------------------------------------------------- #
class TestYearPillarLichun:
    def test_pre_lichun_uses_previous_bazi_year(self):
        # 1984-02-02 is BEFORE Lichun (Feb 4) → still 癸亥 year
        p = P.year_pillar(1984, after_lichun=False)
        assert p.stem == STEMS[9]   # 癸
        assert p.branch == BRANCHES[11]  # 亥

    def test_post_lichun_uses_new_bazi_year(self):
        # 1984-02-05 is AFTER Lichun → 甲子 year
        p = P.year_pillar(1984, after_lichun=True)
        assert p.stem == STEMS[0]   # 甲
        assert p.branch == BRANCHES[0]  # 子

    @pytest.mark.parametrize("year,stem_idx,branch_idx", [
        (1984, 0, 0),    # 甲子
        (2024, 0, 4),    # 甲辰
        (1989, 5, 5),    # 己巳
        (2000, 6, 4),    # 庚辰 — (2000-4)%10=6 → GENG, %12=4 → CHEN
        (1990, 6, 6),    # 辛未
    ])
    def test_year_matches_formula(self, year, stem_idx, branch_idx):
        """Year-pillar formula check (independent of Lichun boundary).

        sxtwl returns the BaZi year (post-Lichun) for solar dates AFTER Lichun;
        for January dates it returns the previous BaZi year. Here we verify the
        pure formula (year-4) mod 10/12, which is what year_pillar(year, True)
        computes for the post-Lichun case.
        """
        p = P.year_pillar(year, after_lichun=True)
        assert p.stem == STEMS[stem_idx]
        assert p.branch == BRANCHES[branch_idx]


# --------------------------------------------------------------------------- #
# Sexagenary cycle integrity
# --------------------------------------------------------------------------- #
class TestSexagenaryCycle:
    def test_cycle_length_60(self):
        seen = {P.pillar_at(i) for i in range(60)}
        assert len(seen) == 60

    def test_start_is_jia_zi(self):
        p = P.pillar_at(0)
        assert p.stem == STEMS[0]      # 甲
        assert p.branch == BRANCHES[0]  # 子

    def test_end_is_gui_hai(self):
        p = P.pillar_at(59)
        assert p.stem == STEMS[9]      # 癸
        assert p.branch == BRANCHES[11]  # 亥

    def test_polarity_pairs(self):
        # In the cycle, stem and branch polarity ALWAYS match (yang-yang, yin-yin).
        for i in range(60):
            p = P.pillar_at(i)
            stem_idx = STEMS.index(p.stem)
            branch_idx = BRANCHES.index(p.branch)
            assert stem_idx % 2 == branch_idx % 2, \
                f"polarity mismatch at index {i}: {p}"
