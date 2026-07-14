"""Unit tests for the tone-gate (NOTIF-3) — the calm-framing invariant.

The tone-gate is the most critical piece of the notification pipeline: NO
push leaves the service without passing it. These tests are exhaustive
table-driven: each BLOCK/SOFTEN/PASS case is parametrized.

Crisis follow-up is exempt from BLOCK (safety > tone) but can be SOFTEN-ed.
"""
from __future__ import annotations

import pytest

from services.notification.domain.entities import NotificationType, ToneVerdict
from services.notification.domain.tone_gate import check_tone, soften


class TestBlockPatterns:
    """Aggressive / spammy / fear-mongering content MUST be blocked."""

    @pytest.mark.parametrize("title,body", [
        ("URGENT! Act now!", "Last chance to claim your reading"),
        ("Warning!", "Danger ahead in your chart"),
        ("Don't miss out", "Limited time offer for premium"),
        ("BUY NOW!!!", "100% guaranteed results"),
        ("FREE MONEY", "Click here for your destiny"),
        ("Doom approaches", "You will suffer this week"),
        ("LAST CHANCE", "Act now before it's too late"),
        ("ACT NOW!!!", "Don't miss out on this"),
    ])
    def test_blocked(self, title, body):
        assert check_tone(title, body) is ToneVerdict.BLOCK

    def test_all_caps_shouting_blocked(self):
        assert check_tone("URGENT WARNING NOW", "read this") is ToneVerdict.BLOCK

    def test_excessive_exclamations_blocked(self):
        assert check_tone("Hey!!!", "check this out!!!") is ToneVerdict.BLOCK

    def test_empty_content_blocked(self):
        assert check_tone("", "") is ToneVerdict.BLOCK


class TestSoftenPatterns:
    """Pushy but salvageable content gets SOFTEN, not BLOCK."""

    @pytest.mark.parametrize("title,body", [
        ("Your reading", "Hurry, the stars are moving!"),
        ("Update ready", "Read it now!"),
        ("Transit insight", "Find out now what it means..."),
        ("Guess what", "Your chart changed"),
    ])
    def test_softened(self, title, body):
        assert check_tone(title, body) is ToneVerdict.SOFTEN

    def test_soften_strips_shouting_and_pressure(self):
        title, body = soften("HURRY UP!", "Read it now!")
        assert "!" not in title
        assert "hurry" not in body.lower()
        assert "now" not in body.lower()

    def test_soften_deflates_caps(self):
        title, _ = soften("URGENT READING", "body")
        # deflated to title case
        assert title == "Urgent Reading"


class TestPassPatterns:
    """Calm, empowering framing passes through untouched."""

    @pytest.mark.parametrize("title,body", [
        ("Your daily insight", "A steady energy supports focused work today."),
        ("Saturn transit window", "A grounding influence invites reflection."),
        ("New match available", "Someone with complementary energy appeared."),
        ("Streak reminder", "Your evening ritual continues to build momentum."),
        ("Weekly recap", "Here is how your week aligned with the cosmos."),
    ])
    def test_passes(self, title, body):
        assert check_tone(title, body) is ToneVerdict.PASS


class TestCrisisExemption:
    """Crisis follow-up content is exempt from BLOCK (safety override)."""

    def test_crisis_with_block_pattern_softens_not_blocks(self):
        # Even if the crisis body contained a block-trigger word, it softens.
        verdict = check_tone("You're not alone", "Reach out now",
                             NotificationType.CRISIS_FOLLOWUP)
        # "now" is a soften trigger → SOFTEN. It must NOT be BLOCK.
        assert verdict is ToneVerdict.SOFTEN

    def test_crisis_normal_content_passes(self):
        verdict = check_tone("You're not alone",
                             "You deserve support. Please reach out.",
                             NotificationType.CRISIS_FOLLOWUP)
        assert verdict is ToneVerdict.PASS
