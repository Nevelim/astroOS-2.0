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


def _normalize_planets(planets) -> dict[str, float]:
    """Coerce planet longitudes to {planet: float_degrees}, accepting both the
    flat form {\"Sun\": 25.4} and the nested reference form {\"Sun\": {\"eclip\": 25.4}}.
    """
    out: dict[str, float] = {}
    for planet, val in planets.items():
        if isinstance(val, dict):
            out[planet] = float(val.get("eclip", 0.0))
        else:
            out[planet] = float(val)
    return out


def _family_member_longitudes(utc: datetime, lat: float, lng: float) -> dict[str, float]:
    """Compute the 11 ecliptic longitudes for a family member (mode B).

    Ten planets via SkyfieldEphemeris; NorthNode via the mean-node formula.
    Capitalised names match the abundance engine's PLANETS table.
    """
    from services.astro_engine.domain.abundance import PLANETS as ABUNDANCE_PLANETS
    from services.astro_engine.domain.lunar_nodes import mean_lunar_node
    out: dict[str, float] = {}
    # Reuse the ephemeris bound to the app's builder (single DE421 load).
    positions = SkyfieldEphemeris().positions(utc, lat, lng)
    name_map = {"sun": "Sun", "moon": "Moon", "mercury": "Mercury",
                "venus": "Venus", "mars": "Mars", "jupiter": "Jupiter",
                "saturn": "Saturn", "uranus": "Uranus", "neptune": "Neptune",
                "pluto": "Pluto"}
    for pos in positions:
        cap = name_map.get(pos.planet.value)
        if cap:
            out[cap] = pos.ecliptic_longitude_deg
    node = mean_lunar_node(utc)
    out["NorthNode"] = node.north_longitude_deg
    # Ensure all 11 keys exist (defensive).
    for p in ABUNDANCE_PLANETS:
        out.setdefault(p, 0.0)
    return out


