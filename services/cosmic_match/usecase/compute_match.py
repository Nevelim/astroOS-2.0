"""Cosmic Match use case: orchestrate the 3-layer compatibility computation.

Clean Architecture: this module depends ONLY on the domain layer (pure math)
and on Protocol ports (ProfileRegistry, MatchCache) declared here. The
adapter layer (adapter/registry.py) implements the ports. The api layer
injects concrete adapters via the constructor — no service locator, no
framework coupling.

Flow (per Architecture ADR SM-05 / Cosmic Match epic):
  1. Resolve both profiles from the registry (404 if either is missing).
  2. Cache check — compatibility is symmetric & deterministic, so the key
     is the sorted profile-id pair.
  3. Domain computation: compute_compatibility() — pure, privacy-safe.
  4. Cache write + return.

Privacy invariant (tested explicitly in tests/integration): the returned
CompatibilityResult carries ONLY profile ids, scores, and an explanation
assembled from natal/bazi summaries — never raw birth data.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol

from services.cosmic_match.domain.entities import (
    CompatibilityResult,
    MatchIntent,
    MemberProfile,
    compute_compatibility,
)


# --------------------------------------------------------------------------- #
# Ports — the use case depends on these abstractions, NOT on concrete adapters.
# --------------------------------------------------------------------------- #
class ProfileRegistry(Protocol):
    """Port: lookup a matching-eligible profile by id."""

    def get(self, profile_id: str) -> Optional[MemberProfile]:
        ...  # pragma: no cover


class MatchCache(Protocol):
    """Port: symmetric compatibility cache keyed by ordered profile-id pair."""

    async def get(self, profile_a: str, profile_b: str) -> Optional[CompatibilityResult]:
        ...  # pragma: no cover

    async def set(self, profile_a: str, profile_b: str,
                  result: CompatibilityResult) -> None:
        ...  # pragma: no cover


# --------------------------------------------------------------------------- #
# Errors
# --------------------------------------------------------------------------- #
class ProfileNotFound(Exception):
    """A referenced profile_id is not in the registry (opted out / unknown)."""

    def __init__(self, profile_id: str) -> None:
        self.profile_id = profile_id
        super().__init__(f"profile '{profile_id}' not found in match pool")


# --------------------------------------------------------------------------- #
# Use case
# --------------------------------------------------------------------------- #
@dataclass
class ComputeMatch:
    registry: ProfileRegistry
    cache: MatchCache

    async def execute(
        self,
        profile_a_id: str,
        profile_b_id: str,
        intent: MatchIntent = MatchIntent.ROMANTIC,
    ) -> CompatibilityResult:
        if profile_a_id == profile_b_id:
            raise ValueError("cannot compute self-compatibility")

        a = self.registry.get(profile_a_id)
        if a is None:
            raise ProfileNotFound(profile_a_id)
        b = self.registry.get(profile_b_id)
        if b is None:
            raise ProfileNotFound(profile_b_id)

        # Cache check (symmetric — key is order-independent)
        cached = await self.cache.get(profile_a_id, profile_b_id)
        if cached is not None:
            return cached

        result = compute_compatibility(a, b, intent)
        await self.cache.set(profile_a_id, profile_b_id, result)
        return result
