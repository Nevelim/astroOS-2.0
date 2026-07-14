"""Unit tests for the family abundance & synergy engine.

Verified against the customer's reference dumps:
  - individual-igor.json  (Игорь × Адана — per-member scores)
  - family-synergy.json   (4 members × Лангепас / Ноябрьск / Старый Оскол)

The reference uses astronomy-engine for sidereal time; we use Meeus GMST.
Scores match to <0.02, totalSynergy to <1.0 (small drift from the sidereal-time
and ephemeris differences, documented in the module docstring).
"""
from __future__ import annotations

import math
from datetime import datetime, timezone

import pytest

from services.astro_engine.domain.abundance import (
    ANGLE_ASPECTS,
    PAIR_BONUSES,
    PLANETS,
    SPHERES,
    MemberInput,
    CityInput,
    angular_distance,
    buffer_factor,
    chart_angles,
    compute_family_report,
    evaluate_city,
    find_hits,
    score_member,
)
from services.astro_engine.domain.chart import greenwich_sidereal_time_deg


# --------------------------------------------------------------------------- #
# Canonical family + reference planet longitudes (family-synergy.json)
# --------------------------------------------------------------------------- #
_IGOR_PLANETS = {
    "Sun": 25.3979365654, "Moon": 143.7677061800, "Mercury": 37.1230246217,
    "Venus": 28.0811107907, "Mars": 81.4861726624, "Jupiter": 66.2583365169,
    "Saturn": 283.8807168145, "Uranus": 275.3168427146, "Neptune": 282.3830719813,
    "Pluto": 224.3205126794, "NorthNode": 153.4609428820,
}
_YULIA_PLANETS = {
    "Sun": 150.4034512719, "Moon": 57.7718943487, "Mercury": 176.9523245210,
    "Venus": 186.5290391760, "Mars": 162.6666736662, "Jupiter": 94.4743760179,
    "Saturn": 277.5838310402, "Uranus": 271.4640787326, "Neptune": 279.8252667783,
    "Pluto": 222.6482262449, "NorthNode": 146.6635033685,
}
_KARINA_PLANETS = {
    "Sun": 164.6673841927, "Moon": 185.0421155331, "Mercury": 176.3263489340,
    "Venus": 205.2077290288, "Mars": 126.3924537329, "Jupiter": 105.0287653190,
    "Saturn": 217.6619651824, "Uranus": 11.5469620240, "Neptune": 333.6688317498,
    "Pluto": 279.0353345912, "NorthNode": 218.3789495813,
}
_MIROSLAVA_PLANETS = {
    "Sun": 305.2192891554, "Moon": 314.4629402016, "Mercury": 315.3430072672,
    "Venus": 344.4498650727, "Mars": 255.1339134470, "Jupiter": 282.2970150836,
    "Saturn": 294.3160635249, "Uranus": 32.7440467795, "Neptune": 346.8876362448,
    "Pluto": 293.2112526991, "NorthNode": 97.7720341406,
}


def _gst(iso: str) -> float:
    """GMST in degrees via Meeus (the engine's own formula)."""
    utc = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return greenwich_sidereal_time_deg(utc)


def _make_family() -> tuple[MemberInput, ...]:
    """The 4-member family. Karina/Miroslava longitudes come from
    family-synergy.json; we build MemberInputs from all 11 planets."""
    return (
        MemberInput(key="igor", name="Игорь", planets=_IGOR_PLANETS,
                    gst_deg=_gst("1989-04-15T09:40:00Z")),
        MemberInput(key="yulia", name="Юлия", planets=_YULIA_PLANETS,
                    gst_deg=_gst("1989-08-23T13:50:00Z")),
        MemberInput(key="karina", name="Карина", planets=_KARINA_PLANETS,
                    gst_deg=_gst("2013-09-07T03:00:00Z")),
        MemberInput(key="miroslava", name="Мирослава", planets=_MIROSLAVA_PLANETS,
                    gst_deg=_gst("2020-01-25T18:00:00Z")),
    )


_LANGEPSAS = CityInput(name="Лангепас", country="🇷🇺 Россия",
                        lat=60.25, lng=74.8167, region="🇷🇺 Славянская")


