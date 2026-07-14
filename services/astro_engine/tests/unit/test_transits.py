"""Unit tests for transit calculation + daily forecast generation."""
from __future__ import annotations

import pytest

from services.astro_engine.domain.constants import AspectType
from services.astro_engine.domain.transits import (
    DailyForecast,
    TransitAspect,
    TransitTheme,
    compute_transits,
    daily_forecast,
)


class TestTransitAspects:
    def test_conjunction_detected(self):
        """Transiting Venus conjunct natal Sun (both at 0°)."""
        aspects = compute_transits({"venus": 0.0}, {"sun": 0.0})
        assert len(aspects) == 1
        assert aspects[0].aspect_type is AspectType.CONJUNCTION
        assert aspects[0].transiting == "venus"
        assert aspects[0].natal_planet == "sun"

    def test_trine_detected(self):
        aspects = compute_transits({"mars": 0.0}, {"moon": 120.0})
        assert aspects[0].aspect_type is AspectType.TRINE

    def test_out_of_orb_ignored(self):
        aspects = compute_transits({"sun": 0.0}, {"moon": 45.0})
        assert len(aspects) == 0

    def test_minor_aspects_excluded_by_default(self):
        """Quincunx (150°) is excluded unless include_minor=True."""
        aspects = compute_transits({"sun": 0.0}, {"moon": 150.0})
        assert len(aspects) == 0
        aspects_all = compute_transits({"sun": 0.0}, {"moon": 150.0},
                                       include_minor=True)
        assert len(aspects_all) == 1

    def test_aspects_sorted_by_weight(self):
        """Moon transits (fast, high daily weight) rank above Saturn."""
        aspects = compute_transits(
            {"moon": 0.0, "saturn": 0.0},
            {"sun": 0.0, "venus": 0.0})
        # Moon aspects should rank first
        assert aspects[0].transiting == "moon"

    def test_tighter_orb_stronger_weight(self):
        """A 1° conjunction outweighs a 7° conjunction (same planets)."""
        tight = compute_transits({"venus": 0.0}, {"sun": 1.0})
        wide = compute_transits({"venus": 0.0}, {"sun": 7.0})
        assert tight[0].weight > wide[0].weight


class TestTransitThemes:
    def test_moon_theme_is_emotion(self):
        aspects = compute_transits({"moon": 0.0}, {"sun": 0.0})
        assert aspects[0].theme is TransitTheme.EMOTION

    def test_venus_theme_is_relationship(self):
        aspects = compute_transits({"venus": 0.0}, {"sun": 0.0})
        assert aspects[0].theme is TransitTheme.RELATIONSHIP

    def test_mars_theme_is_action(self):
        aspects = compute_transits({"mars": 0.0}, {"sun": 0.0})
        assert aspects[0].theme is TransitTheme.ACTION


class TestDailyForecast:
    def test_returns_score_in_range(self):
        f = daily_forecast({"sun": 0.0}, {"moon": 0.0}, natal_sun_sign="aries")
        assert 0 <= f.score <= 100

    def test_no_transits_baseline(self):
        f = daily_forecast({"sun": 0.0}, {"moon": 45.0})
        assert f.score == 50
        assert "quiet" in f.summary.lower()

    def test_harmonious_transits_raise_score(self):
        """A trine (harmonious) should score higher than no transit."""
        harmonious = daily_forecast({"venus": 0.0}, {"sun": 120.0})  # trine
        neutral = daily_forecast({"venus": 0.0}, {"sun": 45.0})
        assert harmonious.score > neutral.score

    def test_tense_transits_lower_score(self):
        """A square (tense) should score lower than a trine."""
        tense = daily_forecast({"saturn": 0.0}, {"sun": 90.0})    # square
        harmonious = daily_forecast({"venus": 0.0}, {"sun": 120.0})  # trine
        assert tense.score < harmonious.score

    def test_dominant_theme_from_strongest_transit(self):
        f = daily_forecast({"moon": 0.0, "mars": 60.0},
                           {"sun": 0.0, "venus": 60.0})
        # Moon conjunct Sun (weight ~1.0) vs Mars sextile Venus (lower)
        assert f.dominant_theme is TransitTheme.EMOTION

    def test_highlights_top_three(self):
        f = daily_forecast(
            {"sun": 0.0, "moon": 0.0, "venus": 0.0, "mars": 0.0},
            {"jupiter": 0.0, "saturn": 0.0, "mercury": 0.0, "neptune": 0.0})
        assert len(f.highlights) <= 3

    def test_summary_mentions_sun_sign(self):
        f = daily_forecast({"sun": 0.0}, {"moon": 0.0}, natal_sun_sign="leo")
        assert "Leo" in f.summary or "leo" in f.summary.lower()

    def test_highlight_contains_aspect_and_theme(self):
        f = daily_forecast({"venus": 0.0}, {"sun": 0.0})
        h = f.highlights[0].lower()
        assert "venus" in h and "conjunction" in h
        assert "relationship" in h or "love" in h
