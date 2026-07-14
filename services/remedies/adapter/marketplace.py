"""Remedies adapters: marketplace search + recommendation cache.

The adapter layer is the OUTER ring — implements the Protocol ports declared
in `usecase.recommend`. Production swaps:
  - InMemoryMarketplaceSearch → real web_search + parse over whitelisted
    marketplaces (REMED-3: Etsy, verified shops rating ≥ 4.0), with a 24h
    Redis cache and <800ms p95 target.
  - InMemoryRemedyCache → Redis DB5, 24h TTL.

The in-memory versions here are deterministic: they return curated listings
per remedy name so the full pipeline (catalog → search → ethics sort) is
exercisable without network or API keys. Critically, the stub deliberately
includes BOTH affiliate and non-affiliate listings at varied ratings — this
forces the REMED-4 ethics sort to prove it ranks by rating, not money.
"""
from __future__ import annotations

from typing import Optional

from services.remedies.domain.entities import MarketplaceListing, Remedy


# Whitelist threshold (REMED-1): only shops with rating ≥ 4.0 appear.
WHITELIST_MIN_RATING: float = 4.0

# Deterministic stub listings keyed by remedy name. Mix of affiliate/non-
# affiliate and ratings so the ethics-sort test is meaningful. Some entries
# dip below the whitelist to prove the adapter filters them.
_STUB_LISTINGS: dict[str, list[MarketplaceListing]] = {
    "Aquamarine": [
        MarketplaceListing("etsy:ocean-gems", 45.0, "USD", 4.8, affiliate=True),
        MarketplaceListing("etsy:crystal-cave", 38.0, "USD", 4.9, affiliate=False),
        MarketplaceListing("etsy:cheap-rocks", 12.0, "USD", 3.6, affiliate=False),  # below whitelist
    ],
    "Clear Quartz": [
        MarketplaceListing("etsy:quartz-co", 18.0, "USD", 4.7, affiliate=False),
        MarketplaceListing("etsy:healing-stones", 25.0, "USD", 4.5, affiliate=True),
    ],
    "Green Aventurine": [
        MarketplaceListing("etsy:green-shop", 22.0, "USD", 4.6, affiliate=True),
        MarketplaceListing("etsy:lucky-gems", 30.0, "USD", 4.4, affiliate=False),
    ],
    "Carnelian": [
        MarketplaceListing("etsy:sun-stones", 28.0, "USD", 4.9, affiliate=False),
    ],
    "Tiger's Eye": [
        MarketplaceListing("etsy:earth-gems", 19.0, "USD", 4.5, affiliate=True),
    ],
}


class InMemoryMarketplaceSearch:
    """Port impl: deterministic stub search with whitelist enforcement (REMED-1).

    Production replaces search() with web_search + HTML/API parse over the
    whitelisted shops, behind a 24h Redis cache. The whitelist (rating ≥ 4.0)
    is enforced here so it's part of the contract, not the caller's job.
    """

    async def search(self, query: str, currency: str = "USD"
                     ) -> list[MarketplaceListing]:
        raw = _STUB_LISTINGS.get(query, [])
        # Enforce whitelist: drop anything below the threshold.
        return [l for l in raw if l.rating >= WHITELIST_MIN_RATING]


class InMemoryRemedyCache:
    """Port impl: 24h recommendation cache keyed by request signature."""

    def __init__(self) -> None:
        self._store: dict[str, list[Remedy]] = {}

    async def get(self, key: str) -> Optional[list[Remedy]]:
        return self._store.get(key)

    async def set(self, key: str, remedies: list[Remedy]) -> None:
        self._store[key] = remedies