def _family_report_to_dto(report) -> dict:
    """Serialize a FamilyReport to the JSON shape consumed by the BFF/UI."""
    from datetime import datetime, timezone

    def city_dto(r) -> dict:
        return {
            "city": {
                "name": r.city.name, "country": r.city.country,
                "lat": r.city.lat, "lng": r.city.lng, "region": r.city.region,
            },
            "familyAvg": {s: round(r.family_avg[s], 6) for s in r.family_avg},
            "familyMin": {s: round(r.family_min[s], 6) for s in r.family_min},
            "allMembersAllPositive": r.all_members_all_positive,
            "avgAllPositive": r.avg_all_positive,
            "abundanceIndex": round(r.abundance_index, 6),
            "minScore": round(r.min_score, 6),
            "avgScore": round(r.avg_score, 6),
            "harmonicMean": round(r.harmonic_mean, 6),
            "balanceRatio": round(r.balance_ratio, 6),
            "resonances": [
                {"planet": x.planet, "members": list(x.members),
                 "count": x.count, "score": round(x.score, 6)}
                for x in r.resonances
            ],
            "resonanceScore": round(r.resonance_score, 6),
            "crossAspects": [
                {"m1": x.m1, "m2": x.m2, "p1": x.p1, "p2": x.p2,
                 "aspect": x.aspect, "actualAngle": round(x.actual_angle, 6),
                 "deviation": round(x.deviation, 6), "type": x.type,
                 "score": round(x.score, 6)}
                for x in r.cross_aspects
            ],
            "crossAspectScore": round(r.cross_aspect_score, 6),
            "sphereLeaders": [
                {"sphere": x.sphere, "leader": x.leader, "score": round(x.score, 6)}
                for x in r.sphere_leaders
            ],
            "complementarityScore": round(r.complementarity_score, 6),
            "memberAvg": {k: round(v, 6) for k, v in r.member_avg.items()},
            "harmonyRatio": round(r.harmony_ratio, 6),
            "harmonyScore": round(r.harmony_score, 6),
            "totalSynergy": round(r.total_synergy, 6),
            "perMemberScores": {
                k: {s: round(v, 6) for s, v in scores.items()}
                for k, scores in r.per_member_scores.items()
            },
            "perMemberDirectHits": dict(r.per_member_direct_hits),
            "perMemberHasSynergy": dict(r.per_member_has_synergy),
        }

    members_dto = [
        {"key": m.key, "name": m.name} for m in report.members
    ]
    return {
        "members": members_dto,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "totalCities": report.total_cities,
        "abundantCitiesCount": report.abundant_cities_count,
        "strictCitiesCount": report.strict_cities_count,
        "topCitiesBySynergy": [city_dto(r) for r in report.top_cities_by_synergy],
        "topCitiesByAbundance": [city_dto(r) for r in report.top_cities_by_abundance],
        "bestBySynergyType": {
            k: city_dto(v) for k, v in report.best_by_synergy_type.items()
        },
    }


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

    # ---- planetary returns: Saturn/Jupiter/Nodal life milestones -------- #
    @app.get("/v1/returns", tags=["astro"])
    def planetary_returns(birth_year: int,
                          max_age: int = 100) -> JSONResponse:
        """All planetary returns/milestones (Saturn, Jupiter, Nodal, etc.)."""
        from services.astro_engine.domain.returns import returns_for
        events = returns_for(birth_year, max_age=max_age)
        return JSONResponse(status_code=200, content={
            "birth_year": birth_year,
            "events": [
                {"name": e.name, "planet": e.planet, "age": e.age,
                 "theme": e.theme, "cycle_number": e.cycle_number,
                 "is_half_return": e.is_half_return}
                for e in events
            ],
        })

    # ---- secondary progressions: "a day for a year" forecast ----------- #
    @app.post("/v1/progressions", tags=["astro"])
    def progressions(payload: dict, request: Request) -> JSONResponse:
        """Compute secondary progressions from natal positions.

        Advances each natal planet by its mean daily motion × current_age,
        where one day after birth equals one year of life (the Alan Leo
        "day for a year" technique). Also reports the progressed date and any
        upcoming progressed-Sun sign changes (major life-theme shifts).

        Body: { "natal_positions": {"sun": 25.5, "moon": 143.9, ...},
                "birth_utc": "1989-04-15T09:40:00Z",
                "current_age": 36,
                "sign_change_years_ahead": 5 }   (optional, default 5)
        """
        from services.astro_engine.domain.progressions import (
            progressed_chart, progressed_date, progressed_sun_sign_change)
        natal_positions = payload.get("natal_positions", {})
        birth_utc_str = payload.get("birth_utc")
        current_age = payload.get("current_age")
        if not natal_positions or not birth_utc_str or current_age is None:
            return problem(422, "astro/progressions-invalid",
                           "Missing data",
                           "'natal_positions', 'birth_utc', and "
                           "'current_age' are all required.",
                           request.url.path)
        try:
            utc = datetime.fromisoformat(birth_utc_str.replace("Z", "+00:00"))
        except ValueError:
            return problem(422, "astro/progressions-invalid",
                           "Invalid birth_utc",
                           "'birth_utc' must be ISO-8601, e.g. "
                           "'1989-04-15T09:40:00Z'.",
                           request.url.path)
        try:
            age = float(current_age)
        except (TypeError, ValueError):
            return problem(422, "astro/progressions-invalid",
                           "Invalid current_age",
                           "'current_age' must be a number.",
                           request.url.path)
        years_ahead = int(payload.get("sign_change_years_ahead", 5))

        progressed = progressed_chart(natal_positions, utc, age)
        p_date = progressed_date(utc, age)

        natal_sun = natal_positions.get("sun")
        upcoming: list[dict] = []
        if natal_sun is not None:
            upcoming = progressed_sun_sign_change(
                natal_sun, utc, age, years_ahead=years_ahead)

        p_date_str = (p_date.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                      if p_date.tzinfo is not None
                      else p_date.strftime("%Y-%m-%dT%H:%M:%SZ"))
        return JSONResponse(status_code=200, content={
            "progressed_positions": {k: round(v, 4) for k, v in progressed.items()},
            "progressed_date": p_date_str,
            "upcoming_sign_changes": upcoming,
        })

    # ---- family astrocartography & synergy: multi-member city ranking ------ #
    @app.post("/v1/family-abundance", tags=["astro"])
    def family_abundance(payload: dict, request: Request) -> JSONResponse:
        """Rank cities for a family by combined astrocartographic abundance.

        Body: {
          "members": [
            { "key": "igor", "name": "Игорь",
              "planets": {"Sun": 25.4, ...},          # mode A: precomputed
              "gst_deg": 348.53 },                     # GMST at birth (deg)
            # OR mode B (auto-compute planets + GMST):
            { "key": "yulia", "name": "Юлия",
              "birth_utc": "1989-08-23T13:50:00Z",
              "lat": 50.7889, "lng": 75.6956 }
          ],
          "cities": [ {"name": "...", "lat": 60.25, "lng": 74.8167,
                       "country": "...", "region": "..."} ],
          "limit": 50    # optional, top-N to return (default 50)
        }

        Mode A is preferred when the caller already has planet longitudes
        (e.g. from a natal chart). Mode B recomputes all 11 longitudes via the
        skyfield ephemeris + mean lunar node, and GMST via Meeus.
        """
        from services.astro_engine.domain.abundance import (
            MemberInput, CityInput, PLANETS, compute_family_report)
        members_in = payload.get("members")
        cities_in = payload.get("cities")
        if not members_in or not cities_in:
            return problem(422, "astro/family-abundance-invalid",
                           "Missing data",
                           "Both 'members' (≥1) and 'cities' (≥1) are required.",
                           request.url.path)
        limit = int(payload.get("limit", 50))

        # Resolve each member to {planets, gst_deg}.
        members: list[MemberInput] = []
        for m in members_in:
            key = m.get("key") or m.get("name", "member")
            name = m.get("name", key)
            planets = m.get("planets")
            gst = m.get("gst_deg")
            if planets is None or gst is None:
                # Mode B: compute from birth data.
                utc_str = m.get("birth_utc")
                lat = m.get("lat")
                lng = m.get("lng")
                if not utc_str or lat is None or lng is None:
                    return problem(422, "astro/family-abundance-invalid",
                                   "Incomplete member",
                                   f"Member '{key}' needs either 'planets'+'gst_deg' "
                                   f"or 'birth_utc'+'lat'+'lng'.",
                                   request.url.path)
                try:
                    utc = datetime.fromisoformat(utc_str.replace("Z", "+00:00"))
                except ValueError:
                    return problem(422, "astro/family-abundance-invalid",
                                   "Invalid birth_utc",
                                   f"Member '{key}' birth_utc must be ISO-8601.",
                                   request.url.path)
                from services.astro_engine.domain.chart import (
                    greenwich_sidereal_time_deg)
                gst = greenwich_sidereal_time_deg(utc)
                planets = _family_member_longitudes(utc, float(lat), float(lng))
            planets = _normalize_planets(planets)
            members.append(MemberInput(key=key, name=name,
                                        planets=planets, gst_deg=float(gst)))

        cities = tuple(
            CityInput(
                name=c.get("name", "?"),
                country=c.get("country", ""),
                lat=float(c.get("lat", 0.0)),
                lng=float(c.get("lng", 0.0)),
                region=c.get("region", ""),
            ) for c in cities_in
        )
        report = compute_family_report(tuple(members), cities, top_limit=limit)
        return JSONResponse(status_code=200, content=_family_report_to_dto(report))

    # ---- local space: planetary azimuth/altitude from a birthplace ------- #
    @app.post("/v1/local-space", tags=["astro"])
    def local_space(payload: dict, request: Request) -> JSONResponse:
        """Compute Local Space (azimuth lines) for planets at a birthplace.

        Body: { "planets": {"sun": {"ra": 100.5, "dec": 10.0}, ...},
                "observer_lat": 52.3, "observer_lng": 76.95,
                "lst_deg": 120.0 }
        Returns azimuth + altitude + sector for each planet.
        """
        from services.astro_engine.domain.local_space import compute_local_space
        planets_in = payload.get("planets", {})
        lat = payload.get("observer_lat")
        lng = payload.get("observer_lng")
        lst = payload.get("lst_deg")
        if not planets_in or lat is None or lst is None:
            return problem(422, "astro/local-space-invalid",
                           "Missing data",
                           "Required: planets (with ra/dec), observer_lat, lst_deg.",
                           request.url.path)
        planet_positions = {}
        for name, coords in planets_in.items():
            ra = coords.get("ra")
            dec = coords.get("dec")
            if ra is not None and dec is not None:
                planet_positions[name] = (float(ra), float(dec))
        result = compute_local_space(planet_positions, float(lat),
                                     float(lng or 0), float(lst))
        return JSONResponse(status_code=200, content={
            "observer_lat": result.observer_lat,
            "observer_lng": result.observer_lng,
            "total_above": result.total_above,
            "total_below": result.total_below,
            "planet_lines": [
                {"planet": l.planet, "azimuth_deg": l.azimuth_deg,
                 "altitude_deg": l.altitude_deg, "sector": l.sector,
                 "above_horizon": l.above_horizon}
                for l in result.lines
            ],
        })

    instrument_app(app)
    return app


app = create_app()
