"""HTTP API for Cosmic Match service (порт 3004).

Endpoints:
  POST /v1/match/profiles              — register a profile in the match pool
  DELETE /v1/match/profiles/{id}       — opt-out: instant removal (privacy)
  POST /v1/match/compute               — 3-layer compatibility between two profiles
  GET  /healthz | /readyz              — liveness/readiness

Errors: RFC 7807 problem+json.
Responses: immutable + ETag on deterministic compute results.

Privacy invariants (enforced + tested):
  - birth_data NEVER appears in any response (profiles carry only natal/bazi
    SUMMARY objects, no dates/coords/hashes).
  - distance is approximate (approx_distance_km), never lat/lng.
  - opt-out is a hard delete from the pool.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Optional

import socketio

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field, field_validator

from services.cosmic_match.adapter.registry import (
    InMemoryMatchCache,
    InMemoryProfileRegistry,
)
from services.cosmic_match.domain.entities import (
    BaZiSummary,
    CompatibilityResult,
    MatchIntent,
    MemberProfile,
    NatalSummary,
)
from services.cosmic_match.usecase.compute_match import (
    ComputeMatch,
    ProfileNotFound,
)


# --------------------------------------------------------------------------- #
# Request DTOs (pydantic) — privacy-safe: only summaries, no birth data
# --------------------------------------------------------------------------- #
class NatalDTO(BaseModel):
    sun_sign: str = Field(..., examples=["aries"])
    moon_sign: str = Field(..., examples=["leo"])
    venus_sign: str = Field(..., examples=["taurus"])
    mars_sign: str = Field(..., examples=["gemini"])
    ascendant_sign: Optional[str] = None


class BaZiDTO(BaseModel):
    day_master_stem: str = Field(..., examples=["jia"])
    day_master_element: str = Field(..., examples=["wood"])
    year_branch: str = Field("zi")
    month_branch: str = Field("chen")
    day_branch: str = Field("zi")


class ProfileDTO(BaseModel):
    """A matching-eligible profile. BIRTH DATA MUST NOT BE SENT HERE."""
    profile_id: str = Field(..., examples=["prf_abc"])
    display_name: str = Field(..., examples=["Аня"])
    age: Optional[int] = Field(None, ge=0, le=150)
    approx_distance_km: Optional[int] = Field(None, ge=0)
    natal: Optional[NatalDTO] = None
    bazi: Optional[BaZiDTO] = None
    intents: list[str] = Field(default_factory=lambda: ["romantic"])

    @field_validator("intents")
    @classmethod
    def _validate_intents(cls, v: list[str]) -> list[str]:
        valid = {i.value for i in MatchIntent}
        bad = [i for i in v if i not in valid]
        if bad:
            raise ValueError(f"unknown intents: {bad}. valid: {sorted(valid)}")
        return v

    def to_domain(self) -> MemberProfile:
        return MemberProfile(
            profile_id=self.profile_id,
            display_name=self.display_name,
            age=self.age,
            approx_distance_km=self.approx_distance_km,
            natal=NatalSummary(
                sun_sign=self.natal.sun_sign, moon_sign=self.natal.moon_sign,
                venus_sign=self.natal.venus_sign, mars_sign=self.natal.mars_sign,
                ascendant_sign=self.natal.ascendant_sign,
            ) if self.natal else None,
            bazi=BaZiSummary(
                day_master_stem=self.bazi.day_master_stem,
                day_master_element=self.bazi.day_master_element,
                year_branch=self.bazi.year_branch,
                month_branch=self.bazi.month_branch,
                day_branch=self.bazi.day_branch,
            ) if self.bazi else None,
            intents=tuple(MatchIntent(i) for i in self.intents),
        )


class ComputeRequest(BaseModel):
    profile_a_id: str
    profile_b_id: str
    intent: str = "romantic"

    @field_validator("intent")
    @classmethod
    def _validate_intent(cls, v: str) -> str:
        valid = {i.value for i in MatchIntent}
        if v not in valid:
            raise ValueError(f"unknown intent '{v}'. valid: {sorted(valid)}")
        return v


# --------------------------------------------------------------------------- #
# Dependency wiring
# --------------------------------------------------------------------------- #
@dataclass
class Dependencies:
    registry: InMemoryProfileRegistry
    cache: InMemoryMatchCache
    usecase: ComputeMatch


def default_dependencies() -> Dependencies:
    registry = InMemoryProfileRegistry()
    cache = InMemoryMatchCache()
    return Dependencies(
        registry=registry,
        cache=cache,
        usecase=ComputeMatch(registry=registry, cache=cache),
    )


def _result_etag(profile_a_id: str, profile_b_id: str) -> str:
    """Stable ETag from the ordered profile-id pair (compat is symmetric)."""
    ordered = "__".join(sorted((profile_a_id, profile_b_id)))
    return '"' + hashlib.sha256(ordered.encode()).hexdigest()[:16] + '"'


def _problem(status: int, slug: str, title: str, detail: str,
             instance: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "type": f"https://errors.astroos.com/{slug}",
            "title": title,
            "status": status,
            "detail": detail,
            "instance": instance,
        },
        media_type="application/problem+json",
    )


def _serialize_result(result: CompatibilityResult) -> dict:
    return {
        "profile_a": result.profile_a,
        "profile_b": result.profile_b,
        "composite_score": result.scores.composite,
        "spheres": {
            "love": result.scores.love,
            "communication": result.scores.communication,
            "values": result.scores.values,
            "lifestyle": result.scores.lifestyle,
            "growth": result.scores.growth,
        },
        "explanation": result.explanation,
        "layers_used": list(result.layers_used),
        "engine": "cosmic-match-v1",
    }


# --------------------------------------------------------------------------- #
# App factory
# --------------------------------------------------------------------------- #
def create_app(deps: Optional[Dependencies] = None,
               event_bus=None) -> FastAPI:
    from services.common.observability import setup_telemetry, instrument_app
    setup_telemetry("astroos-cosmic-match")
    deps = deps or default_dependencies()
    app = FastAPI(title="AstroOS Cosmic Match", version="1.0.0",
                  docs_url="/docs", redoc_url=None)
    app.state.deps = deps
    app.state.event_bus = event_bus

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        return {"status": "alive"}

    @app.get("/readyz", tags=["meta"])
    def readyz() -> dict:
        return {"status": "ready", "pool_size": deps.registry.count(),
                "event_bus": "wired" if event_bus is not None else "off"}

    # ---- event publishing (MATCH-10) ------------------------------------- #
    @app.post("/v1/match/events/emit", tags=["match"])
    async def emit_event(payload: dict, request: Request) -> JSONResponse:
        """Debug endpoint to publish a match event (MATCH-10).
        Production: the realtime layer publishes automatically on match/message."""
        if event_bus is None:
            return JSONResponse(status_code=503, content={
                "error": "event bus not configured"})
        from services.common.events import MatchMadeEvent, MatchMessageSentEvent
        etype = payload.get("type")
        if etype == "match.made":
            ev = MatchMadeEvent(
                member_id=payload["member_id"],
                partner_profile_id=payload["partner_profile_id"],
                composite_score=payload.get("composite_score", 0))
        elif etype == "match.message.sent":
            ev = MatchMessageSentEvent(
                member_id=payload["member_id"],
                sender_profile_id=payload["sender_profile_id"],
                conversation_id=payload.get("conversation_id", ""),
                message_preview=payload.get("message_preview", ""))
        else:
            return JSONResponse(status_code=422, content={
                "error": f"unknown type '{etype}'"})
        await event_bus.publish(ev.envelope())
        return JSONResponse(status_code=202, content={"published": True,
                                                      "type": etype})

    # ---- profile pool management ------------------------------------------ #
    @app.post("/v1/match/profiles", tags=["match"], status_code=201)
    async def register_profile(payload: ProfileDTO, request: Request) -> JSONResponse:
        profile = payload.to_domain()
        deps.registry.put(profile)
        return JSONResponse(status_code=201, content={
            "profile_id": profile.profile_id,
            "display_name": profile.display_name,
            "in_pool": True,
            "pool_size": deps.registry.count(),
        })

    @app.delete("/v1/match/profiles/{profile_id}", tags=["match"])
    async def opt_out(profile_id: str, request: Request) -> JSONResponse:
        # Privacy: instant hard removal from the pool.
        removed = deps.registry.remove(profile_id)
        if not removed:
            return _problem(404, "profile/not-found",
                            "Profile not in pool",
                            f"'{profile_id}' is not registered. Opt-out is a no-op.",
                            request.url.path)
        return JSONResponse(status_code=200, content={
            "profile_id": profile_id,
            "in_pool": False,
            "removed": True,
            "pool_size": deps.registry.count(),
        })

    # ---- compatibility computation ---------------------------------------- #
    @app.post("/v1/match/compute", tags=["match"])
    async def compute(payload: ComputeRequest, request: Request) -> JSONResponse:
        etag = _result_etag(payload.profile_a_id, payload.profile_b_id)
        if etag == request.headers.get("if-none-match"):
            # 304 Not Modified: no body, just the ETag to revalidate against.
            return Response(status_code=304, headers={"ETag": etag})

        try:
            result = await deps.usecase.execute(
                payload.profile_a_id, payload.profile_b_id,
                MatchIntent(payload.intent),
            )
        except ProfileNotFound as exc:
            return _problem(404, "profile/not-found",
                            "Profile not found",
                            f"Profile '{exc.profile_id}' is not in the match pool. "
                            f"Register it via POST /v1/match/profiles first.",
                            request.url.path)
        except ValueError as exc:
            return _problem(422, "match/invalid",
                            "Invalid match request",
                            str(exc), request.url.path)

        body = _serialize_result(result)
        return JSONResponse(
            status_code=200,
            headers={
                "ETag": etag,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
            content=body,
        )

    instrument_app(app)
    return app


# --------------------------------------------------------------------------- #
# ASGI composition: mount Socket.IO realtime server alongside FastAPI.
# Uvicorn loads `app`; Socket.IO handles ws://..., FastAPI handles the REST.
# --------------------------------------------------------------------------- #
def create_asgi_app():
    from services.common.eventbus import default_bus
    from services.cosmic_match.api.realtime import create_socketio
    from services.cosmic_match.adapter.chat_store import InMemoryChatStore
    from services.cosmic_match.usecase.handle_chat import HandleChatMessage

    bus = default_bus()
    fastapi_app = create_app(event_bus=bus)
    chat_store = InMemoryChatStore()
    sio = create_socketio(store=chat_store,
                          usecase=HandleChatMessage(store=chat_store))
    fastapi_app.state.chat_store = chat_store
    return socketio.ASGIApp(sio, other_asgi_app=fastapi_app)


app = create_asgi_app()
