"""Unit tests for the three newly added BaZi domain modules:

  - clashes.py        — branch interactions (六冲 / 害 / 三刑 / 自刑)
  - interpretation.py — element balance (五行平衡) helpers
  - date_selection.py —择日 (date selection) + 流日 (daily forecast)
  - pillars.py        — annual pillars + luck start age (流年 / 起运)

Pure functions over Stem/Branch enums — no I/O, no astronomy. Table-driven
where the input space is a fixed reference table; class-grouped to mirror
test_strength_yongshen.py / test_interpretation.py.
"""
from __future__ import annotations

from datetime import date

import pytest

from services.bazi_engine.domain.clashes import (
    SIX_CLASHES,
    SIX_HARMS,
    Clash,
    detect_branch_interaction,
    find_clashes,
    is_high_risk_period,
)
from services.bazi_engine.domain.constants import (
    BRANCH_ELEMENT,
    STEM_ELEMENT,
    Branch,
    Element,
    Stem,
)
from services.bazi_engine.domain.date_selection import (
    GOAL_FAVORABLE_ELEMENTS,
    DateRating,
    daily_forecast,
    rate_date,
    select_dates,
)
from services.bazi_engine.domain import interpretation as I
from services.bazi_engine.domain.pillars import (
    FourPillars,
    Pillar,
    annual_pillar,
    annual_pillars_range,
    day_pillar,
    luck_start_age,
    year_pillar,
)


# --------------------------------------------------------------------------- #
# clashes.py — reference tables + detection
# --------------------------------------------------------------------------- #
class TestClashTables:
    """The six-clash / six-harm reference tables are frozen and exhaustive."""

    def test_six_clashes_has_exactly_six_pairs(self):
        assert len(SIX_CLASHES) == 6

    def test_six_harms_has_exactly_six_pairs(self):
        assert len(SIX_HARMS) == 6

    def test_clash_pairs_are_opposite_on_zodiac(self):
        """Each clash pair sits 6 positions apart (zodiac opposite)."""
        from services.bazi_engine.domain.constants import BRANCHES
        for pair in SIX_CLASHES:
            a, b = tuple(pair)
            assert abs(BRANCHES.index(a) - BRANCHES.index(b)) == 6


class TestDetectBranchInteraction:
    """detect_branch_interaction classifies any branch pair or returns None."""

    # (branch_a, branch_b, expected_kind) — None for harmonious pairs.
    @pytest.mark.parametrize("a, b, expected", [
        # Six clashes (六冲) — opposite branches.
        (Branch.ZI,   Branch.WU,   "clash"),
        (Branch.YIN,  Branch.SHEN, "clash"),
        # Six harms (害).
        (Branch.ZI,   Branch.WEI,  "harm"),
        # 寅-巳 is in the harms table, so the implementation classifies it as
        # "harm" (harm is checked before the punishment groups).
        (Branch.YIN,  Branch.SI,   "harm"),
        # Punishments (三刑): rude pair 子-卯, and a pair from the ungrateful
        # trio 巳-申 (neither of which is also a harm).
        (Branch.ZI,   Branch.MAO,  "punishment"),
        (Branch.SI,   Branch.SHEN, "punishment"),
        # Self-punishment (自刑): 辰-辰.
        (Branch.CHEN, Branch.CHEN, "self_punishment"),
        # Harmonious / no interaction.
        (Branch.ZI,   Branch.CHOU, None),
        (Branch.YOU,  Branch.ZI,   None),
    ])
    def test_interaction_classification(self, a, b, expected):
        assert detect_branch_interaction(a, b) == expected

    def test_detection_is_symmetric(self):
        """Interaction kind is order-independent (pairs are frozensets)."""
        for a, b in [(Branch.ZI, Branch.WU), (Branch.YIN, Branch.SI),
                     (Branch.CHEN, Branch.CHEN)]:
            assert detect_branch_interaction(a, b) == detect_branch_interaction(b, a)


