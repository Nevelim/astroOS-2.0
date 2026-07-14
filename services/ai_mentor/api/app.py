"""HTTP API for AI Mentor service (порт 3003).

Endpoints:
  POST /v1/mentor/conversations/{conv_id}/messages  — chat turn (JSON or SSE)
  GET  /healthz | /readyz                            — liveness/readiness

Two response modes:
  • JSON  (default)          → full MentorResponse in one shot.
  • SSE   (Accept: text/event-stream) → token-by-token stream, then `done`.
    Stream format (per AstroOS-API-Integration-Guide, screen "AI-ментор"):
      data: {"type":"token","text":"Saturn "}
      data: {"type":"done","message_id":"msg_...","crisis":"none"}
      data: {"type":"crisis","hotline":{"country":"KZ","number":"150"}}   # crisis

Errors: RFC 7807 problem+json.
Rate limit (Free tier): 3 messages/day → 429 + X-RateLimit-* headers.

Guardrails (ADR SM-03, 4-layer):
  Layer 1: crisis pre-check (regex, domain)   — here, before any LLM call.
  Layer 2: token guardrail (LLM classifier)   — adapter responsibility.
  Layer 3: final forbidden-content filter     — use case, after generation.
  Layer 4: crisis hotline injection           — use case, on crisis path.

Crisis path is SYNCHRONOUS and short-circuits the stream: when the user
message triggers CRISIS, no LLM call happens — a compassionate response +
localized hotline are returned immediately (crisis must never wait on an
LLM round-trip or be subject to cost-control limits).
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, AsyncIterator, Optional

from fastapi import FastAPI, Header, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from services.ai_mentor.adapter.providers import (
    DeterministicLLM,
    InMemoryConversationStore,
    InMemoryResponseCache,
)
from services.ai_mentor.domain.crisis import (
    CRISIS_HOTLINES,
    detect_crisis,
)
from services.ai_mentor.domain.entities import (
    ConversationContext,
    CrisisLevel,
    VoiceProfile,
)
from services.ai_mentor.usecase.chat import MentorChat


# --------------------------------------------------------------------------- #
# Voice alias map: the API guide uses empowerment|reflective|playful|pragmatic,
# the domain uses calm|witty|professional|trauma. Accept BOTH.
# --------------------------------------------------------------------------- #
_VOICE_ALIASES: dict[str, VoiceProfile] = {
    "calm": VoiceProfile.CALM, "empowerment": VoiceProfile.CALM,
    "witty": VoiceProfile.WITTY, "playful": VoiceProfile.WITTY,
    "professional": VoiceProfile.PROFESSIONAL, "pragmatic": VoiceProfile.PROFESSIONAL,
    "trauma": VoiceProfile.TRAUMA, "reflective": VoiceProfile.TRAUMA,
}


class MessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000,
                         examples=["Как мой Saturn return повлияет на карьеру?"])
    voice: str = Field("calm",
                       examples=["calm", "empowerment", "playful", "reflective"])
    idempotency_key: Optional[str] = Field(None, max_length=128)


class ContextDTO(BaseModel):
    """Optional profile context. birth_data_hash is a CACHE KEY only — never
    the raw birth data, and it is never echoed in responses."""
    member_id: str = Field("anon")
    birth_data_hash: str = Field("", examples=["sha256:abc"])
    sun_sign: Optional[str] = None
    day_master: Optional[str] = None


# --------------------------------------------------------------------------- #
# Dependency wiring
# --------------------------------------------------------------------------- #
@dataclass
class Dependencies:
    llm: DeterministicLLM
    store: InMemoryConversationStore
    cache: InMemoryResponseCache
    usecase: MentorChat
    free_daily_limit: int = 3


def default_dependencies() -> Dependencies:
    llm = DeterministicLLM()
    store = InMemoryConversationStore()
    cache = InMemoryResponseCache()
    return Dependencies(
        llm=llm, store=store, cache=cache,
        usecase=MentorChat(llm=llm, store=store, cache=cache),
    )


def _problem(status: int, slug: str, title: str, detail: str,
             instance: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "type": f"https://errors.astroos.com/{slug}",
            "title": title, "status": status, "detail": detail, "instance": instance,
        },
        media_type="application/problem+json",
    )


def _resolve_voice(raw: str) -> VoiceProfile:
    return _VOICE_ALIASES.get(raw.lower(), VoiceProfile.CALM)


# --------------------------------------------------------------------------- #
# App factory
# --------------------------------------------------------------------------- #
def create_app(deps: Optional[Dependencies] = None) -> FastAPI:
    from services.common.observability import setup_telemetry, instrument_app
    setup_telemetry("astroos-ai-mentor")
    deps = deps or default_dependencies()
    app = FastAPI(title="AstroOS AI Mentor", version="1.0.0",
                  docs_url="/docs", redoc_url=None)
    app.state.deps = deps
    app.state.usage: dict[str, int] = {}  # member_id → messages used today

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        return {"status": "alive"}

    @app.get("/readyz", tags=["meta"])
    def readyz() -> dict:
        return {"status": "ready", "engine": "deterministic-llm",
                "hotlines_loaded": len(CRISIS_HOTLINES)}

    @app.post("/v1/mentor/conversations/{conversation_id}/messages", tags=["mentor"])
    async def send_message(
        conversation_id: str,
        payload: MessageRequest,
        request: Request,
        x_member_id: Optional[str] = Header(default="anon",
                                            alias="X-Member-Id"),
        x_messages_used: Optional[int] = Header(default=None,
                                                alias="X-Messages-Used"),
        accept: Optional[str] = Header(default=None),
    ):
        member_id = x_member_id or "anon"
        # Rate limit check (Free tier). BFF can override via X-Messages-Used
        # to reflect server-side counters; otherwise we use the in-process one.
        used = x_messages_used if x_messages_used is not None \
            else app.state.usage.get(member_id, 0)
        limit = deps.free_daily_limit

        voice = _resolve_voice(payload.voice)
        # Crisis pre-check MUST happen BEFORE the rate-limit gate: a user in
        # crisis must always receive the hotline, even if they've exhausted
        # their free messages. Cost-control never blocks safety.
        crisis = detect_crisis(payload.content)

        if crisis is not CrisisLevel.CRISIS and used >= limit:
            return JSONResponse(
                status_code=429,
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": "86400",
                },
                content={
                    "type": "https://errors.astroos.com/rate-limit/exceeded",
                    "title": "Daily message limit reached",
                    "status": 429,
                    "detail": f"Free tier allows {limit} messages/day. "
                              f"Upgrade for unlimited mentor access.",
                    "instance": request.url.path,
                },
                media_type="application/problem+json",
            )

        context = ConversationContext(
            member_id=member_id,
            birth_data_hash=payload.idempotency_key or "",
        )
        country_code = _country_from_member(member_id)
        want_sse = accept is not None and "text/event-stream" in accept

        if want_sse:
            return StreamingResponse(
                _stream_turn(deps, conversation_id, context, payload.content,
                             voice, country_code, member_id, app),
                media_type="text/event-stream",
                headers={"Cache-Control": "no-cache",
                         "X-Accel-Buffering": "no"},
            )

        # Synchronous JSON path
        result = await deps.usecase.execute(
            conversation_id, context, payload.content, voice, country_code, used,
        )
        app.state.usage[member_id] = used + 1
        return JSONResponse(status_code=200, content=_serialize(result, limit, used))

    instrument_app(app)
    return app


def _country_from_member(member_id: str) -> str:
    """Heuristic: if member_id encodes a country suffix (anon:KZ), use it.
    Production reads from the member profile (BFF passes X-Country-Code)."""
    if ":" in member_id:
        suffix = member_id.rsplit(":", 1)[1]
        if len(suffix) == 2 and suffix.isalpha():
            return suffix.upper()
    return "US"


def _serialize(result, limit: int, used: int) -> dict:
    body = {
        "content": result.content,
        "voice": result.voice.value,
        "crisis": result.crisis.value,
        "cached": result.cached,
        "tokens_used": result.tokens_used,
        "rate_limit": {"limit": limit, "remaining": max(0, limit - used - 1)},
    }
    if result.crisis_hotline:
        body["hotline"] = result.crisis_hotline
    return body


async def _stream_turn(deps, conversation_id, context, content, voice,
                       country_code, member_id, app) -> AsyncIterator[str]:
    """Generator yielding SSE events for one mentor turn."""
    result = await deps.usecase.execute(
        conversation_id, context, content, voice, country_code,
        app.state.usage.get(member_id, 0),
    )

    # Crisis short-circuit: emit the crisis event + compassionate message,
    # then done. No token-by-token streaming of crisis content.
    if result.crisis is CrisisLevel.CRISIS:
        yield _sse({"type": "crisis", "hotline": {
            "country": country_code, "number": result.crisis_hotline or ""}})
        for word in result.content.split():
            yield _sse({"type": "token", "text": word + " "})
        yield _sse({"type": "done", "message_id": f"msg_{abs(hash(content)) % 10**12}",
                    "crisis": "crisis"})
        return

    # Normal token stream
    for word in result.content.split():
        yield _sse({"type": "token", "text": word + " "})
    yield _sse({"type": "done", "message_id": f"msg_{abs(hash(content)) % 10**12}",
                "crisis": result.crisis.value})
    app.state.usage[member_id] = app.state.usage.get(member_id, 0) + 1


def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


app = create_app()
