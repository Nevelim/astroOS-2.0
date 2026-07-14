"""Unit tests for B2B HR domain: team analysis + consent gate (pure)."""
from __future__ import annotations

import pytest

from services.b2b_hr.domain.entities import (
    ADVISORY_DISCLAIMERS,
    BaZiSummary,
    ConsentState,
    Element,
    Role,
    Seat,
)
from services.b2b_hr.domain.team_analysis import (
    build_matrix,
    pair_compatibility,
    role_suitability,
)


def _bazi(element, polarity="yang"):
    return BaZiSummary(day_master_element=element, day_master_polarity=polarity)


def _seat(sid, element=None, consent=ConsentState.CONSENTED):
    return Seat(
        seat_id=sid, org_id="org1", member_id=f"m_{sid}",
        role=Role.EMPLOYEE, consent_state=consent,
        bazi_summary=_bazi(element) if element else None,
    )


class TestRoleSuitability:
    @pytest.mark.parametrize("element", list(Element))
    def test_returns_five_dimensions(self, element):
        r = role_suitability("s1", _bazi(element))
        assert set(r.fit_scores) == {"leadership", "execution",
                                     "collaboration", "creativity", "stability"}
        for v in r.fit_scores.values():
            assert 0 <= v <= 100

    def test_fire_high_leadership(self):
        r = role_suitability("s1", _bazi(Element.FIRE))
        assert r.fit_scores["leadership"] >= 80

    def test_metal_high_execution(self):
        r = role_suitability("s1", _bazi(Element.METAL))
        assert r.fit_scores["execution"] >= 85

    def test_yang_boosts_leadership(self):
        yang = role_suitability("s1", _bazi(Element.WOOD, "yang"))
        yin = role_suitability("s1", _bazi(Element.WOOD, "yin"))
        assert yang.fit_scores["leadership"] > yin.fit_scores["leadership"]

    def test_advisory_note_present(self):
        r = role_suitability("s1", _bazi(Element.EARTH))
        assert "advisory" in r.advisory_note.lower()


class TestPairCompatibility:
    def test_same_element_shared_rhythm(self):
        e = pair_compatibility("a", _bazi(Element.FIRE), "b", _bazi(Element.FIRE))
        assert e.score == 78
        assert "same element" in e.dynamic

    def test_generating_cycle_collaborative(self):
        # wood generates fire
        e = pair_compatibility("a", _bazi(Element.WOOD), "b", _bazi(Element.FIRE))
        assert e.score == 88
        assert "collaborative" in e.dynamic

    def test_controlling_cycle_tension(self):
        # metal controls wood
        e = pair_compatibility("a", _bazi(Element.METAL), "b", _bazi(Element.WOOD))
        assert e.score == 52
        assert "tension" in e.dynamic

    def test_symmetric(self):
        e1 = pair_compatibility("a", _bazi(Element.WOOD), "b", _bazi(Element.FIRE))
        e2 = pair_compatibility("b", _bazi(Element.FIRE), "a", _bazi(Element.WOOD))
        assert e1.score == e2.score

    def test_score_in_range(self):
        for ea in Element:
            for eb in Element:
                e = pair_compatibility("a", _bazi(ea), "b", _bazi(eb))
                assert 0 <= e.score <= 100


class TestBuildMatrix:
    def test_empty_for_no_analyzable_seats(self):
        assert build_matrix([_seat("s1", consent=ConsentState.PENDING)]) == []

    def test_one_pair_for_two_seats(self):
        seats = [_seat("a", Element.FIRE), _seat("b", Element.WATER)]
        edges = build_matrix(seats)
        assert len(edges) == 1

    def test_skips_non_analyzable(self):
        seats = [_seat("a", Element.FIRE), _seat("b", Element.WOOD,
                                                  consent=ConsentState.DECLINED)]
        edges = build_matrix(seats)
        assert edges == []  # declined seat has no bazi_analysis path


class TestConsentGate:
    def test_pending_seat_not_analyzable(self):
        assert not _seat("s1", consent=ConsentState.PENDING).analyzable

    def test_declined_seat_not_analyzable(self):
        assert not _seat("s1", consent=ConsentState.DECLINED).analyzable

    def test_consented_seat_analyzable(self):
        assert _seat("s1", consent=ConsentState.CONSENTED).analyzable


class TestPrivacy:
    """BaZiSummary must NEVER carry birth data — only element + polarity."""

    def test_bazi_summary_has_no_birth_fields(self):
        b = BaZiSummary(day_master_element=Element.WOOD, day_master_polarity="yang")
        assert not hasattr(b, "birth_date")
        assert not hasattr(b, "birth_time")
        assert not hasattr(b, "lat")
        assert not hasattr(b, "lng")

    def test_advisory_disclaimers_mention_oversight(self):
        text = " ".join(ADVISORY_DISCLAIMERS).lower()
        assert "advisory" in text or "oversight" in text
        assert "gdpr" in text or "consequence" in text
