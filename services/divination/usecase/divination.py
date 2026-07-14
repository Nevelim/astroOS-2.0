"""Divination use cases: thin orchestration over the pure domain draws.

The domain functions (draw_tarot, cast_iching) already do the real work with
CSPRNG randomness. These use cases wrap them in injectable callables so the
API layer can substitute deterministic RNG for tests if needed, and so the
shape mirrors the other services' Clean-Architecture layering.
"""
from __future__ import annotations

from typing import Optional

from services.divination.domain.iching import IChingHexagram, cast_iching
from services.divination.domain.tarot import (
    Spread,
    TarotDrawResult,
    draw_tarot,
)


class DrawTarot:
    """Use case: draw a tarot spread."""

    def execute(self, spread: Spread = Spread.THREE,
                question: Optional[str] = None) -> TarotDrawResult:
        return draw_tarot(spread=spread, question=question)


class CastIChing:
    """Use case: cast an I Ching hexagram."""

    def execute(self, question: Optional[str] = None) -> IChingHexagram:
        return cast_iching()
