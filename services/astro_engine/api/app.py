"""HTTP API for the Astro Engine service.

  GET /v1/charts/natal/:birth_data_hash?house_system=whole_sign|placidus
  GET /v1/charts/natal/:hash/planet/:name
  GET /healthz   GET /readyz

Errors: RFC 7807 problem+json. Responses: immutable + ETag.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse

from services.astro_engine.adapter.ephemeris import SkyfieldEphemeris
from services.astro_engine.domain.chart import house_of
from services.astro_engine.domain.constants import (
    HouseSystem, PLANETS, PLANET_NAME_RU, PLANET_SYMBOL,
    Planet, SIGN_ELEMENT, SIGN_MODALITY, SIGN_NAME_RU, SIGN_SYMBOL, Sign,
    sign_of,
)
from services.astro_engine.usecase.build_natal import BuildNatalChart
from services.bazi_engine.adapter.solar_terms import BirthFacts, BirthFactsProvider


@dataclass
class InMemoryBirthFacts:
    store: dict[str, "BirthFactsAndCoords"]

    def by_birth_data_hash(self, h: str):
        entry = self.store.get(h)
        return entry.facts if entry else None


@dataclass
class BirthFactsAndCoords:
    facts: BirthFacts
    utc: datetime
    lat: float
    lng: float


@dataclass
class Dependencies:
    facts: "BirthFactsStore"
    builder: BuildNatalChart


@dataclass
class BirthFactsStore:
    """Composite store: birth facts + the UTC/coords needed for the chart."""
    entries: dict[str, BirthFactsAndCoords]

    def by_birth_data_hash(self, h: str) -> Optional[BirthFactsAndCoords]:
        return self.entries.get(h)


def default_dependencies() -> Dependencies:
    return Dependencies(
        facts=BirthFactsStore(entries={}),
        builder=BuildNatalChart(ephemeris=SkyfieldEphemeris()),
    )


def create_app(deps: Optional[Dependencies] = None) -> FastAPI:
    from services.common.observability import setup_telemetry, instrument_app
    setup_telemetry("astroos-astro-engine")
    deps = deps or default_dependencies()
    app = FastAPI(
        title="AstroOS Astro Engine",
        version="1.0.0",
        docs_url="/docs",
        redoc_url=None,
    )
    app.state.deps = deps

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

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        return {"status": "alive"}

    @app.get("/readyz", tags=["meta"])
    def readyz() -> dict:
        return {"status": "ready"}

    def _build_response(chart, house_system: HouseSystem) -> dict:
        planets_dto = []
        for p in chart.planets:
            planets_dto.append({
                "name": p.planet.value,
                "name_ru": PLANET_NAME_RU[p.planet],
                "symbol": PLANET_SYMBOL[p.planet],
                "ecliptic_longitude_deg": round(p.ecliptic_longitude_deg, 4),
                "sign": p.sign.value,
                "sign_ru": SIGN_NAME_RU[p.sign],
                "sign_symbol": SIGN_SYMBOL[p.sign],
                "degree_in_sign": round(p.degree_in_sign, 4),
                "element": SIGN_ELEMENT[p.sign].value,
                "modality": SIGN_MODALITY[p.sign].value,
                "house": house_of(p.ecliptic_longitude_deg, chart.houses),
                "retrograde": p.retrograde,
            })
        aspects_dto = [
            {"a": a.a.value, "b": a.b.value, "type": a.type.value,
             "orb_deg": round(a.orb_deg, 4),
             "separation_deg": round(a.separation_deg, 4)}
            for a in chart.aspects
        ]
        houses_dto = {
            "system": chart.houses.system.value,
            "cusps_deg": [round(c, 4) for c in chart.houses.cusps_deg],
            "angles": {
                "ascendant_deg": round(chart.houses.angles.ascendant_deg, 4),
                "midheaven_deg": round(chart.houses.angles.midheaven_deg, 4),
                "descendant_deg": round(chart.houses.angles.descendant_deg, 4),
                "imum_coeli_deg": round(chart.houses.angles.imum_coeli_deg, 4),
            },
            "polar_fallback": chart.houses.polar_fallback,
        }
        nodes_dto = None
        if chart.nodes is not None:
            nodes_dto = {
                "north": {"longitude_deg": round(chart.nodes.north_longitude_deg, 4),
                          "sign": sign_of(chart.nodes.north_longitude_deg).value},
                "south": {"longitude_deg": round(chart.nodes.south_longitude_deg, 4),
                          "sign": sign_of(chart.nodes.south_longitude_deg).value},
            }
        return {
            "birth_utc": chart.birth_utc.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "latitude": chart.latitude,
            "longitude": chart.longitude,
            "house_system": chart.house_system.value,
            "planets": planets_dto,
            "houses": houses_dto,
            "aspects": aspects_dto,
            "nodes": nodes_dto,
        }

    @app.get("/v1/charts/natal/{birth_data_hash}", tags=["astro"])
    def get_natal(
        birth_data_hash: str,
        request: Request,
        house_system: HouseSystem = Query(HouseSystem.WHOLE_SIGN),
    ) -> JSONResponse:
        instance = request.url.path
        entry = deps.facts.by_birth_data_hash(birth_data_hash)
        if entry is None:
            return problem(404, "birth-facts/not-found",
                           "Birth facts not found",
                           "Resolve the birth time first via /v1/birth-time/resolve, "
                           "then retry with the returned hash.",
                           instance)
        chart = deps.builder.execute(entry.utc, entry.lat, entry.lng, house_system)
        body = _build_response(chart, house_system)
        body["birth_data_hash"] = birth_data_hash
        body["engine"] = "skyfield-de421"
        return JSONResponse(
            status_code=200,
            headers={
                "ETag": f'"{birth_data_hash}"',
                "Cache-Control": "public, max-age=31536000, immutable",
            },
            content=body,
        )

    @app.get("/v1/charts/natal/{birth_data_hash}/planet/{planet}", tags=["astro"])
    def get_planet_detail(
        birth_data_hash: str,
        planet: str,
        request: Request,
        house_system: HouseSystem = Query(HouseSystem.WHOLE_SIGN),
    ) -> JSONResponse:
        instance = request.url.path
        try:
            p = Planet(planet)
        except ValueError:
            return problem(404, "planet/not-found",
                           "Unknown planet",
                           f"'{planet}' is not a valid planet name. "
                           f"Valid: {', '.join(p.value for p in PLANETS)}",
                           instance)
        entry = deps.facts.by_birth_data_hash(birth_data_hash)
        if entry is None:
            return problem(404, "birth-facts/not-found",
                           "Birth facts not found", "Resolve birth time first.",
                           instance)
        chart = deps.builder.execute(entry.utc, entry.lat, entry.lng, house_system)
        pos = chart.planet(p)
        if pos is None:
            return problem(404, "planet/not-found", "Planet missing",
                           f"{planet} not in chart.", instance)
        return JSONResponse(
            status_code=200,
            headers={"Cache-Control": "public, max-age=31536000, immutable"},
            content={
                "planet": pos.planet.value,
                "name_ru": PLANET_NAME_RU[pos.planet],
                "symbol": PLANET_SYMBOL[pos.planet],
                "ecliptic_longitude_deg": round(pos.ecliptic_longitude_deg, 4),
                "sign": pos.sign.value,
                "sign_ru": SIGN_NAME_RU[pos.sign],
                "sign_symbol": SIGN_SYMBOL[pos.sign],
                "element": SIGN_ELEMENT[pos.sign].value,
                "modality": SIGN_MODALITY[pos.sign].value,
                "house": house_of(pos.ecliptic_longitude_deg, chart.houses),
                "retrograde": pos.retrograde,
            },
        )

    instrument_app(app)
    return app


app = create_app()
