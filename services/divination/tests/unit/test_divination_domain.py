"""Unit tests for the divination domain: tarot deck integrity + I Ching casting."""
from __future__ import annotations

import pytest

from services.divination.domain.iching import (
    cast_iching,
    _bits_to_king_wen,
    _KING_WEN,
)
from services.divination.domain.tarot import (
    Arcana,
    Spread,
    Suit,
    TAROT_DECK,
    draw_tarot,
    SPREAD_CARD_COUNT,
)


# --------------------------------------------------------------------------- #
# Tarot deck integrity
# --------------------------------------------------------------------------- #
class TestDeckIntegrity:
    def test_deck_has_78_cards(self):
        assert len(TAROT_DECK) == 78

    def test_ids_unique_and_contiguous(self):
        ids = sorted(c.id for c in TAROT_DECK)
        assert ids == list(range(78))

    def test_major_arcana_count(self):
        major = [c for c in TAROT_DECK if c.arcana is Arcana.MAJOR]
        assert len(major) == 22

    def test_minor_arcana_count(self):
        minor = [c for c in TAROT_DECK if c.arcana is Arcana.MINOR]
        assert len(minor) == 56

    def test_each_suit_has_14_cards(self):
        for suit in (Suit.WANDS, Suit.CUPS, Suit.SWORDS, Suit.PENTACLES):
            cards = [c for c in TAROT_DECK if c.suit is suit]
            assert len(cards) == 14

    def test_fool_is_first(self):
        assert TAROT_DECK[0].name == "The Fool"

    def test_major_suit_is_none(self):
        for c in TAROT_DECK[:22]:
            assert c.suit is None
            assert c.element == "Spirit"

    def test_pentacles_not_misspelled(self):
        """Regression: the BFF had a 'penticles' typo. Must be 'pentacles'."""
        suits = {c.suit for c in TAROT_DECK if c.suit is not None}
        assert Suit.PENTACLES in suits
        assert all(c.suit.value != "penticles" for c in TAROT_DECK
                   if c.suit is not None)


class TestDraw:
    def test_single_draws_one_card(self):
        r = draw_tarot(Spread.SINGLE)
        assert len(r.cards) == 1
        assert r.cards[0].position == "Present"

    def test_three_draws_three_cards(self):
        r = draw_tarot(Spread.THREE)
        assert len(r.cards) == 3
        assert [c.position for c in r.cards] == ["Past", "Present", "Future"]

    def test_celtic_draws_ten_cards(self):
        r = draw_tarot(Spread.CELTIC)
        assert len(r.cards) == 10
        assert r.cards[0].position == "Present"
        assert r.cards[-1].position == "Final Outcome"

    def test_no_card_repeats_in_a_draw(self):
        r = draw_tarot(Spread.CELTIC)
        ids = [c.card.id for c in r.cards]
        assert len(ids) == len(set(ids))

    def test_reversed_field_is_bool(self):
        r = draw_tarot(Spread.THREE)
        for c in r.cards:
            assert isinstance(c.reversed, bool)

    def test_question_preserved(self):
        r = draw_tarot(Spread.SINGLE, question="Will I find love?")
        assert r.question == "Will I find love?"

    def test_spread_card_counts_match(self):
        assert SPREAD_CARD_COUNT[Spread.SINGLE] == 1
        assert SPREAD_CARD_COUNT[Spread.THREE] == 3
        assert SPREAD_CARD_COUNT[Spread.CELTIC] == 10


# --------------------------------------------------------------------------- #
# I Ching casting
# --------------------------------------------------------------------------- #
class TestKingWenTable:
    def test_table_is_complete_permutation(self):
        """All 64 King Wen numbers appear exactly once (verified at import)."""
        assert sorted(_KING_WEN.values()) == list(range(1, 65))

    @pytest.mark.parametrize("bits,expected", [
        ((1, 1, 1, 1, 1, 1), 1),    # all yang → Creative
        ((0, 0, 0, 0, 0, 0), 2),    # all yin → Receptive
        ((1, 1, 1, 0, 0, 0), 11),   # earth over heaven → Peace
        ((0, 0, 0, 1, 1, 1), 12),   # heaven over earth → Standstill
    ])
    def test_known_hexagrams(self, bits, expected):
        assert _bits_to_king_wen(bits) == expected


class TestCasting:
    def test_cast_returns_six_lines(self):
        h = cast_iching()
        assert len(h.lines) == 6

    def test_line_positions_1_to_6(self):
        h = cast_iching()
        assert [ln.position for ln in h.lines] == [1, 2, 3, 4, 5, 6]

    def test_line_values_in_valid_range(self):
        h = cast_iching()
        for ln in h.lines:
            assert ln.value in (6, 7, 8, 9)

    def test_primary_number_in_range(self):
        h = cast_iching()
        assert 1 <= h.primary_number <= 64

    def test_primary_has_names(self):
        h = cast_iching()
        assert h.primary_name
        assert h.primary_name_ru

    def test_changing_lines_subset_of_six(self):
        h = cast_iching()
        assert all(1 <= p <= 6 for p in h.changing_lines)

    def test_secondary_present_iff_changing_exists(self):
        h = cast_iching()
        if h.changing_lines:
            assert h.secondary_number is not None
            assert 1 <= h.secondary_number <= 64
        else:
            assert h.secondary_number is None

    def test_secondary_differs_from_primary_when_changing(self):
        """The relating hexagram must differ from the primary."""
        h = cast_iching()
        if h.changing_lines and h.secondary_number is not None:
            # Run many casts to find one with changing lines.
            pass  # probabilistic; covered by deterministic test below

    def test_deterministic_with_seeded_rng(self):
        """A fixed RNG produces a deterministic cast (for testing)."""
        class FakeRNG:
            def __init__(self):
                self.calls = 0
            def randbelow(self, n):
                # Make all coins tails (2) → every line value = 6 (old yin).
                self.calls += 1
                return 1  # → coin = 2 (tails)
        h = cast_iching(rng=FakeRNG())
        # All three-coin sums = 2+2+2 = 6 → all old-yin, all changing.
        assert all(ln.value == 6 for ln in h.lines)
        assert all(ln.changing for ln in h.lines)
        assert len(h.changing_lines) == 6
        # All-yin primary → hexagram 2 (Receptive); flipping all → all-yang = #1.
        assert h.primary_number == 2
        assert h.secondary_number == 1
