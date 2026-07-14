"""HTTP API for Remedies service (порт 3005).

Endpoints:
  GET /v1/remedies/recommendations?day_master=wood&lang=en
  GET /healthz | /readyz

Response matches AstroOS-API-Integration-Guide (screen Remedies):
  {
    "items": [
      {
        "element": "water", "type": "stone", "name": "Aquamarine",
        "reasoning": "...", "marketplace_results": [
          {"shop":"...","price_local":45,"currency":"USD","rating":4.8,"affiliate":true}
        ]
      }
    ]
  }

Caching: 24h (per the guide). ETag derived from the Day Master element; the
response carries Cache-Control immutable so the BFF/CDN can cache it. On a
matching If-None-Match we return 304.

Errors: RFC 7807 problem+json.

Ethics (REMED-4): marketplace_results are sorted by rating, NOT by affiliate.
This is guaranteed by the domain sort_by_rating and proven by integration
tests — an affiliate link never ranks above a higher-rated non-affiliate.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Optional

from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from services.remedies.adapter.marketplace import (
    InMemoryMarketplaceSearch,
    InMemoryRemedyCache,
    WHITELIST_MIN_RATING,
)
from services.remedies.domain.entities import (
    Element,
    RecommendationRequest,
    Remedy,
)
from services.remedies.usecase.recommend import RecommendRemedies


_VALID_ELEMENTS = {e.value for e in Element}


class PreferencesDTO(BaseModel):
    """Optional explicit favorable-elements override (when BAZI-6 computed them)."""
    favorable_elements: list[str] = Field(default_factory=list)


def _serialize(remedy: Remedy) -> dict:
    return {
        "element": remedy.element.value,
        "type": remedy.type.value,
        "name": remedy.name,
        "reasoning": remedy.reasoning,
        "marketplace_results": [
            {
                "shop": l.shop,
                "price_local": l.price_local,
                "currency": l.currency,
                "rating": l.rating,
                "affiliate": l.affiliate,
            }
            for l in remedy.listings
        ],
    }


# --------------------------------------------------------------------------- #
# Dependency wiring
# --------------------------------------------------------------------------- #
@dataclass
class Dependencies:
    search: InMemoryMarketplaceSearch
    cache: InMemoryRemedyCache
    usecase: RecommendRemedies


def default_dependencies() -> Dependencies:
    search = InMemoryMarketplaceSearch()
    cache = InMemoryRemedyCache()
    return Dependencies(
        search=search, cache=cache,
        usecase=RecommendRemedies(marketplace=search, cache=cache),
    )


def _problem(status: int, slug: str, title: str, detail: str,
             instance: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"type": f"https://errors.astroos.com/{slug}", "title": title,
                 "status": status, "detail": detail, "instance": instance},
        media_type="application/problem+json",
    )


def _etag(day_master: str, lang: str) -> str:
    return '"' + hashlib.sha256(f"{day_master}:{lang}".encode()).hexdigest()[:16] + '"'


# --------------------------------------------------------------------------- #
# App factory
# --------------------------------------------------------------------------- #
def create_app(deps: Optional[Dependencies] = None,
               event_bus=None) -> FastAPI:
    deps = deps or default_dependencies()
    app = FastAPI(title="AstroOS Remedies", version="1.0.0",
                  docs_url="/docs", redoc_url=None)
    app.state.deps = deps

    # ---- event-bus consumer wiring (BAZI-6 prefetch, REMED-2) ------------- #
    if event_bus is not None:
        from services.remedies.adapter.event_bridge import RemediesEventBridge
        bridge = RemediesEventBridge(event_bus, deps.usecase)
        bridge.wire()
        app.state.event_bridge = bridge

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        return {"status": "alive"}

    @app.get("/readyz", tags=["meta"])
    def readyz() -> dict:
        return {"status": "ready",
                "whitelist_min_rating": WHITELIST_MIN_RATING,
                "cache_ttl_h": 24}

    @app.get("/v1/remedies/recommendations", tags=["remedies"])
    async def recommendations(
        request: Request,
        day_master: str = Query(..., examples=["wood"]),
        lang: str = Query("en", max_length=5),
        favorable: Optional[str] = Query(
            None, description="Comma-separated explicit favorable elements"),
    ) -> JSONResponse:
        if day_master not in _VALID_ELEMENTS:
            return _problem(422, "remedies/invalid", "Invalid day master",
                            f"'{day_master}' is not a valid element. "
                            f"Valid: {sorted(_VALID_ELEMENTS)}", request.url.path)

        etag = _etag(day_master, lang)
        if etag == request.headers.get("if-none-match"):
            return Response(status_code=304, headers={"ETag": etag})

        favorables: tuple[Element, ...] = ()
        if favorable:
            parts = [p.strip() for p in favorable.split(",") if p.strip()]
            bad = [p for p in parts if p not in _VALID_ELEMENTS]
            if bad:
                return _problem(422, "remedies/invalid",
                                "Invalid favorable elements",
                                f"unknown: {bad}. valid: {sorted(_VALID_ELEMENTS)}",
                                request.url.path)
            favorables = tuple(Element(p) for p in parts)

        result = await deps.usecase.execute(RecommendationRequest(
            day_master_element=Element(day_master),
            favorable_elements=favorables,
            lang=lang,
        ))
        return JSONResponse(
            status_code=200,
            headers={"ETag": etag,
                     "Cache-Control": "public, max-age=86400, immutable"},
            content={"items": [_serialize(r) for r in result]},
        )

    return app


from services.common.eventbus import default_bus  # noqa: E402

app = create_app(event_bus=default_bus())
