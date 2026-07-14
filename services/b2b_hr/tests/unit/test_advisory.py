"""Unit tests for B2B HR advisory functions: candidate / burnout / firing.

All three are pure functions over :class:`BaZiSummary` (Day Master element +
polarity only — never birth data). These tests also lock down the GDPR/AI Act
invariants: BaZi is advisory, and the firing disclaimer binds the decision to
HR/legal under GDPR Art.22 + local labor law.
"""
from __future__ import annotations

import pytest

from services.b2b_hr.domain.advisory import (
    BurnoutAssessment,
    CandidateReport,
    FiringAdvisory,
    burnout_risk,
    candidate_analysis,
    firing_advisory,
)
from services.b2b_hr.domain.entities import BaZiSummary, Element


def _bazi(element, polarity="yang"):
    return BaZiSummary(day_master_element=element, day_master_polarity=polarity)


class TestCandidateAnalysis:
    @pytest.mark.parametrize("element", list(Element))
    def test_return_type_and_ranges(self, element):
        r = candidate_analysis(_bazi(element), "operations")
        assert isinstance(r, CandidateReport)
        assert 0 <= r.element_fit <= 100
        assert r.verdict in {
            "recommended", "recommended_with_reservations", "not_recommended",
        }
        assert r.strengths   # always non-empty
        assert r.risks       # always non-empty
        assert r.recommended_role

    def test_high_fit_earth_operations_recommended(self):
        """Earth's stability(90)+execution(78) bottleneck = 78 → recommended."""
        r = candidate_analysis(_bazi(Element.EARTH), "operations")
        assert r.element_fit >= 75
        assert r.verdict == "recommended"
        assert len(r.strengths) >= 2
        assert len(r.risks) >= 2

    def test_low_fit_fire_finance_not_recommended(self):
        """Fire's stability(48)+execution(65) bottleneck = 48 → not recommended."""
        r = candidate_analysis(_bazi(Element.FIRE), "finance")
        assert r.element_fit < 50
        assert r.verdict == "not_recommended"
        assert r.strengths   # strengths are still reported even on a poor fit
        assert r.risks

    def test_mid_fit_water_sales_reservations(self):
        """Water's collaboration(80)+leadership(58) bottleneck = 58 → reservations."""
        r = candidate_analysis(_bazi(Element.WATER), "sales")
        assert 50 <= r.element_fit < 75
        assert r.verdict == "recommended_with_reservations"
        assert r.strengths
        assert r.risks


class TestBurnoutRisk:
    def test_water_in_clash_is_high(self):
        """Water + high clash: 40 (clash) + 15 (stress) + 5 (compound) = 60 → high."""
        b = burnout_risk(_bazi(Element.WATER), in_high_clash_period=True)
        assert isinstance(b, BurnoutAssessment)
        assert b.level == "high"
        assert b.factors                      # factors are enumerated
        assert b.recommendation               # recommendation text is present

    def test_earth_no_clash_is_low(self):
        """Earth, no clash: 0 - 10 (resilient) = -10 → clamped to low."""
        b = burnout_risk(_bazi(Element.EARTH), in_high_clash_period=False)
        assert b.level == "low"
        assert b.factors
        assert b.recommendation

    def test_recommendation_text_mentions_action(self):
        """Moderate/high recommendations must offer a concrete action."""
        b = burnout_risk(_bazi(Element.WATER), in_high_clash_period=True)
        assert any(word in b.recommendation.lower()
                   for word in ("leave", "workload", "responsibilities", "recovery"))


class TestFiringAdvisory:
    def _any(self):
        return _bazi(Element.METAL)

    def test_low_perf_high_clash_review_for_replacement(self):
        """performance 30 + high clash → review_for_replacement (NOT firing)."""
        f = firing_advisory(self._any(), performance_score=30, in_high_clash=True)
        assert isinstance(f, FiringAdvisory)
        assert f.verdict == "review_for_replacement"

    def test_high_perf_no_clash_retain(self):
        """performance 80, no clash → retain."""
        f = firing_advisory(self._any(), performance_score=80, in_high_clash=False)
        assert f.verdict == "retain"

    def test_mid_perf_reassign(self):
        """performance 50 (40-60 band) → reassign regardless of clash."""
        assert firing_advisory(
            self._any(), performance_score=50, in_high_clash=False).verdict == "reassign"
        assert firing_advisory(
            self._any(), performance_score=55, in_high_clash=True).verdict == "reassign"

    def test_disclaimer_mentions_gdpr_and_labor_law(self):
        f = firing_advisory(self._any(), performance_score=30, in_high_clash=True)
        text = f.disclaimer.lower()
        assert "gdpr" in text
        assert "labor law" in text
        assert "advisory only" in text

    def test_never_recommends_firing_verdict(self):
        """No (performance, clash) combination may produce a 'fire' verdict —
        the only separation-adjacent verdict is review_for_replacement."""
        for perf in (0, 25, 39, 40, 60, 75, 100):
            for clash in (True, False):
                v = firing_advisory(self._any(), perf, clash).verdict
                assert v in {"retain", "reassign", "review_for_replacement"}
                assert "fire" not in v.replace("review_for_replacement", "")

    def test_performance_score_validation(self):
        with pytest.raises(ValueError):
            firing_advisory(self._any(), performance_score=150, in_high_clash=False)
        with pytest.raises(ValueError):
            firing_advisory(self._any(), performance_score=-5, in_high_clash=False)


class TestPrivacyBoundary:
    """The advisory output must never echo back birth data — it only reasons
    over the Day Master element, which is the GDPR Art.9-safe abstraction."""

    def test_reports_carry_no_birth_fields(self):
        for r in (
            candidate_analysis(_bazi(Element.EARTH), "operations"),
            burnout_risk(_bazi(Element.WATER), in_high_clash_period=True),
            firing_advisory(_bazi(Element.METAL), 50, in_high_clash=False),
        ):
            # frozen dataclasses: read their declared field names only.
            for field_name in r.__dataclass_fields__:
                assert "birth" not in field_name
