"""HTTP API for Daily Content service (порт 3007).

  GET /v1/daily/:sun_sign?voice=calm&lang=ru&date=2026-07-14
  GET /v1/daily/:sun_sign/affirmation
  GET /healthz   GET /readyz
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date as date_type
from typing import Optional

from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse

from services.daily_content.adapter.generators import (
    InMemoryContentCache,
    TemplateContentGenerator,
)
from services.daily_content.domain.entities import (
    ContentRitualType,
    DailyContentKey,
    SunSign,
    VoiceProfile,
)
from services.daily_content.usecase.generate_daily import GenerateDailyContent


@dataclass
class Dependencies:
    usecase: GenerateDailyContent


def default_dependencies() -> Dependencies:
    return Dependencies(
        usecase=GenerateDailyContent(
            generator=TemplateContentGenerator(),
            cache=InMemoryContentCache(),
        )
    )


def create_app(deps: Optional[Dependencies] = None,
               event_bus=None) -> FastAPI:
    from services.common.observability import setup_telemetry, instrument_app
    setup_telemetry("astroos-daily-content")
    deps = deps or default_dependencies()
    app = FastAPI(title="AstroOS Daily Content", version="1.0.0",
                  docs_url="/docs", redoc_url=None)
    app.state.deps = deps
    app.state.event_bus = event_bus

    def problem(status: int, slug: str, title: str, detail: str,
                instance: str) -> JSONResponse:
        return JSONResponse(status_code=status,
            content={"type": f"https://errors.astroos.com/{slug}",
                     "title": title, "status": status, "detail": detail,
                     "instance": instance},
            media_type="application/problem+json")

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        return {"status": "alive"}

    @app.get("/readyz", tags=["meta"])
    def readyz() -> dict:
        return {"status": "ready"}

    @app.get("/v1/daily/{sun_sign}", tags=["daily"])
    async def get_horoscope(
        sun_sign: SunSign,
        request: Request,
        voice: VoiceProfile = Query(VoiceProfile.CALM),
        lang: str = Query("ru", max_length=5),
        for_date: Optional[date_type] = Query(None, alias="date"),
    ) -> JSONResponse:
        d = for_date or date_type.today()
        key = DailyContentKey(for_date=d, sun_sign=sun_sign, voice=voice, language=lang)
        content = await deps.usecase.execute(key, ContentRitualType.HOROSCOPE)
        return JSONResponse(status_code=200, content={
            "bucket_id": key.bucket_id(),
            "ritual_type": content.ritual_type.value,
            "title": content.title,
            "body": content.body,
            "for_date": d.isoformat(),
            "sun_sign": sun_sign.value,
            "voice": voice.value,
            "language": lang,
            "generated_at": content.generated_at,
            "engine_version": content.engine_version,
        })

    @app.get("/v1/daily/{sun_sign}/affirmation", tags=["daily"])
    async def get_affirmation(
        sun_sign: SunSign,
        request: Request,
        voice: VoiceProfile = Query(VoiceProfile.CALM),
        lang: str = Query("ru", max_length=5),
        for_date: Optional[date_type] = Query(None, alias="date"),
    ) -> JSONResponse:
        d = for_date or date_type.today()
        key = DailyContentKey(for_date=d, sun_sign=sun_sign, voice=voice, language=lang)
        content = await deps.usecase.execute(key, ContentRitualType.AFFIRMATION)
        return JSONResponse(status_code=200, content={
            "bucket_id": key.bucket_id(),
            "ritual_type": content.ritual_type.value,
            "title": content.title,
            "body": content.body,
            "for_date": d.isoformat(),
            "sun_sign": sun_sign.value,
            "voice": voice.value,
            "language": lang,
        })

    # ---- event publishing (DAILY-5: daily.generated → Notification) ------ #
    @app.post("/v1/daily/events/emit", tags=["daily"])
    async def emit_daily_generated(payload: dict, request: Request) -> JSONResponse:
        """Debug endpoint to publish a daily.generated event (DAILY-5).
        Production: emitted by the 02:00 UTC batch job after generation."""
        if event_bus is None:
            return JSONResponse(status_code=503, content={
                "error": "event bus not configured"})
        from services.common.events import DailyGeneratedEvent
        ev = DailyGeneratedEvent(
            member_id=payload["member_id"],
            sun_sign=payload["sun_sign"],
            ritual_type=payload.get("ritual_type", "horoscope"),
            for_date=payload.get("for_date", ""))
        await event_bus.publish(ev.envelope())
        return JSONResponse(status_code=202, content={"published": True,
                                                      "type": "daily.generated"})

    instrument_app(app)
    return app


from services.common.eventbus import default_bus  # noqa: E402

app = create_app(event_bus=default_bus())
