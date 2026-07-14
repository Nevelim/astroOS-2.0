"""HTTP API for the BaZi Engine service.

  GET /v1/charts/bazi/:birth_data_hash
  GET /healthz   GET /readyz

Errors: RFC 7807 problem+json. Responses: immutable + ETag.

In production the BirthFacts are looked up by hash from Redis (cached by the
Birth-Time service). For dev/tests we inject an in-memory provider.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import time
from typing import Optional

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.bazi_engine.adapter.solar_terms import (
    ApproxSolarTermsProvider,
    BirthFacts,
    BirthFactsProvider,
)
from services.bazi_engine.usecase.resolve_bazi import BaZiChart, ResolveBaZi
from services.birth_time.domain.entities import TimeQuality


# --------------------------------------------------------------------------- #
# In-memory birth-facts store (dev/test). Production: Redis-backed.
# --------------------------------------------------------------------------- #
@dataclass
class InMemoryBirthFacts:
    """Maps birth_data_hash → resolved BirthFacts. Populated by tests/dev."""

    store: dict[str, BirthFacts]

    def by_birth_data_hash(self, h: str) -> Optional[BirthFacts]:
        return self.store.get(h)


# --------------------------------------------------------------------------- #
# Composition root
# --------------------------------------------------------------------------- #
@dataclass
class Dependencies:
    facts: BirthFactsProvider
    resolver: ResolveBaZi


def default_dependencies() -> Dependencies:
    return Dependencies(
        facts=InMemoryBirthFacts(store={}),
        resolver=ResolveBaZi(solar_terms=ApproxSolarTermsProvider()),
    )


def create_app(deps: Optional[Dependencies] = None,
               event_bus=None) -> FastAPI:
    from services.common.observability import setup_telemetry, instrument_app
    setup_telemetry("astroos-bazi-engine")
    deps = deps or default_dependencies()
    app = FastAPI(
        title="AstroOS BaZi Engine",
        version="1.0.0",
        docs_url="/docs",
        redoc_url=None,
    )
    app.state.deps = deps
    app.state.event_bus = event_bus

    def problem(status: int, slug: str, title: str, detail: str,
                instance: str) -> JSONResponse:
        return JSONResponse(
            status_code=status,
            content={
                "type": f"https://errors.astroos.com/{slug}",
                "title": title, "status": status, "detail": detail,
                "instance": instance,
            },
            media_type="application/problem+json",
        )

    class PillarDTO(BaseModel):
        stem: str
        branch: str
        stem_hanzi: str
        branch_hanzi: str
        element: str
        polarity: str

    class BaZiResponse(BaseModel):
        birth_data_hash: str
        time_standard_used: str
        tst_used: str
        pillars: dict
        day_master: dict
        luck_pillars: list
        ten_gods: dict
        favorable_elements: list
        note: str

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        return {"status": "alive"}

    @app.get("/readyz", tags=["meta"])
    def readyz() -> dict:
        return {"status": "ready"}

    @app.get("/v1/charts/bazi/{birth_data_hash}", tags=["bazi"],
             response_model=BaZiResponse)
    def get_bazi(birth_data_hash: str, request: Request) -> JSONResponse:
        instance = request.url.path
        facts = deps.facts.by_birth_data_hash(birth_data_hash)
        if facts is None:
            return problem(404, "birth-facts/not-found",
                           "Birth facts not found",
                           "Resolve the birth time first via /v1/birth-time/resolve, "
                           "then retry this endpoint with the returned hash.",
                           instance)

        chart = deps.resolver.execute(facts, birth_data_hash)

        from services.bazi_engine.domain.constants import (
            STEM_HANZI as _SH, BRANCH_HANZI as _BH,
        )

        def pillar_dto(p) -> dict:
            return {
                "stem": p.stem.value, "branch": p.branch.value,
                "stem_hanzi": _SH[p.stem], "branch_hanzi": _BH[p.branch],
                "element": p.element.value, "polarity": p.polarity.value,
                "hanzi": p.hanzi(),
            }

        pillars_dto = {
            "year": pillar_dto(chart.pillars.year),
            "month": pillar_dto(chart.pillars.month),
            "day": pillar_dto(chart.pillars.day),
        }
        if chart.pillars.hour is not None:
            pillars_dto["hour"] = pillar_dto(chart.pillars.hour)

        return JSONResponse(
            status_code=200,
            headers={
                "ETag": f'"{birth_data_hash}"',
                "Cache-Control": "public, max-age=31536000, immutable",
            },
            content={
                "birth_data_hash": chart.birth_data_hash,
                "time_standard_used": chart.time_standard_used,
                "tst_used": chart.tst_used,
                "pillars": pillars_dto,
                "day_master": {
                    "stem": chart.day_master.stem.value,
                    "element": chart.day_master.element.value,
                    "polarity": chart.day_master.polarity.value,
                    "hanzi": chart.day_master.hanzi,
                    "label": chart.day_master.label,
                },
                "luck_pillars": [
                    {"age_start": lp.age_start, "current": lp.current,
                     "pillar": pillar_dto(lp.pillar)}
                    for lp in chart.luck_pillars
                ],
                "ten_gods": {k: v.value for k, v in chart.ten_gods.items()},
                "favorable_elements": [e.value for e in chart.favorable_elements],
                "dm_strength": chart.dm_strength,
                "yong_shen": {
                    "method": chart.yong_shen_method,
                    "reasoning": chart.yong_shen_reasoning,
                },
                "note": chart.note,
            },
        )

    # ---- event publishing (BAZI-6: bazi.computed → Remedies prefetch) ---- #
    @app.post("/v1/bazi/events/emit", tags=["bazi"])
    async def emit_bazi_computed(payload: dict, request: Request) -> JSONResponse:
        """Debug endpoint to publish a bazi.computed event (BAZI-6).
        Production: emitted automatically after BaZi computation completes."""
        if event_bus is None:
            return JSONResponse(status_code=503, content={
                "error": "event bus not configured"})
        from services.common.events import BaziComputedEvent
        ev = BaziComputedEvent(
            member_id=payload["member_id"],
            day_master_element=payload["day_master_element"],
            favorable_elements=tuple(payload.get("favorable_elements", [])),
            birth_data_hash=payload.get("birth_data_hash", ""))
        await event_bus.publish(ev.envelope())
        return JSONResponse(status_code=202, content={"published": True,
                                                      "type": "bazi.computed"})

    instrument_app(app)
    return app


from services.common.eventbus import default_bus  # noqa: E402

app = create_app(event_bus=default_bus())