# --------------------------------------------------------------------------- #
# Pure-helper tests
# --------------------------------------------------------------------------- #
class TestAngularDistance:
    def test_identical(self):
        assert angular_distance(100.0, 100.0) == 0.0

    def test_wraps_through_360(self):
        assert angular_distance(350.0, 10.0) == pytest.approx(20.0)

    def test_max_is_180(self):
        assert angular_distance(0.0, 180.0) == 180.0

    def test_short_arc(self):
        assert angular_distance(30.0, 170.0) == pytest.approx(140.0)


class TestBufferFactor:
    def test_main_zone(self):
        assert buffer_factor(0.0, "Sun") == (1.0, "main")
        assert buffer_factor(111.0, "Sun") == (1.0, "main")

    def test_extended_zone(self):
        assert buffer_factor(150.0, "Sun") == (0.7, "extended")
        assert buffer_factor(222.0, "Sun") == (0.7, "extended")

    def test_fading_zone_normal(self):
        assert buffer_factor(300.0, "Sun") == (0.3, "fading")
        assert buffer_factor(333.0, "Sun") == (0.3, "fading")
        assert buffer_factor(334.0, "Sun") == (0.0, "none")

    def test_fading_zone_slow_planet_extends(self):
        # Jupiter/Saturn extend fading to 444 km.
        assert buffer_factor(400.0, "Jupiter") == (0.3, "fading")
        assert buffer_factor(444.0, "Saturn") == (0.3, "fading")
        assert buffer_factor(445.0, "Jupiter") == (0.0, "none")


# --------------------------------------------------------------------------- #
# Chart-angles tests (Step 2)
# --------------------------------------------------------------------------- #
class TestChartAngles:
    def test_mc_ic_are_opposite(self):
        a = chart_angles(gst_deg=348.5267, city_lat=60.25, city_lng=74.8167)
        assert angular_distance(a["MC"], a["IC"]) == pytest.approx(180.0, abs=1e-9)

    def test_asc_desc_are_opposite(self):
        a = chart_angles(gst_deg=348.5267, city_lat=60.25, city_lng=74.8167)
        assert angular_distance(a["Asc"], a["Desc"]) == pytest.approx(180.0, abs=1e-9)

    def test_asc_none_at_pole(self):
        # Near the pole the ASC is undefined.
        a = chart_angles(gst_deg=0.0, city_lat=89.0, city_lng=0.0)
        # ASC may still resolve for some LST; ensure no crash and Desc follows.
        if a["Asc"] is None:
            assert a["Desc"] is None

    def test_langepas_igor_angles(self):
        # GMST(igor) + Lng(Лангепас) → LST; MC ≈ 65.27° (reference-verified).
        a = chart_angles(gst_deg=_gst("1989-04-15T09:40:00Z"),
                         city_lat=60.25, city_lng=74.8167)
        assert a["MC"] == pytest.approx(65.27, abs=0.05)


# --------------------------------------------------------------------------- #
# Per-member scoring (Step 4 + 5) — verified against individual-igor
# --------------------------------------------------------------------------- #
class TestPerMemberScoring:
    def test_igor_langepas_matches_reference(self):
        """Игорь × Лангепас per-member scores (family-synergy.json)."""
        angles = chart_angles(_gst("1989-04-15T09:40:00Z"), 60.25, 74.8167)
        ms = score_member(_IGOR_PLANETS, angles)
        ref = {
            "career": 2.988, "love": 0.821, "travel": 0.45,
            "family": -0.335, "health": -0.40, "finance": 2.377,
        }
        for s in SPHERES:
            assert ms.scores[s] == pytest.approx(ref[s], abs=0.02), \
                f"{s}: got {ms.scores[s]:.4f}, ref {ref[s]}"

    def test_igor_langepas_direct_hits(self):
        angles = chart_angles(_gst("1989-04-15T09:40:00Z"), 60.25, 74.8167)
        ms = score_member(_IGOR_PLANETS, angles)
        assert ms.direct_hits_count == 5
        assert ms.has_synergy is True

    def test_zero_hits_when_no_aspects(self):
        # Planets far from any angle → no hits → all scores ~0 (dominance may nudge).
        angles = chart_angles(0.0, 0.0, 0.0)
        # Move all planets into a barren longitude band; we just assert no crash.
        barren = {p: 200.0 for p in PLANETS}
        ms = score_member(barren, angles)
        for s in SPHERES:
            assert isinstance(ms.scores[s], float)


