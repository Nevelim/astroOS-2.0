"""HTTP API layer for the Birth-Time Resolution service.

FastAPI app exposing:
  GET  /v1/geo/autocomplete
  GET  /v1/birth-time/resolve
  GET  /healthz   GET  /readyz

Errors are returned as RFC 7807 problem+json. The resolved birth-time
endpoint is immutable and cacheable forever (Cache-Control + ETag).

The app is constructed by a factory `create_app(dependencies)` so that tests
can inject fakes — no module-level globals, no hidden state.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator

from services.birth_time.adapter.solar_time import NoaaSolarProvider
from services.birth_time.adapter.timezone_resolver import (
    TzdataVersion,
    ZoneInfoResolver,
)
from services.birth_time.domain.entities import (
    AmbiguityReason,
    BirthInput,
    TimeQuality,
    shichen_for_tst,
)
from services.birth_time.usecase.resolve_birth_time import ResolveBirthTime
from services.geo.repository import CatalogueGeoRepository, GeoRepository


# --------------------------------------------------------------------------- #
# Composition root — the ONLY place that wires concrete adapters to ports.
# --------------------------------------------------------------------------- #
@dataclass
class Dependencies:
    geo: GeoRepository
    resolver: ResolveBirthTime


def default_dependencies() -> Dependencies:
    return Dependencies(
        geo=CatalogueGeoRepository(),
        resolver=ResolveBirthTime(
            tz_resolver=ZoneInfoResolver(),
            solar=NoaaSolarProvider(),
            tzdata=TzdataVersion(),
        ),
    )


def create_app(deps: Optional[Dependencies] = None) -> FastAPI:
    deps = deps or default_dependencies()
    app = FastAPI(
        title="AstroOS Birth-Time Resolution",
        version="1.0.0",
        docs_url="/docs",
        redoc_url=None,
    )
    app.state.deps = deps

    # ------------------------- error helpers ------------------------------ #
    def problem(status: int, type_slug: str, title: str, detail: str,
                instance: str, **extra) -> JSONResponse:
        payload = {
            "type": f"https://errors.astroos.com/{type_slug}",
            "title": title,
            "status": status,
            "detail": detail,
            "instance": instance,
            **extra,
        }
        return JSONResponse(status_code=status, content=payload,
                            media_type="application/problem+json")

    # ------------------------- DTOs --------------------------------------- #
    class GeoItem(BaseModel):
        place_id: str
        name: str
        country: str
        country_code: str
        admin1: str
        lat: float
        lng: float
        iana_zone: str
        population: int = 0

    class GeoResponse(BaseModel):
        results: list[GeoItem]

    class ResolutionResponse(BaseModel):
        birth_data_hash: str
        input: dict
        resolution: dict
        bazi: dict

    # ------------------------- health ------------------------------------- #
    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        """Liveness probe — process is up."""
        return {"status": "alive"}

    @app.get("/readyz", tags=["meta"])
    def readyz() -> dict:
        """Readiness probe — can resolve (deps wired)."""
        return {"status": "ready"}

    # ------------------------- geo autocomplete --------------------------- #
    @app.get("/v1/geo/autocomplete", tags=["geo"], response_model=GeoResponse)
    def geo_autocomplete(
        q: str = Query(..., min_length=2, max_length=80),
        lang: str = Query("ru", max_length=5),
        limit: int = Query(8, ge=1, le=10),
    ) -> GeoResponse:
        results = deps.geo.autocomplete(q, lang=lang, limit=limit)
        return GeoResponse(results=[
            GeoItem(place_id=r.place_id, name=r.name, country=r.country,
                    country_code=r.country_code, admin1=r.admin1,
                    lat=r.lat, lng=r.lng, iana_zone=r.iana_zone,
                    population=r.population)
            for r in results
        ])

    # ------------------------- birth-time resolve ------------------------- #
    @app.get("/v1/birth-time/resolve", tags=["birth-time"],
             response_model=ResolutionResponse)
    def resolve(
        request: Request,
        response: Response,
        local_date: date = Query(..., description="YYYY-MM-DD, not in future"),
        local_time: str = Query(..., description="HH:MM, wall-clock as seen"),
        place_id: Optional[str] = Query(None),
        lat: Optional[float] = Query(None, ge=-90, le=90),
        lng: Optional[float] = Query(None, ge=-180, le=180),
        iana_zone: Optional[str] = Query(None),
        time_quality: TimeQuality = Query(TimeQuality.EXACT),
    ) -> ResolutionResponse:
        instance = request.url.path

        # Resolve place: either by id OR explicit coords+zone.
        place = _resolve_place(deps, place_id, lat, lng, iana_zone)
        if place is None:
            return problem(404, "place/not-found",
                           "Place not found",
                           "Could not resolve the birthplace. Provide a valid "
                           "place_id or lat+lng+iana_zone.",
                           instance)  # type: ignore[return-value]

        # Parse HH:MM
        try:
            hh, mm = (int(x) for x in local_time.split(":"))
            from datetime import time as _t
            wall = _t(hh, mm)
        except Exception:
            return problem(422, "validation_error",
                           "Invalid time format",
                           f"local_time must be HH:MM, got {local_time!r}.",
                           instance,
                           errors=[{"field": "local_time"}])  # type: ignore[return-value]

        if local_date > date.today():
            return problem(422, "validation_error",
                           "Birth date in the future",
                           f"{local_date} is in the future.",
                           instance,
                           errors=[{"field": "local_date"}])  # type: ignore[return-value]

        try:
            birth = BirthInput(local_date, wall, place, time_quality)
        except ValueError as e:
            return problem(422, "validation_error",
                           "Invalid birth input", str(e), instance)  # type: ignore[return-value]

        resolution = deps.resolver.execute(birth)
        r = resolution.resolution

        # 422 if ambiguous DST — but still 200-friendly: we ACCEPT by default
        # (use the later instant), and surface a warning so the client can
        # ask the user. Switch to hard 422 by uncommenting the block below.
        # if r.ambiguity is not AmbiguityReason.NONE:
        #     return problem(422, f"birth-time/{r.ambiguity.value}",
        #                    "Ambiguous birth time", r.ambiguity_note, instance)

        response.headers["ETag"] = f'"{resolution.birth_data_hash}"'
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

        return ResolutionResponse(
            birth_data_hash=resolution.birth_data_hash,
            input={
                "local_date": local_date.isoformat(),
                "local_time": local_time,
                "place": {
                    "name": place.name, "country": place.country,
                    "lat": place.coordinates.lat, "lng": place.coordinates.lng,
                    "iana_zone": place.iana_zone, "place_id": place.place_id,
                },
                "time_quality": time_quality.value,
            },
            resolution={
                "utc": r.utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "utc_offset_minutes": r.utc_offset_minutes,
                "dst_active": r.dst_active,
                "iana_zone": r.iana_zone,
                "local_mean_time": r.local_mean_time.strftime("%H:%M:%S"),
                "true_solar_time": r.true_solar_time.strftime("%H:%M:%S"),
                "equation_of_time_minutes": round(r.equation_of_time_minutes, 4),
                "longitude_correction_minutes": round(r.longitude_correction_minutes, 2),
                "tzdata_version": r.tzdata_version,
                "ambiguity": r.ambiguity.value,
                "ambiguity_note": r.ambiguity_note,
            },
            bazi={
                "recommended_time_standard": resolution.bazi.recommended_time_standard,
                "shichen": resolution.bazi.shichen.value if resolution.bazi.shichen else None,
                "note": resolution.bazi.note,
            },
        )

    return app


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _resolve_place(deps: Dependencies, place_id: Optional[str],
                   lat: Optional[float], lng: Optional[float],
                   iana_zone: Optional[str]):
    if place_id:
        return deps.geo.by_place_id(place_id)
    if lat is not None and lng is not None and iana_zone:
        from services.birth_time.domain.entities import Coordinates, Place
        return Place(
            name="(coordinates)",
            country="",
            coordinates=Coordinates(lat, lng),
            iana_zone=iana_zone,
            place_id=f"coord:{lat},{lng}",
        )
    return None


# Module-level app for `uvicorn services.birth_time.api.app:app`
app = create_app()
