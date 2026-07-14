"""Unit tests for synastry: cross-chart aspects + soulmate indicators."""
from __future__ import annotations

import pytest

from services.astro_engine.domain.constants import AspectType
from services.astro_engine.domain.synastry import (
    SynastryAspect,
    SynastryResult,
    compute_synastry,
)


class TestCrossChartAspects:
    def test_conjunction_detected(self):
        """A's Sun conjunct B's Moon (both at 0° Aries)."""
        r = compute_synastry({"sun": 0.0}, {"moon": 0.0})
        assert any(a.aspect_type is AspectType.CONJUNCTION
                   and a.a_planet == "sun" and a.b_planet == "moon"
                   for a in r.aspects)

    def test_trine_detected(self):
        """A's Venus at 0° Aries, B's Mars at 120° (Leo) → trine."""
        r = compute_synastry({"venus": 0.0}, {"mars": 120.0})
        assert any(a.aspect_type is AspectType.TRINE for a in r.aspects)

    def test_no_aspect_when_out_of_orb(self):
        """Planets 40° apart → no major aspect."""
        r = compute_synastry({"sun": 0.0}, {"moon": 40.0})
        assert len(r.aspects) == 0

    def test_aspects_sorted_by_weight(self):
        """Most important aspects (highest weight) come first."""
        r = compute_synastry(
            {"sun": 0.0, "saturn": 0.0},
            {"moon": 0.0, "saturn": 0.0})
        weights = [a.weight for a in r.aspects]
        assert weights == sorted(weights, reverse=True)


class TestHighlightPairings:
    def test_sun_moon_highlighted(self):
        r = compute_synastry({"sun": 0.0}, {"moon": 2.0})
        assert any("Sun–Moon" in h for h in r.highlights)

    def test_venus_mars_highlighted(self):
        r = compute_synastry({"venus": 0.0}, {"mars": 118.0})  # trine
        assert any("Venus–Mars" in h for h in r.highlights)

    def test_non_highlight_pair_not_flagged(self):
        """Uranus-Neptune (generational) is not a soulmate highlight."""
        r = compute_synastry({"uranus": 0.0}, {"neptune": 1.0})
        assert not any("Uranus" in h and "soulmate" in h.lower()
                       for h in r.highlights)


class TestNodalContacts:
    def test_north_node_contact_detected(self):
        """B's Venus on A's North Node → fated indicator."""
        r = compute_synastry(
            {"sun": 100.0},
            {"venus": 30.0},
            nodes_a=(30.0, 210.0))
        assert len(r.nodal_contacts) >= 1
        nc = r.nodal_contacts[0]
        assert nc.whose_node == "A"
        assert nc.which_node == "north"
        assert nc.planet == "venus"

    def test_south_node_contact_detected(self):
        r = compute_synastry(
            {"sun": 100.0},
            {"mars": 210.0},
            nodes_a=(30.0, 210.0))
        assert any(nc.which_node == "south" for nc in r.nodal_contacts)

    def test_nodal_contact_out_of_orb_ignored(self):
        """Planet 10° from node → no contact (orb cap is 5°)."""
        r = compute_synastry(
            {"sun": 0.0},
            {"venus": 40.0},
            nodes_a=(30.0, 210.0))
        assert len(r.nodal_contacts) == 0

    def test_bidirectional_nodal_scoring(self):
        """Both A's planets on B's nodes AND B's on A's nodes."""
        # A's venus (30) sits on A's own north node (30) — that's self, not cross.
        # Set up: A has venus@30 + sun@60; B has mars@90 + moon@210.
        # nodes_a=(60,240): B's sun... no. Use: nodes_a north=90 → B's mars@90 hits it.
        # nodes_b north=30 → A's venus@30 hits it. Now both directions score.
        r = compute_synastry(
            {"venus": 30.0, "sun": 60.0},
            {"mars": 90.0, "moon": 210.0},
            nodes_a=(90.0, 270.0),    # B's mars@90 → on A's north node
            nodes_b=(30.0, 210.0))    # A's venus@30 → on B's north; A's nothing@210
        whose = {nc.whose_node for nc in r.nodal_contacts}
        assert "A" in whose and "B" in whose

    def test_nodal_contacts_boost_score(self):
        """A nodal contact raises the composite vs the same pair without nodes."""
        with_nodes = compute_synastry(
            {"venus": 0.0}, {"mars": 0.0}, nodes_a=(0.0, 180.0))
        without = compute_synastry({"venus": 0.0}, {"mars": 0.0})
        assert with_nodes.composite_score > without.composite_score


class TestCompositeScore:
    def test_score_in_range(self):
        r = compute_synastry({"sun": 0.0}, {"moon": 90.0})
        assert 0 <= r.composite_score <= 100

    def test_no_aspects_baseline(self):
        r = compute_synastry({"sun": 0.0}, {"moon": 45.0})
        assert r.composite_score >= 40  # baseline affinity

    def test_many_aspects_score_higher(self):
        aligned = compute_synastry(
            {p: i * 5.0 for i, p in enumerate(["sun", "moon", "venus", "mars"])},
            {p: i * 5.0 for i, p in enumerate(["sun", "moon", "venus", "mars"])})
        sparse = compute_synastry({"sun": 0.0}, {"moon": 180.0})
        assert aligned.composite_score >= sparse.composite_score


class TestSummary:
    def test_summary_mentions_score(self):
        r = compute_synastry({"sun": 0.0}, {"moon": 0.0})
        assert "Composite compatibility" in r.summary

    def test_summary_mentions_fated_when_nodal(self):
        r = compute_synastry(
            {"sun": 0.0}, {"venus": 0.0}, nodes_a=(0.0, 180.0))
        assert "fated" in r.summary.lower() or "karmic" in r.summary.lower()

    def test_summary_ordinary_when_no_indicators(self):
        r = compute_synastry({"sun": 0.0}, {"uranus": 47.0})
        assert "ordinary" in r.summary.lower() or "no major" in r.summary.lower()
