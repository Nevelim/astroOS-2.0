"""Skyfield-backed current-positions provider for daily content.

Fetches TODAY's planetary ecliptic longitudes from the astro_engine's
SkyfieldEphemeris (NASA JPL DE421) so the TransitContentGenerator can produce
dynamic, transit-based horoscopes. This is the production provider; tests use
StaticPositionsProvider with fixed values.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional


class SkyfieldPositionsProvider:
    """Port impl: current planetary positions via the astro_engine ephemeris."""

    def __init__(self) -> None:
        self._ephemeris = None
        self._planets = None

    def _ensure_loaded(self) -> None:
        if self._ephemeris is not None:
            return
        from services.astro_engine.adapter.ephemeris import SkyfieldEphemeris
        from services.astro_engine.domain.constants import Planet
        # Only the daily-relevant inner planets (fast movers) + Jupiter/Saturn.
        self._ephemeris = SkyfieldEphemeris()
        self._planets = (Planet.SUN, Planet.MOON, Planet.MERCURY,
                         Planet.VENUS, Planet.MARS, Planet.JUPITER)

    def for_date(self, for_date: date) -> dict[str, float]:
        """Return today's planetary ecliptic longitudes at 12:00 UTC."""
        self._ensure_loaded()
        utc = datetime(for_date.year, for_date.month, for_date.day,
                       12, 0, 0, tzinfo=timezone.utc)
        positions = self._ephemeris.positions(utc, 0.0, 0.0,
                                              planets=self._planets)
        return {p.planet.value: p.ecliptic_longitude_deg for p in positions}


def default_positions_provider() -> Optional[SkyfieldPositionsProvider]:
    """Factory: Skyfield provider when the ephemeris is available, else None.

    Returns None if skyfield/de421 aren't installed — the caller then falls
    back to the static TemplateContentGenerator.
    """
    try:
        return SkyfieldPositionsProvider()
    except Exception:
        return None
