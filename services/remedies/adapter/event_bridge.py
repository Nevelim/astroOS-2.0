"""Remedies event-bus consumer: prefetch on bazi.computed (REMED-2).

Subscribes to the bazi.computed stream. When BaZi publishes favorable elements
(BAZI-6), Remedies warms its recommendation cache for that Day Master so the
member's subsequent GET /v1/remedies/recommendations is a cache hit. This is
the REMED-2 "sub на bazi.computed для prefetch" requirement.

Idempotency: dedup by event_id (a redelivered bazi.computed just re-warms the
same cache key, which is harmless — but we skip anyway to avoid redundant work).
"""
from __future__ import annotations

from typing import Optional

from services.common.eventbus import EventBus
from services.common.events import STREAM_BAZI_COMPUTED, EventEnvelope
from services.remedies.domain.entities import Element, RecommendationRequest
from services.remedies.usecase.recommend import RecommendRemedies


class RemediesEventBridge:
    """Wires bazi.computed → recommendation-cache warmup."""

    def __init__(self, bus: EventBus, usecase: RecommendRemedies) -> None:
        self._bus = bus
        self._usecase = usecase
        self._seen: set[str] = set()
        self.warmed: list[str] = []  # test inspection: Day Master elements warmed

    def wire(self) -> None:
        self._bus.subscribe(STREAM_BAZI_COMPUTED, self._on_bazi_computed)

    async def _on_bazi_computed(self, env: EventEnvelope) -> None:
        if env.event_id in self._seen:
            return
        self._seen.add(env.event_id)
        dm = env.payload.get("day_master_element")
        if not dm:
            return
        try:
            element = Element(dm)
        except ValueError:
            return
        # Warm the cache. Favorable elements come straight from the event if
        # present; otherwise the use case derives them from the Day Master.
        favorable = tuple(
            Element(e) for e in env.payload.get("favorable_elements", [])
            if e in {el.value for el in Element}
        )
        await self._usecase.execute(RecommendationRequest(
            day_master_element=element,
            favorable_elements=favorable,
        ))
        self.warmed.append(dm)
