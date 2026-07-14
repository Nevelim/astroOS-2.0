"""Daily Content: transit-based generator — dynamic horoscopes from real transits.

Replaces the static TemplateContentGenerator with dynamic content derived from
actual astrological transits (current planets aspecting the natal chart). The
horoscope text changes day-to-day based on what's actually happening in the
sky relative to the member's birth chart — no more identical daily templates.

Implements the ContentGenerator port (same interface as TemplateContentGenerator),
so the daily_content service can switch between them via DI. Production wires
the TransitContentGenerator with a real EphemerisProvider (skyfield) for current
positions; tests inject deterministic fake positions.

Flow:
  1. Fetch today's planetary longitudes (ephemeris or injected).
  2. Run the transit engine (astro_engine.domain.transits) against natal positions.
  3. Translate the DailyForecast into horoscope body + affirmation text.

When natal positions are unavailable (e.g. member hasn't completed onboarding),
it falls back to the sun-sign-only transit view (today's planets in the signs)
so the content is still personalized by sign.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional, Protocol

from services.astro_engine.domain.constants import Sign, sign_of
from services.astro_engine.domain.transits import (
    DailyForecast,
    daily_forecast,
)
from services.daily_content.domain.entities import (
    ContentRitualType,
    DailyContentKey,
)


class CurrentPositionsProvider(Protocol):
    """Port: supplies today's planetary ecliptic longitudes."""

    def for_date(self, for_date: date) -> dict[str, float]:
        """Returns {planet_name: ecliptic_longitude_deg}."""
        ...  # pragma: no cover


class StaticPositionsProvider:
    """Test/fake provider: returns fixed positions (deterministic)."""

    def __init__(self, positions: dict[str, float]) -> None:
        self._positions = positions

    def for_date(self, for_date: date) -> dict[str, float]:
        return dict(self._positions)


# --------------------------------------------------------------------------- #
# Sun-sign → approx natal Sun longitude (for sign-only fallback)
# --------------------------------------------------------------------------- -*-
_SIGN_BASE_LNG: dict[str, float] = {
    "aries": 5.0, "taurus": 35.0, "gemini": 65.0, "cancer": 95.0,
    "leo": 125.0, "virgo": 155.0, "libra": 185.0, "scorpio": 215.0,
    "sagittarius": 245.0, "capricorn": 275.0, "aquarius": 305.0, "pisces": 335.0,
}

# Voice-flavored prefixes for the affirmation.
_AFFIRMATION_PREFIX: dict[str, str] = {
    "calm": "I embrace",
    "witty": "I'm ready for",
    "professional": "I align with",
    "trauma": "I gently welcome",
}

_THEME_NOUN: dict[str, str] = {
    "identity": "your authentic self",
    "emotion": "your feelings as guidance",
    "communication": "your voice",
    "relationship": "connection and love",
    "action": "your courage to act",
    "growth": "expansion and opportunity",
    "structure": "steady, meaningful progress",
    "change": "the new arriving",
    "dissolution": "inspiration and trust",
    "transformation": "your power to renew",
}


class TransitContentGenerator:
    """Port impl: generates horoscope + affirmation text from real transits.

    Uses the transit engine when natal positions are available; otherwise falls
    back to a sun-sign-only view (today's planets by sign). Production wires a
    real CurrentPositionsProvider (skyfield); tests use StaticPositionsProvider.
    """

    def __init__(self, positions_provider: CurrentPositionsProvider) -> None:
        self._provider = positions_provider

    def generate(self, key: DailyContentKey,
                 ritual_type: ContentRitualType,
                 natal_positions: Optional[dict[str, float]] = None) -> str:
        current = self._provider.for_date(key.for_date)

        # Determine the natal Sun longitude: exact if provided, else sign-based.
        natal = dict(natal_positions) if natal_positions else {}
        if "sun" not in natal:
            natal["sun"] = _SIGN_BASE_LNG.get(key.sun_sign.value, 0.0)

        forecast = daily_forecast(current, natal, key.sun_sign.value)

        if ritual_type is ContentRitualType.AFFIRMATION:
            return self._affirmation(forecast, key.voice.value)
        return self._horoscope(forecast, key)

    def _horoscope(self, f: DailyForecast, key: DailyContentKey) -> str:
        sign_name = key.sun_sign.value.title()
        lines = [f"{f.summary}"]
        if f.highlights:
            lines.append("Today's key influences: " + " ".join(f.highlights[:2]))
        lines.append(f"Energy score: {f.score}/100.")
        return " ".join(lines)

    def _affirmation(self, f: DailyForecast, voice: str) -> str:
        prefix = _AFFIRMATION_PREFIX.get(voice, "I embrace")
        if f.dominant_theme:
            noun = _THEME_NOUN.get(f.dominant_theme.value, "the day ahead")
        else:
            noun = "a calm, centered day"
        return f"{prefix} {noun}."
