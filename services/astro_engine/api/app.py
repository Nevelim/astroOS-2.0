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
        # Part of Fortune (needs ASC + Sun + Moon longitudes).
        part_of_fortune = None
        sun_pos = next((p for p in chart.planets if p.planet is Planet.SUN), None)
        moon_pos = next((p for p in chart.planets if p.planet is Planet.MOON), None)
        asc_deg = chart.houses.angles.ascendant_deg
        if sun_pos and moon_pos and asc_deg is not None:
            from services.astro_engine.domain.arabic_parts import part_of_fortune as pf
            computed = pf(ascendant_deg=asc_deg,
                          sun_longitude_deg=sun_pos.ecliptic_longitude_deg,
                          moon_longitude_deg=moon_pos.ecliptic_longitude_deg)
            part_of_fortune = {
                "longitude_deg": round(computed.longitude_deg, 4),
                "sign": sign_of(computed.longitude_deg).value,
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
            "part_of_fortune": part_of_fortune,
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

    # ---- transits: current planets vs a natal chart (daily forecast) ----- #
    @app.post("/v1/transits/daily", tags=["astro"])
    def daily_transits(payload: dict, request: Request) -> JSONResponse:
        """Compute today's transits against natal positions → daily forecast.

        Body: { "current": {"sun": 120.5, ...}, "natal": {"sun": 25.5, ...},
                "natal_sun_sign": "aries" (optional) }
        """
        from services.astro_engine.domain.transits import daily_forecast
        current = payload.get("current", {})
        natal = payload.get("natal", {})
        sign = payload.get("natal_sun_sign")
        if not current or not natal:
            return problem(422, "astro/transits-invalid",
                           "Missing positions",
                           "Both 'current' and 'natal' position dicts are required.",
                           request.url.path)
        f = daily_forecast(current, natal, sign)
        return JSONResponse(status_code=200, content={
            "score": f.score,
            "dominant_theme": f.dominant_theme.value if f.dominant_theme else None,
            "summary": f.summary,
            "highlights": list(f.highlights),
            "aspects": [
                {"transiting": a.transiting, "natal_planet": a.natal_planet,
                 "aspect_type": a.aspect_type.value, "orb_deg": a.orb_deg,
                 "weight": a.weight, "theme": a.theme.value}
                for a in f.aspects
            ],
        })

    # ---- lunar phase: Moon phase from Sun-Moon longitudes ------------- #
    @app.get("/v1/lunar-phase", tags=["astro"])
    def get_lunar_phase(sun: float, moon: float) -> JSONResponse:
        """Current lunar phase from the Sun + Moon ecliptic longitudes."""
        from services.astro_engine.domain.lunar_phase import (
            lunar_phase, PHASE_DISPLAY)
        lp = lunar_phase(sun, moon)
        display = PHASE_DISPLAY[lp.phase]
        return JSONResponse(status_code=200, content={
            "phase": lp.phase.value,
            "name_en": display["en"], "name_ru": display["ru"],
            "emoji": display["emoji"],
            "elongation_deg": lp.elongation_deg,
            "illumination_pct": lp.illumination_pct,
            "age_days": lp.age_days,
            "days_to_next_phase": lp.days_to_next_phase,
        })

    # ---- astrocartography: planetary lines across the globe ------------ #
    @app.post("/v1/astrocartography", tags=["astro"])
    def astrocartography(payload: dict, request: Request) -> JSONResponse:
        """Compute planetary lines (MC/IC/ASC/DSC) for a set of planets.

        Body: { "utc": "1989-04-15T09:40:00Z",
                "planets": {"sun": {"ra": 22.5, "dec": 10.0}, ...},
                "latitudes": [-60, -30, 0, 30, 60]  (optional) }
        """
        from services.astro_engine.domain.astrocartography import planetary_lines
        utc_str = payload.get("utc")
        planets_in = payload.get("planets", {})
        latitudes = tuple(payload.get("latitudes", (-60, -30, 0, 30, 60)))
        if not utc_str or not planets_in:
            return problem(422, "astro/astrocartography-invalid",
                           "Missing data",
                           "Both 'utc' and 'planets' (with ra/dec) are required.",
                           request.url.path)
        from datetime import datetime
        utc = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
        all_lines = []
        for pname, coords in planets_in.items():
            ra = coords.get("ra")
            dec = coords.get("dec")
            if ra is None or dec is None:
                continue
            for line in planetary_lines(pname, ra_deg=ra, dec_deg=dec,
                                        utc=utc, latitudes=latitudes):
                all_lines.append({
                    "planet": line.planet, "angle": line.angle,
                    "latitude_deg": line.latitude_deg,
                    "longitude_deg": round(line.longitude_deg, 4),
                })
        return JSONResponse(status_code=200, content={"lines": all_lines})

    # ---- synastry: cross-chart aspects between two charts -------------- #
    @app.post("/v1/synastry", tags=["astro"])
    def synastry(payload: dict, request: Request) -> JSONResponse:
        """Compute synastry (cross-chart aspects + soulmate indicators).

        Body: { "planets_a": {"sun": 25.5, "venus": 28.2, ...},
                "planets_b": {"sun": 120.0, ...},
                "nodes_a": [332.0, 152.0],   (optional)
                "nodes_b": [100.0, 280.0] }  (optional)
        """
        from services.astro_engine.domain.synastry import compute_synastry
        planets_a = payload.get("planets_a", {})
        planets_b = payload.get("planets_b", {})
        if not planets_a or not planets_b:
            return problem(422, "astro/synastry-invalid",
                           "Missing chart data",
                           "Both 'planets_a' and 'planets_b' dicts are required.",
                           request.url.path)
        nodes_a = tuple(payload["nodes_a"]) if payload.get("nodes_a") else None
        nodes_b = tuple(payload["nodes_b"]) if payload.get("nodes_b") else None
        result = compute_synastry(planets_a, planets_b, nodes_a, nodes_b)
        return JSONResponse(status_code=200, content={
            "composite_score": result.composite_score,
            "summary": result.summary,
            "highlights": list(result.highlights),
            "nodal_contacts": [
                {"whose_node": nc.whose_node, "which_node": nc.which_node,
                 "whose_planet": nc.whose_planet, "planet": nc.planet,
                 "orb_deg": nc.orb_deg}
                for nc in result.nodal_contacts
            ],
            "aspects": [
                {"a": a.a_planet, "b": a.b_planet,
                 "type": a.aspect_type.value, "orb_deg": a.orb_deg,
                 "weight": a.weight, "is_highlight": a.is_highlight}
                for a in result.aspects
            ],
        })

    # ---- retrograde status: which planets are retrograde now ----------- #
    @app.get("/v1/retrogrades", tags=["astro"])
    def retrograde_status(request: Request) -> JSONResponse:
        """Which planets are currently retrograde (computed at 12:00 UTC today).

        Uses the same day-over-day longitude-comparison the natal chart uses.
        """
        from services.astro_engine.adapter.ephemeris import SkyfieldEphemeris
        from datetime import datetime, timezone, timedelta
        try:
            eph = SkyfieldEphemeris()
        except Exception:
            return problem(503, "astro/ephemeris-unavailable",
                           "Ephemeris not loaded",
                           "The skyfield ephemeris (de421.bsp) is not available.",
                           request.url.path)
        now = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0,
                                                 microsecond=0)
        positions = eph.positions(now, 0.0, 0.0, planets=PLANETS)
        retrograde_list = []
        direct_list = []
        for p in positions:
            entry = {
                "planet": p.planet.value,
                "name_ru": PLANET_NAME_RU.get(p.planet, p.planet.value),
                "symbol": PLANET_SYMBOL.get(p.planet, ""),
                "longitude_deg": round(p.ecliptic_longitude_deg, 4),
                "sign": p.sign.value,
                "retrograde": p.retrograde,
            }
            if p.retrograde:
                retrograde_list.append(entry)
            else:
                direct_list.append(entry)
        return JSONResponse(status_code=200, content={
            "as_of_utc": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "retrograde": retrograde_list,
            "direct": direct_list,
            "retrograde_count": len(retrograde_list),
        })

    instrument_app(app)
    return app


app = create_app()
