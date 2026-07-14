"""Notification use case: process an inbound event through the full pipeline.

Clean Architecture: depends ONLY on the domain layer (tone_gate, entities)
and on Protocol ports declared here (NotificationStore, ChannelSink,
PreferenceProvider, Clock). The adapter layer implements them.

Pipeline (per Architecture ADR + Dev Backlog NOTIF-1..6):
  1. Preference resolution  — opt-out? SMS opt-in? (NOTIF-5)
  2. Tone-gate              — calm-framing invariant (NOTIF-3)
  3. Quiet-hours check      — defer non-crisis to end of quiet window
  4. Frequency cap          — daily_cap suppresses floods (NOTIF-5)
  5. Persist + dispatch     — store row + fan out to channels (NOTIF-2)
  6. Crisis follow-up       — localized resources, always delivered (NOTIF-6)

Crisis follow-up bypasses steps 3 & 4 (quiet hours + cap): safety overrides
convenience. It can still be tone-checked (softened), never blocked.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, time, timezone
from typing import Optional, Protocol

from services.notification.domain.entities import (
    Channel,
    Notification,
    NotificationEvent,
    NotificationType,
    Preferences,
    ToneVerdict,
)
from services.notification.domain.tone_gate import check_tone, soften


# --------------------------------------------------------------------------- #
# Ports
# --------------------------------------------------------------------------- #
class NotificationStore(Protocol):
    """Port: persists notifications (maps to Prisma Notification row)."""

    async def append(self, notification: Notification) -> None:
        ...  # pragma: no cover

    async def count_today(self, member_id: str) -> int:
        ...  # pragma: no cover


class ChannelSink(Protocol):
    """Port: fan-out to delivery channels (APNs/FCM/SES/Twilio). Dev = memory."""

    async def deliver(self, notification: Notification) -> dict[str, str]:
        """Returns {channel: delivery_id} per channel."""
        ...  # pragma: no cover


class PreferenceProvider(Protocol):
    """Port: resolves per-member preferences. Dev = defaults; prod = DB."""

    def for_member(self, member_id: str) -> Preferences:
        ...  # pragma: no cover


class Clock(Protocol):
    """Port: injectable time for deterministic tests."""

    def utc_now(self) -> datetime: ...  # pragma: no cover
    def local_time(self, member_id: str) -> time: ...  # pragma: no cover


# --------------------------------------------------------------------------- #
# Result
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class ProcessingResult:
    """Outcome of processing one event. Returned to the API caller."""
    accepted: bool
    notification_id: Optional[str]
    tone_verdict: ToneVerdict
    delivered: bool
    deferred: bool                      # quiet-hours deferral
    suppressed_reason: Optional[str] = None  # why it was dropped
    delivery: dict = None               # {channel: delivery_id}

    @classmethod
    def suppressed(cls, reason: str, tone: ToneVerdict = ToneVerdict.BLOCK
                   ) -> "ProcessingResult":
        return cls(accepted=False, notification_id=None, tone_verdict=tone,
                   delivered=False, deferred=False, suppressed_reason=reason)


# --------------------------------------------------------------------------- #
# Use case
# --------------------------------------------------------------------------- #
@dataclass
class ProcessNotificationEvent:
    store: NotificationStore
    sink: ChannelSink
    prefs: PreferenceProvider
    clock: Clock

    async def execute(self, event: NotificationEvent) -> ProcessingResult:
        prefs = self.prefs.for_member(event.member_id)

        # 1. Preference resolution (opt-out). Crisis always allowed.
        if not prefs.allows(event.type):
            return ProcessingResult.suppressed(
                f"opt-out: type '{event.type.value}' disabled", ToneVerdict.PASS)

        # SMS requires explicit opt-in (NOTIF-5)
        channels = event.channels
        if Channel.SMS in channels and not prefs.sms_opt_in:
            channels = tuple(c for c in channels if c is not Channel.SMS)

        # 2. Tone-gate (NOTIF-3)
        verdict = check_tone(event.title, event.body, event.type)
        if verdict is ToneVerdict.BLOCK:
            return ProcessingResult.suppressed(
                "tone-gate: aggressive/spammy framing blocked", verdict)
        title, body = (event.title, event.body)
        if verdict is ToneVerdict.SOFTEN:
            title, body = soften(event.title, event.body)

        # 3 + 4. Quiet hours + daily cap — crisis bypasses both (safety)
        is_crisis = event.type is NotificationType.CRISIS_FOLLOWUP
        deferred = False
        if not is_crisis:
            if prefs.is_quiet(self.clock.local_time(event.member_id)):
                return ProcessingResult(
                    accepted=False, notification_id=None,
                    tone_verdict=verdict, delivered=False, deferred=True,
                    suppressed_reason="deferred: quiet hours")
            if await self.store.count_today(event.member_id) >= prefs.daily_cap:
                return ProcessingResult.suppressed(
                    f"frequency cap: {prefs.daily_cap}/day reached", verdict)

        # 5. Persist + dispatch
        notification = Notification(
            id=f"ntf_{uuid.uuid4().hex[:16]}",
            member_id=event.member_id,
            type=event.type,
            title=title,
            body=body,
            channels=channels,
            data=event.payload,
        )
        await self.store.append(notification)
        delivery = await self.sink.deliver(notification)
        notification = Notification(
            id=notification.id, member_id=notification.member_id,
            type=notification.type, title=notification.title, body=notification.body,
            channels=notification.channels, data=notification.data,
            read_at=notification.read_at, created_at=notification.created_at,
            delivered=True,
        )

        return ProcessingResult(
            accepted=True, notification_id=notification.id,
            tone_verdict=verdict, delivered=True, deferred=False,
            delivery=delivery,
        )
