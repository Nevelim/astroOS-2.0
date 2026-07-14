"""Notification domain: events, types, preferences, tone-gate verdicts.

Pure domain — no DB, no channels, no I/O. Defines the notification taxonomy
(per Dev Backlog NOTIF-4: daily morning, significant transit, streak-risk,
new match/msg, weekly digest, winback, crisis follow-up) and the preference
model (NOTIF-5: per-type opt-in, quiet hours, frequency caps).

The tone-gate (NOTIF-3) is the critical invariant: NO push leaves the service
without passing a calm, opt-in framing check. A notification that reads as
aggressive/spammy/clickbait is downgraded or dropped before any channel
delivery. Pure function — tested exhaustively in unit tests.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timezone
from enum import Enum
from typing import Optional


class NotificationType(str, Enum):
    """The 7 notification types (Dev Backlog NOTIF-4 + crisis follow-up)."""
    DAILY_MORNING = "daily_morning"        # morning horoscope nudge
    SIGNIFICANT_TRANSIT = "transit"        # major transit window
    STREAK_RISK = "streak"                 # WARD ritual streak about to break
    NEW_MATCH = "match"                    # new match / new message
    WEEKLY_DIGEST = "weekly_digest"        # Sunday recap
    WINBACK = "winback"                    # lapsed user re-engagement
    CRISIS_FOLLOWUP = "crisis_followup"    # localized hotline resources, 24h (NOTIF-6)


class Channel(str, Enum):
    """Delivery channels (NOTIF-2). Dev sinks are in-memory stubs."""
    PUSH = "push"        # APNs (iOS) / FCM (Android)
    EMAIL = "email"      # SES
    SMS = "sms"          # Twilio (opt-in only)
    INAPP = "inapp"      # in-app bell / DB row


class ToneVerdict(str, Enum):
    """Result of the tone-gate check (NOTIF-3)."""
    PASS = "pass"            # calm framing, safe to send
    SOFTEN = "soften"        # salvageable — rewrite to calm framing
    BLOCK = "block"          # aggressive/spammy/clickbait — drop


@dataclass(frozen=True)
class NotificationEvent:
    """Inbound event from a producing service (match, daily, mentor...).

    Producers POST this to /v1/notify/events. `payload` carries type-specific
    fields (transit name, match profile_id, streak count, etc.)."""
    member_id: str
    type: NotificationType
    title: str
    body: str
    channels: tuple[Channel, ...] = (Channel.PUSH, Channel.INAPP)
    payload: dict = field(default_factory=dict)
    occurred_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass(frozen=True)
class Preferences:
    """Per-member notification preferences (NOTIF-5). Default = opt-in to
    calm notifications, quiet hours 22:00–07:00 local, no SMS."""
    enabled_types: tuple[NotificationType, ...] = (
        NotificationType.DAILY_MORNING,
        NotificationType.SIGNIFICANT_TRANSIT,
        NotificationType.STREAK_RISK,
        NotificationType.NEW_MATCH,
        NotificationType.CRISIS_FOLLOWUP,
    )
    quiet_hours_start: Optional[time] = time(22, 0)   # local
    quiet_hours_end: Optional[time] = time(7, 0)      # local
    daily_cap: int = 5                                 # max pushes/day
    sms_opt_in: bool = False                           # SMS requires explicit opt-in

    def allows(self, ntype: NotificationType) -> bool:
        """Crisis follow-up is ALWAYS allowed — bypasses opt-out (safety)."""
        if ntype is NotificationType.CRISIS_FOLLOWUP:
            return True
        return ntype in self.enabled_types

    def is_quiet(self, local_time: time) -> bool:
        """True if local_time falls inside quiet hours (wraps midnight).

        Accepts both naive and tz-aware times (compares wall-clock only).
        """
        if self.quiet_hours_start is None or self.quiet_hours_end is None:
            return False
        # Normalize to naive: strip tzinfo so aware/naive comparison is consistent.
        now = local_time.replace(tzinfo=None) if local_time.tzinfo else local_time
        start, end = self.quiet_hours_start, self.quiet_hours_end
        if start <= end:
            return start <= now < end
        # wraps midnight, e.g. 22:00–07:00
        return now >= start or now < end


@dataclass(frozen=True)
class Notification:
    """A persisted/deliverable notification (maps to Prisma Notification row)."""
    id: str
    member_id: str
    type: NotificationType
    title: str
    body: str
    channels: tuple[Channel, ...]
    data: dict
    read_at: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    delivered: bool = False