class TestFindClashes:
    """find_clashes turns detected interactions into Clash records."""

    def test_clash_on_day_pillar_is_high_risk(self):
        """午 transiting a natal 子 on the DAY pillar → one high-severity clash."""
        clashes = find_clashes(transit_branch=Branch.WU,
                               natal_branches={"day": Branch.ZI})
        assert len(clashes) == 1
        c = clashes[0]
        assert isinstance(c, Clash)
        assert c.kind == "clash"
        assert c.severity == "high"
        assert "relocation" in c.risk_domains
        assert c.natal_pillar == "day"
        assert c.transit_branch == Branch.WU
        assert c.natal_branch == Branch.ZI

    def test_no_interaction_returns_empty(self):
        """YOU vs a natal ZI has no interaction → no clashes."""
        assert find_clashes(Branch.YOU, {"month": Branch.ZI}) == []

    def test_multiple_natal_branches_yield_multiple_clashes(self):
        """Transiting 午 clashes natal 子 AND harms natal 丑 simultaneously."""
        clashes = find_clashes(Branch.WU, {"day": Branch.ZI, "year": Branch.CHOU})
        kinds = {c.kind for c in clashes}
        assert kinds == {"clash", "harm"}


class TestIsHighRiskPeriod:
    """is_high_risk_period flags any high-severity transit interaction."""

    def test_day_clash_is_high_risk(self):
        assert is_high_risk_period(Branch.WU, {"day": Branch.ZI}) is True

    def test_no_interaction_is_not_high_risk(self):
        """YOU-ZI have no interaction at all → not high risk."""
        assert is_high_risk_period(Branch.YOU, {"month": Branch.ZI}) is False


# --------------------------------------------------------------------------- #
# interpretation.py — element balance (五行平衡)
# --------------------------------------------------------------------------- #
class TestElementBalance:
    """element_balance tallies the Five Elements across the Four Pillars."""

    @pytest.fixture
    def sample_chart(self) -> FourPillars:
        # year = 甲子 (wood / water), month = 丙寅 (fire / wood),
        # day   = 己巳 (earth / fire), hour = 癸亥 (water / water).
        # Day stem (己, earth) is weighted ×2 as the Day Master.
        return FourPillars(
            year=Pillar(stem=Stem.JIA, branch=Branch.ZI),
            month=Pillar(stem=Stem.BING, branch=Branch.YIN),
            day=Pillar(stem=Stem.JI, branch=Branch.SI),
            hour=Pillar(stem=Stem.GUI, branch=Branch.HAI),
        )

    def test_balance_has_all_five_elements(self, sample_chart):
        bal = I.element_balance(sample_chart)
        assert set(bal.keys()) == set(Element)

    def test_counts_sum_correctly(self, sample_chart):
        """4 pillars × 2 (stem+branch) = 8, plus 1 for the day-stem ×2 weight."""
        bal = I.element_balance(sample_chart)
        assert sum(bal.values()) == 9

    def test_day_stem_weighted_double(self, sample_chart):
        """己 (earth) appears once as a stem; weighting ×2 → earth count = 2."""
        bal = I.element_balance(sample_chart)
        # earth stems: 己 (day). branches with earth: none here. → 1 + 1 weight = 2.
        assert bal[Element.EARTH] == 2

    def test_explicit_counts(self, sample_chart):
        # wood:  JIA(stem) + YIN(branch) = 2
        # fire:  BING(stem) + SI(branch) = 2
        # earth: JI(stem) + JI weight = 2
        # water: GUI(stem) + ZI(branch) + HAI(branch) = 3
        # metal: 0
        bal = I.element_balance(sample_chart)
        assert bal[Element.WOOD] == 2
        assert bal[Element.FIRE] == 2
        assert bal[Element.WATER] == 3
        assert bal[Element.METAL] == 0

    def test_dominant_element(self, sample_chart):
        bal = I.element_balance(sample_chart)
        assert I.dominant_element(bal) is Element.WATER

    def test_deficient_elements_are_the_minima(self, sample_chart):
        bal = I.element_balance(sample_chart)
        deficient = I.deficient_elements(bal)
        # metal (0) is the lone minimum here.
        assert Element.METAL in deficient
        assert all(bal[e] == 0 for e in deficient)

    def test_empty_balance_defaults(self):
        assert I.dominant_element({}) is Element.WOOD
        assert I.deficient_elements({}) == []


# --------------------------------------------------------------------------- #
# date_selection.py — 择日 + 流日
# --------------------------------------------------------------------------- #
class TestDayPillarGolden:
    """day_pillar must match the sxtwl-verified golden value."""

    def test_2024_02_10_is_jia_chen(self):
        p = day_pillar(date(2024, 2, 10))
        assert p == Pillar(stem=Stem.JIA, branch=Branch.CHEN)


