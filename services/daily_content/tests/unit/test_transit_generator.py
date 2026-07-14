"""Unit tests for the TransitContentGenerator (dynamic daily content)."""
from __future__ import annotations

from datetime import date

import pytest

from services.daily_content.adapter.transit_generator import (
    StaticPositionsProvider,
    TransitContentGenerator,
)
from services.daily_content.domain.entities import (
    ContentRitualType,
    DailyContentKey,
    SunSign,
    VoiceProfile,
)


def _key(sign=SunSign.ARIES, voice=VoiceProfile.CALM):
    return DailyContentKey(for_date=date(2026, 7, 14),
                           sun_sign=sign, voice=voice, language="en")


class TestHoroscopeGeneration:
    def test_returns_nonempty_text(self):
        gen = TransitContentGenerator(StaticPositionsProvider({"venus": 5.0}))
        body = gen.generate(_key(), ContentRitualType.HOROSCOPE)
        assert len(body) > 20

    def test_content_changes_with_transits(self):
        """Different transit positions produce different horoscope text."""
        gen_venus = TransitContentGenerator(StaticPositionsProvider({"venus": 5.0}))
        gen_mars = TransitContentGenerator(StaticPositionsProvider({"mars": 200.0}))
        body_v = gen_venus.generate(_key(), ContentRitualType.HOROSCOPE)
        body_m = gen_mars.generate(_key(), ContentRitualType.HOROSCOPE)
        assert body_v != body_m

    def test_includes_sun_sign(self):
        gen = TransitContentGenerator(StaticPositionsProvider({"sun": 5.0}))
        body = gen.generate(_key(sign=SunSign.LEO), ContentRitualType.HOROSCOPE)
        assert "Leo" in body or "leo" in body.lower()

    def test_includes_energy_score(self):
        gen = TransitContentGenerator(StaticPositionsProvider({"venus": 5.0}))
        body = gen.generate(_key(), ContentRitualType.HOROSCOPE)
        assert "Energy score" in body

    def test_relationship_theme_when_venus_transits_sun(self):
        gen = TransitContentGenerator(StaticPositionsProvider({"venus": 5.0}))
        body = gen.generate(_key(), ContentRitualType.HOROSCOPE)
        assert "love" in body.lower() or "relationship" in body.lower()


class TestAffirmationGeneration:
    def test_affirmation_starts_with_voice_prefix(self):
        gen = TransitContentGenerator(StaticPositionsProvider({"venus": 5.0}))
        aff = gen.generate(_key(voice=VoiceProfile.CALM),
                           ContentRitualType.AFFIRMATION)
        assert aff.startswith("I embrace")

    def test_affirmation_reflects_theme(self):
        gen = TransitContentGenerator(StaticPositionsProvider({"venus": 5.0}))
        aff = gen.generate(_key(), ContentRitualType.AFFIRMATION)
        assert "love" in aff.lower() or "connection" in aff.lower()

    def test_professional_voice_prefix(self):
        gen = TransitContentGenerator(StaticPositionsProvider({"mars": 5.0}))
        aff = gen.generate(_key(voice=VoiceProfile.PROFESSIONAL),
                           ContentRitualType.AFFIRMATION)
        assert aff.startswith("I align with")


class TestNatalPositions:
    def test_uses_provided_natal_positions(self):
        """When natal positions are given, transits aspect them (not the sign fallback)."""
        gen = TransitContentGenerator(StaticPositionsProvider({"venus": 100.0}))
        # Natal sun at 100° → Venus 100° = conjunction (trine to the sign-based 5°)
        body = gen.generate(_key(), ContentRitualType.HOROSCOPE,
                            natal_positions={"sun": 100.0})
        assert "conjunction" in body.lower()

    def test_falls_back_to_sign_based_without_natal(self):
        """Without natal positions, uses the sun-sign approx longitude."""
        gen = TransitContentGenerator(StaticPositionsProvider({"venus": 5.0}))
        # Aries ≈ 5°, Venus 5° → conjunction
        body = gen.generate(_key(sign=SunSign.ARIES), ContentRitualType.HOROSCOPE)
        assert "conjunction" in body.lower()


class TestDeterminism:
    def test_same_input_same_output(self):
        gen = TransitContentGenerator(StaticPositionsProvider({"venus": 5.0}))
        b1 = gen.generate(_key(), ContentRitualType.HOROSCOPE)
        b2 = gen.generate(_key(), ContentRitualType.HOROSCOPE)
        assert b1 == b2
