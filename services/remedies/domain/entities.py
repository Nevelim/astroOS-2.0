"""Remedies domain: elements, remedy types, listings, recommendation entities.

Pure domain — no DB, no marketplace I/O. Defines the Five Elements taxonomy
(aligned with bazi_engine's Element enum so favorable-element data flows in
unchanged), the remedy catalog types (stone / color / metal / scent), and
the marketplace listing model.

The favorable-element → remedy mapping (REMED-2) and the rating-based ethical
sort (REMED-4) live in sibling pure modules (catalog.py, ethics.py).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Element(str, Enum):
    """The Five Elements (五行) — aligned with bazi_engine.domain.constants."""
    WOOD = "wood"
    FIRE = "fire"
    EARTH = "earth"
    METAL = "metal"
    WATER = "water"


class RemedyType(str, Enum):
    """Categories of remedies mapped from favorable elements (REMED-2)."""
    STONE = "stone"      # crystals / gemstones
    COLOR = "color"      # supportive colors
    METAL = "metal"      # precious metals
    SCENT = "scent"      # essential oils / incense


@dataclass(frozen=True)
class MarketplaceListing:
    """A marketplace offer for a remedy. Sorted by rating, NOT affiliate (REMED-4)."""
    shop: str                 # e.g. "etsy:aquamarine-store" (whitelisted, rating ≥ 4.0)
    price_local: float        # in the member's local currency
    currency: str             # ISO 4217, e.g. "USD"
    rating: float             # 0.0–5.0
    affiliate: bool = False   # affiliate link (REMED-5) — never affects sort


@dataclass(frozen=True)
class Remedy:
    """A single remedy recommendation (one element × one type)."""
    element: Element
    type: RemedyType
    name: str                       # localized display name, e.g. "Aquamarine"
    reasoning: str                  # privacy-safe — references Day Master, not birth data
    listings: tuple[MarketplaceListing, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class RecommendationRequest:
    """Input to the recommendation engine.

    `day_master_element` is the BaZi Day Master element (e.g. WOOD for 甲).
    Favorable elements are derived from it (mother + wealth per 用神 heuristic),
    OR passed explicitly (when bazi_engine already computed them via BAZI-6).
    The cache key includes the explicit override so two requests with the
    same Day Master but different favorable sets don't collide.
    """
    day_master_element: Element
    favorable_elements: tuple[Element, ...] = ()  # empty → derived from day master
    lang: str = "en"

    def cache_key(self) -> str:
        fav = ",".join(e.value for e in self.favorable_elements)
        return f"{self.day_master_element.value}:{self.lang}:{fav}"
