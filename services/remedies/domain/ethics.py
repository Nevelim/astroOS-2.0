"""Remedies ethics — the affiliate-independent sort invariant (REMED-4).

Pure function. The Dev Backlog + API Integration Guide are explicit:
marketplace_results MUST be sorted by rating, NOT by affiliate status.
An affiliate link NEVER gets a ranking boost. This is a release-blocker
invariant — the integration guide names a dedicated test for it.

`sort_by_rating` is a stable sort by descending rating; the `affiliate`
field is not consulted at all. The whitelist (rating ≥ 4.0, REMED-1) is
enforced in the adapter (marketplace search); here we only guarantee the
sort cannot be biased by affiliate money.
"""
from __future__ import annotations

from services.remedies.domain.entities import MarketplaceListing


def sort_by_rating(listings: list[MarketplaceListing]
                   ) -> list[MarketplaceListing]:
    """Stable descending sort by rating. Affiliate status is IGNORED (REMED-4).

    Ties keep their original input order (stable sort) — we never silently
    promote an affiliate link above a higher-rated non-affiliate one.
    """
    # sorted() is stable; we negate rating for descending without affecting
    # the tie-break (original order preserved).
    return sorted(listings, key=lambda l: -l.rating)


def assert_no_affiliate_bias(listings: list[MarketplaceListing],
                             sorted_listings: list[MarketplaceListing]) -> bool:
    """Self-check helper: the sort did not reorder to favor affiliates.

    Returns True if, for every position, the affiliate flag of the sorted
    sequence is consistent with a pure rating sort (i.e. no affiliate was
    promoted ahead of a strictly-higher-rated non-affiliate). Used by tests.
    """
    if len(sorted_listings) != len(listings):
        return False
    # A correct rating-descending sort must be monotonically non-increasing.
    for i in range(1, len(sorted_listings)):
        if sorted_listings[i].rating > sorted_listings[i - 1].rating:
            return False
    return True
