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
from services.bazi_engine.domain.constants import (
    STEM_HANZI as _SH, BRANCH_HANZI as _BH, Element, Stem,
)
from services.birth_time.domain.entities import TimeQuality


# --------------------------------------------------------------------------- #
# DTO helpers for the enriched chart response (блоки 3, 7, 8, 9, 10)
# --------------------------------------------------------------------------- #
def _natal_branches(chart: BaZiChart) -> dict:
    return {k: getattr(chart.pillars, k).branch
            for k in ("year", "month", "day")
            if getattr(chart.pillars, k) is not None
            and (k != "hour" or chart.pillars.hour is not None)} | (
        {"hour": chart.pillars.hour.branch} if chart.pillars.hour else {}
    )


def _element_balance_dto(chart: BaZiChart) -> dict:
    from services.bazi_engine.domain.interpretation import (
        element_balance, dominant_element, deficient_elements)
    bal = element_balance(chart.pillars)
    return {
        "counts": {e.value: bal.get(e, 0) for e in Element},
        "dominant": dominant_element(bal).value,
        "deficient": [e.value for e in deficient_elements(bal)],
    }


def _annual_pillars_dto(chart: BaZiChart, facts: BirthFacts) -> list:
    from services.bazi_engine.domain.pillars import annual_pillars_range
    from datetime import date
    base = date.today().year
    return [
        {"year": y, "stem": p.stem.value, "branch": p.branch.value,
         "stem_hanzi": _SH[p.stem], "branch_hanzi": _BH[p.branch],
         "element": p.element.value}
        for y, p in annual_pillars_range(base, count=3)
    ]


def _clashes_dto(chart: BaZiChart) -> list:
    from services.bazi_engine.domain.clashes import find_clashes
    natal = {k: getattr(chart.pillars, k).branch
             for k in ("year", "month", "day") if getattr(chart.pillars, k)}
    if chart.pillars.hour:
        natal["hour"] = chart.pillars.hour.branch
    # Current Luck Pillar clashes with natal.
    current_lp = next((lp for lp in chart.luck_pillars if lp.current), None)
    out: list[dict] = []
    if current_lp:
        for c in find_clashes(current_lp.pillar.branch, natal):
            out.append({"source": "current_luck_pillar",
                        "kind": c.kind, "natal_pillar": c.natal_pillar,
                        "severity": c.severity,
                        "risk_domains": list(c.risk_domains),
                        "description": c.description})
    return out


def _directions_dto(chart: BaZiChart) -> dict:
    from services.bazi_engine.domain.directions import (
        direction_for, countries_for, DIRECTION_LABEL)
    fav = chart.favorable_elements
    return {
        "favorable": [
            {
                "element": e.value,
                "direction": direction_for(e),
                "direction_label": DIRECTION_LABEL.get(direction_for(e), ("", "", "")),
                "purpose": countries_for(e)[0],
                "countries": list(countries_for(e)[1]),
            }
            for e in fav
        ],
    }


def _professions_dto(chart: BaZiChart) -> list:
    from services.bazi_engine.domain.professions import professions_for
    dm_element = chart.day_master.element
    return [
        {"title": p.title, "title_ru": p.title_ru, "reason": p.reason}
        for p in professions_for(dm_element, top_n=3)
    ]


def _famous_people_dto(chart: BaZiChart) -> list:
    from services.bazi_engine.domain.famous_people import famous_people_for
    return [
        {"name": p.name, "name_ru": p.name_ru, "era": p.era,
         "achievement": p.achievement, "achievement_ru": p.achievement_ru}
        for p in famous_people_for(chart.day_master.stem, limit=3)
    ]


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
                "element_balance": _element_balance_dto(chart),
                "annual_pillars": _annual_pillars_dto(chart, facts),
                "clashes": _clashes_dto(chart),
                "directions": _directions_dto(chart),
                "professions": _professions_dto(chart),
                "famous_people": _famous_people_dto(chart),
                "note": chart.note,
            },
        )

    # ---- forecast: риск-годы переезда/здоровья (блок 9) --------------- #
    @app.get("/v1/charts/bazi/{birth_data_hash}/forecast", tags=["bazi"])
    def get_forecast(birth_data_hash: str, request: Request,
                     years: int = 3) -> JSONResponse:
        instance = request.url.path
        facts = deps.facts.by_birth_data_hash(birth_data_hash)
        if facts is None:
            return problem(404, "birth-facts/not-found",
                           "Birth facts not found", "Resolve birth time first.",
                           instance)
        chart = deps.resolver.execute(facts, birth_data_hash)
        from services.bazi_engine.domain.pillars import annual_pillars_range
        from services.bazi_engine.domain.clashes import find_clashes, is_high_risk_period
        from datetime import date
        natal_branches = _natal_branches(chart)
        out: list[dict] = []
        base_year = date.today().year
        for y, p in annual_pillars_range(base_year, count=years):
            clashes = find_clashes(p.branch, natal_branches)
            out.append({
                "year": y,
                "annual_pillar": {
                    "stem": p.stem.value, "branch": p.branch.value,
                    "stem_hanzi": _SH[p.stem], "branch_hanzi": _BH[p.branch],
                    "element": p.element.value,
                },
                "high_risk": is_high_risk_period(p.branch, natal_branches),
                "clashes": [
                    {"kind": c.kind, "natal_pillar": c.natal_pillar,
                     "severity": c.severity,
                     "risk_domains": list(c.risk_domains),
                     "description": c.description}
                    for c in clashes
                ],
            })
        return JSONResponse(status_code=200, content={
            "birth_data_hash": birth_data_hash,
            "base_year": base_year,
            "years": out,
        })

    # ---- date selection: благоприятные даты (блок: выбор дат) ---------- #
    @app.post("/v1/bazi/date-selection", tags=["bazi"])
    def date_selection(payload: dict, request: Request) -> JSONResponse:
        from services.bazi_engine.domain.date_selection import select_dates
        from services.bazi_engine.domain.constants import Stem
        from datetime import date
        day_master_stem_str = payload.get("day_master_stem")
        goal = payload.get("goal", "business")
        days_ahead = int(payload.get("days_ahead", 90))
        top_n = int(payload.get("top_n", 5))
        start_str = payload.get("start_date")
        if not day_master_stem_str:
            return problem(422, "bazi/date-selection-invalid",
                           "Missing day_master_stem",
                           "'day_master_stem' (the Day Master stem) is required.",
                           request.url.path)
        try:
            dm_stem = Stem(day_master_stem_str.lower())
        except ValueError:
            return problem(422, "bazi/date-selection-invalid",
                           "Invalid stem",
                           f"'{day_master_stem_str}' is not a valid stem.",
                           request.url.path)
        start = date.fromisoformat(start_str) if start_str else date.today()
        results = select_dates(start, dm_stem, goal=goal,
                               days_ahead=days_ahead, top_n=top_n)
        return JSONResponse(status_code=200, content={
            "day_master_stem": dm_stem.value,
            "goal": goal,
            "start_date": start.isoformat(),
            "dates": [
                {"date": r.date.isoformat(), "score": r.score,
                 "label": r.label,
                 "stem_element": r.stem_element.value,
                 "branch_element": r.branch_element.value,
                 "ten_god": r.ten_god.value if r.ten_god else None,
                 "pillar": {"stem": r.day_pillar.stem.value,
                            "branch": r.day_pillar.branch.value,
                            "stem_hanzi": _SH[r.day_pillar.stem],
                            "branch_hanzi": _BH[r.day_pillar.branch]},
                 "reason": r.reason}
                for r in results
            ],
        })

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