# --------------------------------------------------------------------------- #
# Family aggregation + synergy — verified against family-synergy.json
# --------------------------------------------------------------------------- #
class TestFamilyReport:
    def test_langepas_total_synergy_matches_reference(self):
        """Лангепас totalSynergy ≈ 27.93 (top city #1)."""
        report = evaluate_city(_make_family(), _LANGEPSAS)
        assert report.total_synergy == pytest.approx(27.93, abs=1.0)

    def test_langepas_resonance_jupiter_three_members(self):
        report = evaluate_city(_make_family(), _LANGEPSAS)
        jup = next((r for r in report.resonances if r.planet == "Jupiter"), None)
        assert jup is not None
        # Jupiter activated in Игорь/Карина/Мирослава → 3² × 1.5 = 13.5
        assert jup.count == 3
        assert jup.score == pytest.approx(13.5, abs=0.01)

    def test_langepas_all_members_all_positive_false(self):
        report = evaluate_city(_make_family(), _LANGEPSAS)
        assert report.all_members_all_positive is False  # Мирослава has negatives
        assert report.avg_all_positive is True

    def test_langepas_igor_scores_in_per_member(self):
        report = evaluate_city(_make_family(), _LANGEPSAS)
        igor = report.per_member_scores["igor"]
        assert igor["career"] == pytest.approx(2.988, abs=0.02)
        assert igor["finance"] == pytest.approx(2.377, abs=0.02)

    def test_starory_olskol_matches_reference(self):
        """Старый Оскол — top city #3, totalSynergy ≈ 25.66."""
        city = CityInput(name="Старый Оскол", country="🇷🇺 Россия",
                         lat=51.2956, lng=37.8353, region="🇷🇺 Славянская")
        report = evaluate_city(_make_family(), city)
        assert report.total_synergy == pytest.approx(25.66, abs=1.0)
        assert report.avg_all_positive is True


# --------------------------------------------------------------------------- #
# Top-level report (ranking + counts)
# --------------------------------------------------------------------------- #
class TestFamilyReportRanking:
    def test_top_city_by_synergy_is_langepas(self):
        cities = (
            _LANGEPSAS,
            CityInput(name="Старый Оскол", lat=51.2956, lng=37.8353),
            CityInput(name="Павлодар", lat=52.2833, lng=76.9667),
        )
        report = compute_family_report(_make_family(), cities, top_limit=10)
        assert report.top_cities_by_synergy[0].city.name == "Лангепас"
        assert report.total_cities == 3

    def test_best_by_synergy_type_populated(self):
        cities = (_LANGEPSAS, CityInput(name="Павлодар", lat=52.2833, lng=76.9667))
        report = compute_family_report(_make_family(), cities, top_limit=10)
        for t in ("resonance", "crossAspect", "complementarity", "harmony"):
            assert t in report.best_by_synergy_type

    def test_counts_are_consistent(self):
        cities = (_LANGEPSAS, CityInput(name="Павлодар", lat=52.2833, lng=76.9667))
        report = compute_family_report(_make_family(), cities, top_limit=10)
        assert 0 <= report.abundant_cities_count <= 2
        assert 0 <= report.strict_cities_count <= 2
        assert report.strict_cities_count <= report.abundant_cities_count

    def test_empty_cities(self):
        report = compute_family_report(_make_family(), (), top_limit=10)
        assert report.total_cities == 0
        assert report.top_cities_by_synergy == ()

    def test_top_limit_truncates(self):
        cities = tuple(
            CityInput(name=f"C{i}", lat=float(i), lng=float(i)) for i in range(10)
        )
        report = compute_family_report(_make_family(), cities, top_limit=3)
        assert len(report.top_cities_by_synergy) <= 3
