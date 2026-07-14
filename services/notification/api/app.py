"""HTTP API for Notification service (порт 3008).

Endpoints:
  POST /v1/notify/events         — ingest an event from a producing service
  POST /v1/notify/crisis-followup — emit the 24h crisis follow-up (NOTIF-6)
  GET  /v1/notify/members/:id    — list a member's notifications (dev/debug)
  PUT  /v1/notify/prefs/:id      — set per-member preferences (NOTIF-5)
  GET  /healthz | /readyz        — liveness/readiness

Errors: RFC 7807 problem+json.

Tone-gate invariant (NOTIF-3): the response tells the caller whether the
event passed, was softened, was deferred (quiet hours), or was blocked.
No push leaves this service without passing the calm-framing check.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.notification.adapter.channels import (
    InMemoryChannelSink,
    InMemoryClock,
    InMemoryNotificationStore,
    InMemoryPreferenceProvider,
)
from services.notification.domain.entities import (
    Channel,
    NotificationEvent,
    NotificationType,
    Preferences,
    ToneVerdict,
)
from services.notification.domain.crisis_resources import (
    CRISIS_RESOURCES,
    build_crisis_followup,
)
from services.notification.usecase.process_event import ProcessNotificationEvent


# --------------------------------------------------------------------------- #
# Request DTOs
# --------------------------------------------------------------------------- #
_VALID_TYPES = {t.value for t in NotificationType}
_VALID_CHANNELS = {c.value for c in Channel}


class EventDTO(BaseModel):
    member_id: str = Field(..., examples=["mem_abc"])
    type: str = Field(..., examples=["transit"])
    title: str = Field(..., max_length=120, examples=["Saturn transit window"])
    body: str = Field(..., max_length=2000)
    channels: list[str] = Field(default_factory=lambda: ["push", "inapp"])
    payload: dict = Field(default_factory=dict)

    def to_domain(self) -> NotificationEvent:
        bad = [c for c in self.channels if c not in _VALID_CHANNELS]
        if bad:
            raise ValueError(f"unknown channels: {bad}")
        return NotificationEvent(
            member_id=self.member_id,
            type=NotificationType(self.type),
            title=self.title,
            body=self.body,
            channels=tuple(Channel(c) for c in self.channels),
            payload=self.payload,
        )


class CrisisFollowupDTO(BaseModel):
    member_id: str
    country_code: str = Field("US", min_length=2, max_length=2)
    language: str = Field("en", max_length=5)


class PreferencesDTO(BaseModel):
    enabled_types: list[str] = Field(
        default_factory=lambda: [t.value for t in Preferences().enabled_types])
    quiet_hours_start: Optional[str] = Field(None, examples=["22:00"])
    quiet_hours_end: Optional[str] = Field(None, examples=["07:00"])
    daily_cap: int = Field(5, ge=0, le=50)
    sms_opt_in: bool = False


# --------------------------------------------------------------------------- #
# Dependency wiring
# --------------------------------------------------------------------------- #
@dataclass
class Dependencies:
    store: InMemoryNotificationStore
    sink: InMemoryChannelSink
    prefs: InMemoryPreferenceProvider
    clock: InMemoryClock
    usecase: ProcessNotificationEvent


def default_dependencies() -> Dependencies:
    store = InMemoryNotificationStore()
    sink = InMemoryChannelSink()
    prefs = InMemoryPreferenceProvider()
    clock = InMemoryClock()
    return Dependencies(
        store=store, sink=sink, prefs=prefs, clock=clock,
        usecase=ProcessNotificationEvent(store=store, sink=sink,
                                         prefs=prefs, clock=clock),
    )


def _problem(status: int, slug: str, title: str, detail: str,
             instance: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"type": f"https://errors.astroos.com/{slug}", "title": title,
                 "status": status, "detail": detail, "instance": instance},
        media_type="application/problem+json",
    )


def _parse_time(s: Optional[str]):
    if s is None:
        return None
    h, m = s.split(":")
    from datetime import time as _time
    return _time(int(h), int(m))


# --------------------------------------------------------------------------- #
# App factory
# --------------------------------------------------------------------------- #
def create_app(deps: Optional[Dependencies] = None,
               event_bus=None) -> FastAPI:
    deps = deps or default_dependencies()
    app = FastAPI(title="AstroOS Notification", version="1.0.0",
                  docs_url="/docs", redoc_url=None)
    app.state.deps = deps

    # ---- event-bus consumer wiring (MATCH-10, DAILY-5) -------------------- #
    # When an event bus is injected, subscribe to match.events + daily.generated
    # and bridge inbound events into the notification pipeline.
    if event_bus is not None:
        from services.notification.adapter.event_bridge import EventBusBridge
        bridge = EventBusBridge(event_bus)
        async def _sink(event):
            await deps.usecase.execute(event)
        bridge.wire(_sink)
        app.state.event_bridge = bridge

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        return {"status": "alive"}

    @app.get("/readyz", tags=["meta"])
    def readyz() -> dict:
        return {"status": "ready",
                "tone_gate": "active",
                "crisis_resources": len(CRISIS_RESOURCES),
                "event_bus": "wired" if event_bus is not None else "off"}

    # ---- event ingest ---------------------------------------------------- #
    @app.post("/v1/notify/events", tags=["notify"])
    async def ingest(payload: EventDTO, request: Request) -> JSONResponse:
        try:
            event = payload.to_domain()
        except ValueError as exc:
            return _problem(422, "notify/invalid", "Invalid event",
                            str(exc), request.url.path)
        result = await deps.usecase.execute(event)
        status = 202 if (result.accepted or result.deferred) else 422
        return JSONResponse(status_code=status, content={
            "accepted": result.accepted,
            "deferred": result.deferred,
            "notification_id": result.notification_id,
            "tone_verdict": result.tone_verdict.value,
            "delivered": result.delivered,
            "suppressed_reason": result.suppressed_reason,
            "delivery": result.delivery or {},
        })

    # ---- crisis follow-up (NOTIF-6) -------------------------------------- #
    @app.post("/v1/notify/crisis-followup", tags=["notify"])
    async def crisis_followup(payload: CrisisFollowupDTO,
                              request: Request) -> JSONResponse:
        event = build_crisis_followup(payload.member_id,
                                      payload.country_code, payload.language)
        result = await deps.usecase.execute(event)
        return JSONResponse(status_code=200 if result.delivered else 202,
                            content={
            "delivered": result.delivered,
            "notification_id": result.notification_id,
            "tone_verdict": result.tone_verdict.value,
            "resources": event.payload,
            "suppressed_reason": result.suppressed_reason,
        })

    # ---- preferences (NOTIF-5) ------------------------------------------- #
    @app.put("/v1/notify/prefs/{member_id}", tags=["notify"])
    async def set_prefs(member_id: str, payload: PreferencesDTO,
                        request: Request) -> JSONResponse:
        bad = [t for t in payload.enabled_types if t not in _VALID_TYPES]
        if bad:
            return _problem(422, "notify/invalid", "Invalid preferences",
                            f"unknown types: {bad}", request.url.path)
        prefs = Preferences(
            enabled_types=tuple(NotificationType(t) for t in payload.enabled_types),
            quiet_hours_start=_parse_time(payload.quiet_hours_start),
            quiet_hours_end=_parse_time(payload.quiet_hours_end),
            daily_cap=payload.daily_cap,
            sms_opt_in=payload.sms_opt_in,
        )
        deps.prefs.set_prefs(member_id, prefs)
        return JSONResponse(status_code=200, content={
            "member_id": member_id, "updated": True,
            "quiet_hours": f"{prefs.quiet_hours_start}–{prefs.quiet_hours_end}",
            "daily_cap": prefs.daily_cap,
        })

    # ---- member notifications (dev/debug) -------------------------------- #
    @app.get("/v1/notify/members/{member_id}", tags=["notify"])
    async def list_for_member(member_id: str) -> JSONResponse:
        rows = deps.store.for_member(member_id)
        return JSONResponse(status_code=200, content={
            "member_id": member_id,
            "count": len(rows),
            "notifications": [{
                "id": n.id, "type": n.type.value, "title": n.title,
                "body": n.body, "delivered": n.delivered,
                "channels": [c.value for c in n.channels],
                "created_at": n.created_at,
            } for n in rows],
        })

    return app


from services.common.eventbus import default_bus  # noqa: E402

app = create_app(event_bus=default_bus())
