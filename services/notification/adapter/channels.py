"""Notification adapters: in-memory store, channel sink, preferences, clock.

The adapter layer is the OUTER ring — it implements the Protocol ports
declared in `usecase.process_event`. Production swaps these for:
  - InMemoryNotificationStore → Postgres `notification` table (partitioned,
    per NOTIF-1 "partitioned notification_logs" + pg_partman).
  - InMemoryChannelSink      → real APNs/FCM/SES/Twilio clients (NOTIF-2),
    with delivery tracking (target: >99%).
  - InMemoryClock            → server wall clock with per-member IANA zone.

The in-memory versions here are deterministic and sufficient for dev/test.
They also serve the integration tests for the tone-gate + preference + quiet-
hours pipeline without external services.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timezone
from typing import Optional

from services.notification.domain.entities import (
    Channel,
    Notification,
    Preferences,
)


# --------------------------------------------------------------------------- #
# In-memory notification store
# --------------------------------------------------------------------------- #
class InMemoryNotificationStore:
    """Port impl: holds notifications; count_today() respects daily cap."""

    def __init__(self) -> None:
        self._rows: list[Notification] = []

    async def append(self, notification: Notification) -> None:
        self._rows.append(notification)

    async def count_today(self, member_id: str) -> int:
        today = datetime.now(timezone.utc).date()
        return sum(
            1 for n in self._rows
            if n.member_id == member_id
            and n.created_at[:10] == today.isoformat()
        )

    def for_member(self, member_id: str) -> list[Notification]:
        return [n for n in self._rows if n.member_id == member_id]

    def all(self) -> list[Notification]:
        return list(self._rows)


# --------------------------------------------------------------------------- #
# In-memory channel sink (dev). Prod: APNs/FCM/SES/Twilio.
# --------------------------------------------------------------------------- #
class InMemoryChannelSink:
    """Port impl: fans out to channels, returns fake delivery IDs.

    Records each delivery so tests can assert which channels were hit.
    Production replaces deliver() with real provider calls + tracking.
    """

    def __init__(self) -> None:
        self.deliveries: list[tuple[str, Channel, str]] = []  # ntf_id, ch, deliv_id

    async def deliver(self, notification: Notification) -> dict[str, str]:
        result: dict[str, str] = {}
        for ch in notification.channels:
            delivery_id = f"dlv_{uuid.uuid4().hex[:12]}"
            result[ch.value] = delivery_id
            self.deliveries.append((notification.id, ch, delivery_id))
        return result


# --------------------------------------------------------------------------- #
# Preference provider (dev defaults; prod reads member prefs from DB)
# --------------------------------------------------------------------------- #
class InMemoryPreferenceProvider:
    """Port impl: defaults unless overridden per member via set_prefs()."""

    def __init__(self) -> None:
        self._overrides: dict[str, Preferences] = {}

    def set_prefs(self, member_id: str, prefs: Preferences) -> None:
        self._overrides[member_id] = prefs

    def for_member(self, member_id: str) -> Preferences:
        return self._overrides.get(member_id, Preferences())


# --------------------------------------------------------------------------- #
# Clock (dev). Prod: wall clock with per-member IANA timezone.
# --------------------------------------------------------------------------- #
class InMemoryClock:
    """Port impl: injectable time for deterministic tests.

    `fixed_local` lets a test pin the member's local time (e.g. 23:00 to
    trigger quiet hours) without touching the system clock.
    """

    def __init__(self, fixed_utc: Optional[datetime] = None,
                 fixed_local: Optional[time] = None) -> None:
        self._utc = fixed_utc
        self._local = fixed_local

    def utc_now(self) -> datetime:
        return self._utc or datetime.now(timezone.utc)

    def local_time(self, member_id: str) -> time:
        return self._local or self.utc_now().astimezone().timetz()
