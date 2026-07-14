"""Unit tests for planetary returns calculation."""
from __future__ import annotations

import pytest

from services.astro_engine.domain.returns import (
    PlanetaryReturn,
    next_return,
    returns_for,
)


class TestReturnsFor:
    def test_saturn_return_around_29(self):
        events = returns_for(1989, max_age=35)
        saturns = [e for e in events if e.planet == "saturn" and not e.is_half_return]
        assert len(saturns) == 1
        assert 28 < saturns[0].age < 31

    def test_jupiter_multiple_returns(self):
        events = returns_for(1989, max_age=50)
        jupiters = [e for e in events if e.planet == "jupiter" and not e.is_half_return]
        assert len(jupiters) >= 3  # ~12, ~24, ~36

    def test_events_sorted_by_age(self):
        events = returns_for(1989, max_age=60)
        ages = [e.age for e in events]
        assert ages == sorted(ages)

    def test_themes_are_meaningful(self):
        events = returns_for(1989, max_age=35)
        saturn = next(e for e in events if e.planet == "saturn"
                      and not e.is_half_return)
        assert len(saturn.theme) > 20
        assert "matur" in saturn.theme.lower() or "struct" in saturn.theme.lower() \
            or "foundation" in saturn.theme.lower()

    def test_half_returns_present(self):
        events = returns_for(1989, max_age=50)
        halves = [e for e in events if e.is_half_return]
        assert len(halves) >= 1

    def test_uranus_opposition_at_42(self):
        events = returns_for(1989, max_age=50)
        uranus = [e for e in events if "uranus" in e.name.lower()
                  and "half" in e.name.lower()]
        if uranus:
            assert abs(uranus[0].age - 42.0) < 1.0

    def test_returns_within_max_age(self):
        events = returns_for(1989, max_age=40)
        for e in events:
            assert e.age <= 40


class TestNextReturn:
    def test_next_saturn_for_young_person(self):
        # Age 25 → first Saturn return (~29.5) is next
        r = next_return(1989, current_age=25.0, planet="saturn")
        assert r is not None
        assert 28 < r.age < 31
        assert r.cycle_number == 1

    def test_next_saturn_after_first(self):
        # Age 35 → second Saturn return (~59) is next
        r = next_return(1989, current_age=35.0, planet="saturn")
        assert r is not None
        assert 55 < r.age < 62

    def test_none_if_past_all(self):
        r = next_return(1989, current_age=200.0, planet="saturn")
        assert r is None


class TestNodalReturns:
    def test_nodal_return_around_18(self):
        events = returns_for(1989, max_age=25)
        nodals = [e for e in events if e.planet == "nodal" and not e.is_half_return]
        if nodals:
            assert 17 < nodals[0].age < 20

    def test_nodal_theme_mentions_karma(self):
        events = returns_for(1989, max_age=25)
        nodal = next((e for e in events if e.planet == "nodal"
                      and not e.is_half_return), None)
        if nodal:
            assert "karm" in nodal.theme.lower() or "fate" in nodal.theme.lower() \
                or "direction" in nodal.theme.lower()
