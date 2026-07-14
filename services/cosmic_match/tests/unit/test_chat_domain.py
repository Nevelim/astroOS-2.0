"""Unit tests for the match chat domain: moderation + ice-breaker (pure)."""
from __future__ import annotations

import pytest

from services.cosmic_match.domain.chat import (
    ModerationVerdict,
    build_ice_breaker,
    moderate,
)


class TestModerationBlock:
    """Severe toxicity MUST be blocked (conservative — zero false negatives)."""

    @pytest.mark.parametrize("text", [
        "I will kill you",
        "I'm going to hurt you",
        "kill yourself",
        "go die",
        "what's your home address",
        "where you live so I can find you",
        "I'm coming for you",
    ])
    def test_blocked(self, text):
        assert moderate(text) is ModerationVerdict.BLOCK


class TestModerationWarning:
    """Borderline offensiveness → warning (published + flagged)."""

    @pytest.mark.parametrize("text", [
        "you're an idiot",
        "shut up, loser",
        "this is trash",
        "I hate you so much",
    ])
    def test_warning(self, text):
        assert moderate(text) is ModerationVerdict.WARNING


class TestModerationOk:
    @pytest.mark.parametrize("text", [
        "Hey! How's your day going?",
        "That's a really interesting perspective.",
        "I love hiking too — where's your favorite trail?",
        "",  # empty is OK (no toxicity)
    ])
    def test_ok(self, text):
        assert moderate(text) is ModerationVerdict.OK


class TestIceBreaker:
    def test_same_element_fire(self):
        msg = build_ice_breaker("aries", "leo")
        assert "fire" in msg.lower() or "passion" in msg.lower() \
            or "spontaneous" in msg.lower()

    def test_same_element_water(self):
        msg = build_ice_breaker("cancer", "pisces")
        assert "feel" in msg.lower() or "sensitivity" in msg.lower() \
            or "water" in msg.lower()

    def test_mixed_elements(self):
        msg = build_ice_breaker("aries", "taurus")
        assert len(msg) > 20  # some generic complementary message

    def test_deterministic_same_input(self):
        a = build_ice_breaker("gemini", "libra")
        b = build_ice_breaker("gemini", "libra")
        assert a == b  # seeded by profile data

    def test_bazi_generating_cycle(self):
        # Different Western elements so the Western-same-element branch is
        # skipped and the BaZi generating-cycle flavor is reached.
        msg = build_ice_breaker("aries", "taurus",
                                bazi_element_a="wood", bazi_element_b="fire")
        assert "growth" in msg.lower() or "generating" in msg.lower()

    def test_no_birth_data_in_icebreaker(self):
        msg = build_ice_breaker("aries", "leo", "wood", "fire")
        for forbidden in ("1989", "birth", "hash", "lat", "lng"):
            assert forbidden not in msg.lower()
