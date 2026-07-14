"""Unit tests for Tarot upright + reversed rich interpretations."""
from __future__ import annotations

import pytest

from services.divination.domain.tarot import TAROT_DECK, Arcana
from services.divination.domain.tarot_interpretations import (
    MAJOR_INTERPRETATIONS,
    MINOR_INTERPRETATIONS,
    interpretation_for,
)


class TestInterpretationCoverage:
    def test_all_22_majors_have_interpretations(self):
        for card in TAROT_DECK:
            if card.arcana is Arcana.MAJOR:
                upright, reversed_ = interpretation_for(card.id)
                assert upright, f"Major card {card.name} (id {card.id}) missing upright"
                assert reversed_, f"Major card {card.name} (id {card.id}) missing reversed"

    def test_minor_arcana_returns_rich_interpretation(self):
        """Minor arcana (id 22+) now has rich interpretations as a fallback."""
        upright, reversed_ = interpretation_for(22)
        assert upright, "Minor card id 22 should return a non-empty upright meaning"
        assert reversed_, "Minor card id 22 should return a non-empty reversed meaning"

    def test_interpretation_dict_has_22_entries(self):
        assert len(MAJOR_INTERPRETATIONS) == 22
        assert set(MAJOR_INTERPRETATIONS.keys()) == set(range(22))

    def test_minor_dict_has_56_entries(self):
        assert len(MINOR_INTERPRETATIONS) == 56
        assert set(MINOR_INTERPRETATIONS.keys()) == set(range(22, 78))

    def test_all_56_minors_have_interpretations(self):
        for card in TAROT_DECK:
            if card.arcana is Arcana.MINOR:
                upright, reversed_ = interpretation_for(card.id)
                assert upright, f"Minor card {card.name} (id {card.id}) missing upright"
                assert reversed_, f"Minor card {card.name} (id {card.id}) missing reversed"

    def test_unknown_id_returns_empty(self):
        upright, reversed_ = interpretation_for(999)
        assert upright == ""
        assert reversed_ == ""


class TestInterpretationQuality:
    @pytest.mark.parametrize("card_id", range(78))
    def test_upright_is_meaningful_sentence(self, card_id):
        upright, _ = interpretation_for(card_id)
        assert len(upright) > 40, f"Card {card_id} upright too short"
        assert upright.endswith("."), f"Card {card_id} upright should end with period"

    @pytest.mark.parametrize("card_id", range(78))
    def test_reversed_is_meaningful_sentence(self, card_id):
        _, reversed_ = interpretation_for(card_id)
        assert len(reversed_) > 40, f"Card {card_id} reversed too short"
        assert reversed_.endswith("."), f"Card {card_id} reversed should end with period"

    @pytest.mark.parametrize("card_id", range(78))
    def test_upright_and_reversed_differ(self, card_id):
        """Reversed is NOT just 'blocked' + upright — it's a distinct meaning."""
        upright, reversed_ = interpretation_for(card_id)
        assert upright != reversed_
        # Should not start with the lazy "blocked " prefix for all reversed
        assert not reversed_.startswith("Blocked ")


class TestSpecificCards:
    def test_fool_upright_mentions_beginning(self):
        upright, _ = interpretation_for(0)
        assert "beginning" in upright.lower() or "new" in upright.lower()

    def test_death_mentions_transformation(self):
        upright, _ = interpretation_for(13)
        assert "transform" in upright.lower() or "end" in upright.lower() \
            or "renew" in upright.lower()

    def test_tower_mentions_upheaval(self):
        upright, _ = interpretation_for(16)
        assert "upheaval" in upright.lower() or "crumble" in upright.lower() \
            or "collapse" in upright.lower()

    def test_sun_mentions_joy(self):
        upright, _ = interpretation_for(19)
        assert "joy" in upright.lower() or "radiant" in upright.lower() \
            or "success" in upright.lower()

    def test_world_mentions_completion(self):
        upright, _ = interpretation_for(21)
        assert "completion" in upright.lower() or "fulfill" in upright.lower() \
            or "whole" in upright.lower()
