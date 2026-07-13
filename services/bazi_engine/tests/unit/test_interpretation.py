"""Unit tests for BaZi interpretation: Ten Gods, Day Master, favorable elements."""
from __future__ import annotations

import pytest

from services.bazi_engine.domain import interpretation as I
from services.bazi_engine.domain.constants import (
    Element, Polarity, Stem, STEM_HANZI,
)
from services.bazi_engine.domain.pillars import Pillar, day_pillar
from services.bazi_engine.domain.constants import Branch


# --------------------------------------------------------------------------- #
# Ten Gods — table-driven, fully deterministic
# --------------------------------------------------------------------------- #
class TestTenGod:
    # (day_master_stem, other_stem, expected_ten_god)
    @pytest.mark.parametrize("dm, other, expected", [
        # DM = 甲 (yang wood)
        (Stem.JIA, Stem.JIA, I.TenGod.FRIEND),           # same elem, same pol
        (Stem.JIA, Stem.YI,  I.TenGod.ROB_WEALTH),       # same elem, opp pol
        (Stem.JIA, Stem.BING, I.TenGod.EATING_GOD),      # wood generates fire, yang
        (Stem.JIA, Stem.DING, I.TenGod.HURTING_OFFICER), # wood generates fire, yin
        (Stem.JIA, Stem.REN,  I.TenGod.INDIRECT_RESOURCE), # water generates wood, yang
        (Stem.JIA, Stem.GUI,  I.TenGod.DIRECT_RESOURCE),   # water generates wood, yin
        (Stem.JIA, Stem.GENG, I.TenGod.SEVEN_KILLINGS),  # metal controls wood, yang
        (Stem.JIA, Stem.XIN,  I.TenGod.DIRECT_OFFICER),  # metal controls wood, yin
        (Stem.JIA, Stem.WU,   I.TenGod.INDIRECT_WEALTH), # wood controls earth, yang
        (Stem.JIA, Stem.JI,   I.TenGod.DIRECT_WEALTH),   # wood controls earth, yin
        # DM = 丙 (yang fire) — spot-check
        (Stem.BING, Stem.BING, I.TenGod.FRIEND),
        (Stem.BING, Stem.DING, I.TenGod.ROB_WEALTH),
        (Stem.BING, Stem.WU,   I.TenGod.EATING_GOD),    # fire generates earth
        (Stem.BING, Stem.GENG, I.TenGod.INDIRECT_WEALTH), # fire controls metal, yang
        # DM = 癸 (yin water)
        (Stem.GUI, Stem.GUI,  I.TenGod.FRIEND),
        (Stem.GUI, Stem.REN,  I.TenGod.ROB_WEALTH),      # same elem, opp pol
        (Stem.GUI, Stem.JIA,  I.TenGod.HURTING_OFFICER), # water generates wood, DM yin / wood yang
    ])
    def test_ten_god_classification(self, dm, other, expected):
        assert I.ten_god(dm, other) == expected

    def test_all_10_gods_attainable(self):
        """For a given DM, all 10 Ten Gods appear across the other 9 stems."""
        dm = Stem.JIA
        gods = {I.ten_god(dm, s) for s in Stem}
        assert gods == set(I.TenGod)

    def test_symmetry_companion_only(self):
        """FRIEND/ROB_WEALTH is the only category that's element-symmetric."""
        assert I.ten_god(Stem.JIA, Stem.YI) == I.TenGod.ROB_WEALTH
        assert I.ten_god(Stem.YI, Stem.JIA) == I.TenGod.ROB_WEALTH


# --------------------------------------------------------------------------- #
# Day Master profile
# --------------------------------------------------------------------------- #
class TestDayMasterProfile:
    def test_jia_day_master(self):
        p = Pillar(stem=Stem.JIA, branch=Branch.ZI)
        prof = I.day_master_profile(p)
        assert prof.stem == Stem.JIA
        assert prof.element == Element.WOOD
        assert prof.polarity == Polarity.YANG
        assert prof.hanzi == "甲"
        assert prof.label == "yang_wood"

    def test_gui_day_master(self):
        p = Pillar(stem=Stem.GUI, branch=Branch.HAI)
        prof = I.day_master_profile(p)
        assert prof.element == Element.WATER
        assert prof.polarity == Polarity.YIN
        assert prof.label == "yin_water"

    def test_pavlodar_day_master(self):
        # 1989-04-15 → day pillar = 乙巳 (verified by sxtwl)
        p = day_pillar(__import__("datetime").date(1989, 4, 15))
        prof = I.day_master_profile(p)
        assert prof.stem == Stem.YI
        assert prof.label == "yin_wood"


# --------------------------------------------------------------------------- #
# Favorable elements (heuristic)
# --------------------------------------------------------------------------- #
class TestFavorableElements:
    def test_wood_dm_gets_water_mother(self):
        # DM = wood. Mother (generates wood) = water.
        fav = I.favorable_elements(Element.WOOD)
        assert Element.WATER in fav

    def test_fire_dm_gets_wood_mother(self):
        fav = I.favorable_elements(Element.FIRE)
        assert Element.WOOD in fav

    def test_returns_two_distinct(self):
        for el in Element:
            fav = I.favorable_elements(el)
            assert len(fav) == 2
            assert len(set(fav)) == 2
