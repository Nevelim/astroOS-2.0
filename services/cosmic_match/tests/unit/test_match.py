"""Unit tests for Cosmic Match: compatibility computation."""
from __future__ import annotations

import pytest

from services.cosmic_match.domain.entities import (
    BaZiSummary, CompatibilityScores, MatchIntent, MemberProfile,
    NatalSummary, bazi_compatibility_score, compute_compatibility,
    western_synastry_score,
)


def _profile(pid, sun="aries", moon="leo", venus="taurus", mars="gemini",
             dm_stem="jia", dm_el="wood"):
    return MemberProfile(
        profile_id=pid, display_name=pid,
        natal=NatalSummary(sun_sign=sun, moon_sign=moon, venus_sign=venus, mars_sign=mars),
        bazi=BaZiSummary(day_master_stem=dm_stem, day_master_element=dm_el,
                         year_branch="zi", month_branch="chen", day_branch="zi"),
    )


class TestWesternSynastry:
    def test_same_signs_high_harmony(self):
        a = NatalSummary("aries", "leo", "aries", "leo")
        b = NatalSummary("aries", "leo", "aries", "leo")
        love, comm, values, lifestyle = western_synastry_score(a, b)
        assert love > 70
        assert values > 70

    def test_fire_water_low_harmony(self):
        a = NatalSummary("aries", "aries", "aries", "aries")  # all fire
        b = NatalSummary("cancer", "cancer", "cancer", "cancer")  # all water
        love, comm, values, lifestyle = western_synastry_score(a, b)
        assert love < 50
        assert values < 50

    def test_fire_air_high_harmony(self):
        a = NatalSummary("aries", "leo", "sagittarius", "leo")  # fire
        b = NatalSummary("gemini", "aquarius", "libra", "gemini")  # air
        love, comm, values, lifestyle = western_synastry_score(a, b)
        assert love > 60


class TestBaZiCompatibility:
    def test_same_element_companion(self):
        a = BaZiSummary("jia", "wood", "zi", "chen", "zi")
        b = BaZiSummary("yi", "wood", "mao", "yin", "mao")
        assert bazi_compatibility_score(a, b) == 75

    def test_generating_cycle_favorable(self):
        # wood generates fire
        a = BaZiSummary("jia", "wood", "zi", "chen", "zi")
        b = BaZiSummary("bing", "fire", "wu", "si", "wu")
        assert bazi_compatibility_score(a, b) == 85

    def test_controlling_cycle_tension(self):
        # metal controls wood
        a = BaZiSummary("jia", "wood", "zi", "chen", "zi")
        b = BaZiSummary("geng", "metal", "shen", "you", "shen")
        assert bazi_compatibility_score(a, b) == 45


class TestComputeCompatibility:
    def test_full_3_layer(self):
        a = _profile("a")
        b = _profile("b")
        result = compute_compatibility(a, b)
        assert "western" in result.layers_used
        assert "bazi" in result.layers_used
        assert 0 <= result.scores.composite <= 100

    def test_composite_weighted(self):
        scores = CompatibilityScores(love=100, communication=0, values=0, lifestyle=0, growth=0)
        # 100*0.30 = 30
        assert scores.composite == 30

    def test_no_natal_data_falls_back(self):
        a = MemberProfile(profile_id="a", display_name="A")
        b = MemberProfile(profile_id="b", display_name="B")
        result = compute_compatibility(a, b)
        # No layers available
        assert result.layers_used == ()
        assert result.scores.composite == 50  # default neutral


class TestPrivacyInvariant:
    """CRITICAL: birth data must never appear in compatibility output."""

    def test_no_birth_data_in_result(self):
        a = _profile("a")
        b = _profile("b")
        result = compute_compatibility(a, b)
        result_str = str(result.__dict__) + result.explanation
        # No date/time/lat/lng/hash should leak
        for forbidden in ["birth", "date", "hash", "lat", "lng", "1989"]:
            assert forbidden.lower() not in result_str.lower(), \
                f"privacy leak: '{forbidden}' in result"
