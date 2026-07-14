"""Cosmic Match adapters: profile registry + match cache.

The adapter layer is the OUTER ring: it implements the ports declared in
`usecase.compute_match`. Production swaps these for Postgres (profile pool)
and Redis (compatibility cache, partitioned by region). The in-memory
versions here are deterministic, fast, and free — sufficient for dev/test
and for the golden privacy-invariant tests.

Privacy note: the registry stores ONLY the matching-eligible projection
(MemberProfile). Raw birth data never enters this service — the BFF computes
natal/BaZi summaries upstream and passes the compact, privacy-safe profile.
"""
from __future__ import annotations

from typing import Optional

from services.cosmic_match.domain.entities import MemberProfile


class InMemoryProfileRegistry:
    """Port impl: stores MemberProfile by profile_id.

    Thread-unsafe by design — single-process dev. Production: Postgres
    `match_profiles` table, region-partitioned, opt-out = hard delete.
    """

    def __init__(self) -> None:
        self._profiles: dict[str, MemberProfile] = {}

    def put(self, profile: MemberProfile) -> None:
        self._profiles[profile.profile_id] = profile

    def get(self, profile_id: str) -> Optional[MemberProfile]:
        return self._profiles.get(profile_id)

    def remove(self, profile_id: str) -> bool:
        """Opt-out: instant removal from the pool. Returns True if existed."""
        return self._profiles.pop(profile_id, None) is not None

    def all(self) -> tuple[MemberProfile, ...]:
        return tuple(self._profiles.values())

    def count(self) -> int:
        return len(self._profiles)


class InMemoryMatchCache:
    """Port impl: memoizes computed compatibility by an ordered profile-id pair.

    Compatibility is symmetric and deterministic (pure function of the two
    profiles), so the cache key is the sorted pair. TTL in production: 7d
    (profile summaries change rarely). Here it's unbounded — dev only.
    """

    def __init__(self) -> None:
        self._store: dict[str, object] = {}

    async def get(self, profile_a: str, profile_b: str) -> Optional[object]:
        return self._store.get(self._key(profile_a, profile_b))

    async def set(self, profile_a: str, profile_b: str, result: object) -> None:
        self._store[self._key(profile_a, profile_b)] = result

    @staticmethod
    def _key(a: str, b: str) -> str:
        ordered = "__".join(sorted((a, b)))
        return f"match:compat:{ordered}"
