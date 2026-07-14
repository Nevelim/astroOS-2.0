"""Remedies use case: build recommendations from favorable elements (REMED-2/3).

Clean Architecture: depends ONLY on the domain layer (catalog, ethics) and
Protocol ports declared here (MarketplaceSearch, RemedyCache). The adapter
layer implements them.

Pipeline:
  1. Resolve favorable elements (用神) — derived from Day Master OR passed in
     (when BAZI-6 already computed them).
  2. For each favorable element, pull catalog remedies (REMED-2): stones,
     colors, metals, scents.
  3. Enrich each remedy with marketplace listings (REMED-3): the search port
     hits the whitelisted marketplaces (rating ≥ 4.0), cached 24h.
  4. Sort listings by rating — NEVER by affiliate (REMED-4 invariant).
  5. Cache the whole recommendation set keyed by Day Master element (24h).

Privacy: reasoning strings reference only the Day Master element, never birth
data. The marketplace search receives only the remedy NAME, never the member's
identity or birth data.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol

from services.remedies.domain.catalog import (
    build_reasoning,
    favorable_elements,
    remedies_for,
)
from services.remedies.domain.entities import (
    Element,
    MarketplaceListing,
    RecommendationRequest,
    Remedy,
)
from services.remedies.domain.ethics import sort_by_rating


# --------------------------------------------------------------------------- #
# Ports
# --------------------------------------------------------------------------- #
class MarketplaceSearch(Protocol):
    """Port: search whitelisted marketplaces for a remedy name (REMED-3).

    Returns listings with rating ≥ 4.0 (whitelist enforced here). The adapter
    is responsible for the 24h Redis cache; the port is just the contract.
    """

    async def search(self, query: str, currency: str = "USD"
                     ) -> list[MarketplaceListing]:
        ...  # pragma: no cover


class RemedyCache(Protocol):
    """Port: cache recommendation sets keyed by request cache_key (24h)."""

    async def get(self, key: str) -> Optional[list[Remedy]]:
        ...  # pragma: no cover

    async def set(self, key: str, remedies: list[Remedy]) -> None:
        ...  # pragma: no cover


# --------------------------------------------------------------------------- #
# Use case
# --------------------------------------------------------------------------- #
@dataclass
class RecommendRemedies:
    marketplace: MarketplaceSearch
    cache: RemedyCache

    async def execute(self, request: RecommendationRequest) -> list[Remedy]:
        dm = request.day_master_element
        key = request.cache_key()

        # 1. Cache check (24h, keyed by the full request signature)
        cached = await self.cache.get(key)
        if cached is not None:
            return cached

        # 2. Favorable elements
        favorables = request.favorable_elements or favorable_elements(dm)

        # 3 + 4. Catalog remedies → enrich with marketplace (sorted by rating)
        result: list[Remedy] = []
        for element in favorables:
            for base in remedies_for(element):
                listings = await self.marketplace.search(base.name)
                listings = sort_by_rating(listings)  # REMED-4: rating, not affiliate
                enriched = Remedy(
                    element=base.element, type=base.type, name=base.name,
                    reasoning=build_reasoning(element, dm, request.lang),
                    listings=tuple(listings),
                )
                result.append(enriched)

        # 5. Cache
        await self.cache.set(key, result)
        return result
