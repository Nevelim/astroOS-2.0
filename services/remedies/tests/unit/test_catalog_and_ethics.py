"""Unit tests for the remedies domain: catalog + favorable elements + ethics.

The ethics tests (TestEthicsSort) are release-blockers: they assert the
REMED-4 invariant — marketplace listings are sorted by rating, NEVER biased
by affiliate status. An affiliate link must never outrank a higher-rated
non-affiliate.
"""
from __future__ import annotations

import pytest

from services.remedies.domain.catalog import (
    build_reasoning,
    favorable_elements,
    remedies_for,
)
from services.remedies.domain.entities import Element, MarketplaceListing, RemedyType
from services.remedies.domain.ethics import (
    assert_no_affiliate_bias,
    sort_by_rating,
)


class TestFavorableElements:
    """The 用神 heuristic: mother (generates DM) + wealth (DM controls)."""

    @pytest.mark.parametrize("dm,mother,wealth", [
        (Element.WOOD, Element.WATER, Element.EARTH),
        (Element.FIRE, Element.WOOD, Element.METAL),
        (Element.EARTH, Element.FIRE, Element.WATER),
        (Element.METAL, Element.EARTH, Element.WOOD),
        (Element.WATER, Element.METAL, Element.FIRE),
    ])
    def test_favorable_pair(self, dm, mother, wealth):
        fav = favorable_elements(dm)
        assert mother in fav
        assert wealth in fav
        assert len(fav) == 2


class TestCatalog:
    @pytest.mark.parametrize("element", list(Element))
    def test_every_element_has_remedies(self, element):
        rem = remedies_for(element)
        assert len(rem) >= 1

    @pytest.mark.parametrize("element", list(Element))
    def test_each_element_has_a_stone(self, element):
        rem = remedies_for(element)
        assert any(r.type is RemedyType.STONE for r in rem)

    def test_water_catalog_has_aquamarine(self):
        rem = remedies_for(Element.WATER)
        names = [r.name for r in rem]
        assert "Aquamarine" in names

    def test_remedy_carries_its_element(self):
        for r in remedies_for(Element.FIRE):
            assert r.element is Element.FIRE


class TestReasoning:
    def test_reasoning_references_day_master(self):
        text = build_reasoning(Element.WATER, Element.WOOD, "en")
        assert "wood" in text.lower()

    def test_reasoning_no_birth_data(self):
        text = build_reasoning(Element.WATER, Element.WOOD, "ru")
        for forbidden in ("1989", "birth", "hash", "lat", "lng", "date"):
            assert forbidden not in text.lower()


class TestEthicsSort:
    """REMED-4 — release-blocker: sort by rating, affiliate must not bias."""

    def test_descending_by_rating(self):
        listings = [
            MarketplaceListing("a", 10, "USD", 4.2),
            MarketplaceListing("b", 10, "USD", 4.9),
            MarketplaceListing("c", 10, "USD", 4.5),
        ]
        out = sort_by_rating(listings)
        assert [l.rating for l in out] == [4.9, 4.5, 4.2]

    def test_affiliate_never_outranks_higher_rated_non_affiliate(self):
        """The critical REMED-4 case: affiliate must not jump ahead."""
        listings = [
            MarketplaceListing("non-aff", 30, "USD", 4.9, affiliate=False),
            MarketplaceListing("aff", 30, "USD", 4.0, affiliate=True),
        ]
        out = sort_by_rating(listings)
        assert out[0].shop == "non-aff"
        assert out[0].rating > out[1].rating

    def test_tie_keeps_original_order_not_affiliate_first(self):
        """On equal rating, original order is preserved (stable)."""
        listings = [
            MarketplaceListing("first_nonaff", 30, "USD", 4.5, affiliate=False),
            MarketplaceListing("second_aff", 30, "USD", 4.5, affiliate=True),
        ]
        out = sort_by_rating(listings)
        assert out[0].shop == "first_nonaff"  # stable, no affiliate promotion

    def test_self_check_helper(self):
        listings = [
            MarketplaceListing("a", 10, "USD", 4.9),
            MarketplaceListing("b", 10, "USD", 4.2),
        ]
        assert assert_no_affiliate_bias(listings, sort_by_rating(listings)) is True

    def test_empty_input(self):
        assert sort_by_rating([]) == []
