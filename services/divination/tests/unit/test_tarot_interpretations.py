"""Unit tests for Tarot Major Arcana rich interpretations."""
from __future__ import annotations

import pytest

from services.divination.domain.tarot import TAROT_DECK, Arcana
from services.divination.domain.tarot_interpretations import (
    MAJOR_INTERPRETATIONS,
    interpretation_for,
)


class TestInterpretationCoverage:
    def test_all_22_majors_have_interpretations(self):
        for card in TAROT_DECK:
            if card.arcana is Arcana.MAJOR:
                upright, reversed_ = interpretation_for(card.id)
                assert upright, f"Major card {card.name} (id {card.id}) missing upright"
                assert reversed_, f"Major card {card.name} (id {card.id}) missing reversed"

    def test_minor_arcana_returns_empty(self):
        """Minor arcana (id 22+) uses keywords, not rich interpretations."""
        upright, reversed_ = interpretation_for(22)
        assert upright == ""
        assert reversed_ == ""

    def test_interpretation_dict_has_22_entries(self):
        assert len(MAJOR_INTERPRETATIONS) == 22
        assert set(MAJOR_INTERPRETATIONS.keys()) == set(range(22))


class TestInterpretationQuality:
    @pytest.mark.parametrize("card_id", range(22))
    def test_upright_is_meaningful_sentence(self, card_id):
        upright, _ = interpretation_for(card_id)
        assert len(upright) > 40, f"Card {card_id} upright too short"
        assert upright.endswith("."), f"Card {card_id} upright should end with period"

    @pytest.mark.parametrize("card_id", range(22))
    def test_reversed_is_meaningful_sentence(self, card_id):
        _, reversed_ = interpretation_for(card_id)
        assert len(reversed_) > 40, f"Card {card_id} reversed too short"
        assert reversed_.endswith("."), f"Card {card_id} reversed should end with period"

    @pytest.mark.parametrize("card_id", range(22))
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
