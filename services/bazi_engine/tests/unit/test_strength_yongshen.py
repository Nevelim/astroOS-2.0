"""Unit tests for Day Master strength analysis + Yong Shen selection.

Validates the traditional 扶抑 method: a weak DM gets support (Resource+
Companion), a strong DM gets drainage (Output+Wealth+Officer). The strength
scoring follows 得令/得地/得势 (season/roots/allies) as the literature requires.
"""
from __future__ import annotations

import pytest

from services.bazi_engine.domain.constants import Branch, Element, Stem
from services.bazi_engine.domain.strength import (
    DayMasterStrength,
    assess_strength,
)
from services.bazi_engine.domain.yong_shen import select_yong_shen


class TestSeasonalFactor:
    """得令 — the month branch is the heaviest factor."""

    def test_dm_in_season_is_strong(self):
        """甲 (wood) born in 卯 (wood month) → in season → strong support."""
        a = assess_strength(Stem.JIA, Branch.MAO,
                            year_branch=Branch.MAO, day_branch=Branch.MAO)
        assert a.seasonal_support is True
        assert a.score > 0

    def test_dm_generated_by_season_supported(self):
        """甲 (wood) born in 子 (water month) → water generates wood → supported."""
        a = assess_strength(Stem.JIA, Branch.ZI)
        assert a.seasonal_support is True

    def test_dm_controlled_by_season_penalized(self):
        """甲 (wood) born in 酉 (metal month) → metal controls wood → penalty."""
        a = assess_strength(Stem.JIA, Branch.YOU)
        assert a.seasonal_support is False
        assert a.score < 0

    def test_dm_drained_by_season(self):
        """甲 (wood) born in 午 (fire month) → wood generates fire → drained."""
        a = assess_strength(Stem.JIA, Branch.WU)
        assert a.seasonal_support is False
        assert a.score < 0


class TestRootednessFactor:
    """得地 — branches containing DM element give roots."""

    def test_roots_boost_score(self):
        """甲 (wood) with 寅/卯 branches → rooted."""
        a = assess_strength(Stem.JIA, Branch.YIN,
                            year_branch=Branch.MAO, day_branch=Branch.YIN)
        assert a.rooted is True

    def test_no_roots_when_branches_differ(self):
        a = assess_strength(Stem.JIA, Branch.YOU,
                            year_branch=Branch.SHEN, day_branch=Branch.XU)
        assert a.rooted is False


class TestAllyFactor:
    """得势 — allied stems (same element or mother) add momentum."""

    def test_allies_boost_score(self):
        """甲 (wood) with 乙 (wood) year stem + 壬 (water) hour stem → allied."""
        a = assess_strength(Stem.JIA, Branch.YOU,
                            year_stem=Stem.YI, hour_stem=Stem.REN)
        assert a.allied is True

    def test_no_allies_when_isolated(self):
        a = assess_strength(Stem.JIA, Branch.YOU,
                            year_stem=Stem.GENG, hour_stem=Stem.DING)
        assert a.allied is False


class TestStrengthClassification:
    def test_strong_chart(self):
        """甲 wood in 卯 month with wood branches and allies → strong."""
        a = assess_strength(Stem.JIA, Branch.MAO,
                            year_branch=Branch.YIN, day_branch=Branch.MAO,
                            year_stem=Stem.YI)
        assert a.strength is DayMasterStrength.STRONG

    def test_weak_chart(self):
        """甲 wood in 酉 (metal) month, no roots, no allies → weak."""
        a = assess_strength(Stem.JIA, Branch.YOU,
                            year_branch=Branch.SHEN, day_branch=Branch.XU,
                            year_stem=Stem.GENG, hour_stem=Stem.XIN)
        assert a.strength is DayMasterStrength.WEAK

    def test_score_range(self):
        """Score should be within a reasonable range."""
        a = assess_strength(Stem.JIA, Branch.MAO)
        assert -100 <= a.score <= 100


class TestYongShenSelection:
    """The core 扶抑 rule: weak→support, strong→drain."""

    def test_weak_dm_gets_support_elements(self):
        """Weak wood DM → favorable includes water (mother/Resource) + wood (Companion)."""
        ys = select_yong_shen(Stem.JIA, Branch.YOU,
                              year_branch=Branch.SHEN, day_branch=Branch.XU,
                              year_stem=Stem.GENG, hour_stem=Stem.XIN)
        assert Element.WATER in ys.favorable   # mother (Resource)
        assert Element.WOOD in ys.favorable     # same element (Companion)
        assert ys.method == "support"
        # Unfavorable: fire (Output), earth (Wealth), metal (Officer)
        assert Element.FIRE in ys.unfavorable

    def test_strong_dm_gets_drain_elements(self):
        """Strong wood DM → favorable includes fire (Output), earth (Wealth), metal (Officer)."""
        ys = select_yong_shen(Stem.JIA, Branch.MAO,
                              year_branch=Branch.YIN, day_branch=Branch.MAO,
                              year_stem=Stem.YI)
        assert Element.FIRE in ys.favorable     # child (Output — drains)
        assert Element.EARTH in ys.favorable    # wealth (consumes)
        assert Element.METAL in ys.favorable    # officer (restrains)
        assert ys.method == "drain"
        # Unfavorable: water (mother, over-strengthens) + wood (companion)
        assert Element.WATER in ys.unfavorable

    def test_weak_and_strong_produce_opposite_favorables(self):
        """The same DM element yields opposite 用神 based on strength."""
        weak = select_yong_shen(Stem.JIA, Branch.YOU,
                                year_branch=Branch.SHEN, day_branch=Branch.XU,
                                year_stem=Stem.GENG, hour_stem=Stem.XIN)
        strong = select_yong_shen(Stem.JIA, Branch.MAO,
                                  year_branch=Branch.YIN, day_branch=Branch.MAO,
                                  year_stem=Stem.YI)
        # Water is favorable for the weak DM (support) but unfavorable for the strong one.
        assert Element.WATER in weak.favorable
        assert Element.WATER in strong.unfavorable

    def test_balanced_uses_mother_wealth_default(self):
        ys = select_yong_shen(Stem.JIA, Branch.CHEN,
                              year_branch=Branch.SI, day_branch=Branch.SI)
        # Balanced → mother + wealth
        assert len(ys.favorable) == 2

    def test_reasoning_is_informative(self):
        ys = select_yong_shen(Stem.BING, Branch.WU,
                              year_branch=Branch.SI, day_branch=Branch.WU,
                              year_stem=Stem.DING)
        assert "Bing" in ys.reasoning or "bing" in ys.reasoning
        assert "advisory" in ys.reasoning.lower()

    def test_all_stems_produce_valid_elements(self):
        """Every stem must produce a valid YongShen with known elements."""
        for stem in Stem:
            ys = select_yong_shen(stem, Branch.ZI)
            assert len(ys.favorable) >= 1
            assert all(isinstance(e, Element) for e in ys.favorable)
            assert all(isinstance(e, Element) for e in ys.unfavorable)


class TestReasoning:
    def test_reasoning_contains_three_factors(self):
        a = assess_strength(Stem.JIA, Branch.MAO)
        assert "得令" in a.reasoning or "seasonal" in a.reasoning.lower()
        assert "得地" in a.reasoning or "rooted" in a.reasoning.lower()
        assert "得势" in a.reasoning or "allies" in a.reasoning.lower()