class TestRateDate:
    KNOWN_LABELS = {"excellent", "good", "neutral", "caution", "avoid"}

    def test_returns_date_rating_in_range(self):
        r = rate_date(date(2024, 2, 10), Stem.JIA, goal="business")
        assert isinstance(r, DateRating)
        assert -3 <= r.score <= 3
        assert r.label in self.KNOWN_LABELS

    def test_date_field_preserved(self):
        d = date(2024, 2, 10)
        assert rate_date(d, Stem.JIA, goal="business").date == d

    def test_goal_favorable_elements_has_all_six_goals(self):
        expected = {"business", "wedding", "relocation",
                    "health", "travel", "contract"}
        assert set(GOAL_FAVORABLE_ELEMENTS.keys()) == expected
        # every goal maps to a non-empty frozenset of Elements.
        for goal, fav in GOAL_FAVORABLE_ELEMENTS.items():
            assert isinstance(fav, frozenset) and len(fav) >= 1
            assert all(isinstance(e, Element) for e in fav)


class TestSelectDates:
    def test_returns_at_most_top_n_sorted_descending(self):
        res = select_dates(date(2024, 1, 1), Stem.JIA,
                           goal="business", days_ahead=30, top_n=3)
        assert len(res) <= 3
        # all retained dates are "good" or better (score >= 1).
        assert all(r.score >= 1 for r in res)
        # scores non-increasing (descending by score).
        scores = [r.score for r in res]
        assert scores == sorted(scores, reverse=True)

    def test_results_are_date_ratings(self):
        res = select_dates(date(2024, 1, 1), Stem.JIA,
                           goal="business", days_ahead=30, top_n=3)
        assert all(isinstance(r, DateRating) for r in res)


class TestDailyForecast:
    def test_returns_date_rating(self):
        f = daily_forecast(date(2024, 2, 10), Stem.JIA)
        assert isinstance(f, DateRating)
        assert -3 <= f.score <= 3

    def test_forecast_matches_rate_date_business(self):
        """daily_forecast is rate_date with the generic 'business' goal."""
        d = date(2024, 2, 10)
        assert (daily_forecast(d, Stem.JIA).score
                == rate_date(d, Stem.JIA, goal="business").score)


# --------------------------------------------------------------------------- #
# pillars.py — annual pillars (流年) + luck start age (起运)
# --------------------------------------------------------------------------- #
class TestAnnualPillar:
    def test_2024_is_jia_chen(self):
        p = annual_pillar(2024)
        assert p == Pillar(stem=Stem.JIA, branch=Branch.CHEN)

    def test_matches_year_pillar_post_lichun(self):
        """annual_pillar wraps year_pillar(year, after_lichun=True)."""
        for y in (2024, 1989, 2000, 1900):
            assert annual_pillar(y) == year_pillar(y, after_lichun=True)


class TestAnnualPillarsRange:
    def test_returns_year_pillar_pairs(self):
        seq = annual_pillars_range(2024, count=3)
        assert len(seq) == 3
        assert [y for y, _ in seq] == [2024, 2025, 2026]
        # every element is an (int, Pillar) tuple.
        for y, p in seq:
            assert isinstance(y, int)
            assert isinstance(p, Pillar)
        # first pair is the 2024 甲辰 anchor.
        assert seq[0][1] == Pillar(stem=Stem.JIA, branch=Branch.CHEN)

    def test_count_controls_length(self):
        assert len(annual_pillars_range(2024, count=5)) == 5
        assert annual_pillars_range(2024, count=0) == []


class TestLuckStartAge:
    def test_forward_distance_to_next_jieqi(self):
        """Birth 1989-04-15, forward luck → next JieQi 1989-05-05 = 20 days.

        Classical rule: 3 days ≈ 1 year → 20 / 3 ≈ 6.667.
        """
        age = luck_start_age(date(1989, 4, 15), True,
                             date(1989, 4, 5), date(1989, 5, 5))
        assert age == pytest.approx(6.667, abs=0.001)

    def test_backward_distance_to_prev_jieqi(self):
        """Backward luck → distance to the PREVIOUS JieQi (1989-04-05 = 10 days)."""
        age = luck_start_age(date(1989, 4, 15), False,
                             date(1989, 4, 5), date(1989, 5, 5))
        assert age == pytest.approx(10 / 3.0, abs=0.001)
