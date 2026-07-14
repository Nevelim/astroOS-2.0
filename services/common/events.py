"""Typed event contracts for the AstroOS event bus (Redis Streams in prod).

These dataclasses define the canonical payloads for every event that flows
between services. The Dev Backlog (BAZI-6, MATCH-10, DAILY-5) names the
streams but never specifies payloads — this module is that specification.

Naming convention (consistent with the backlog):
  stream:  <domain>.<aggregate>     e.g. "bazi.computed", "match.events"
  type:    <domain>.<verb>.<noun>   e.g. "match.made", "match.message.sent"

Every event carries:
  - event_id    : unique, used for idempotent consumption (dedup)
  - occurred_at : UTC ISO timestamp
  - member_id   : the subject (privacy-safe; never raw birth data)
  - a typed payload

Consumers map these to their own concerns (Notification → NotificationEvent,
Remedies → cache warmup) via the bridge in each service's adapter layer.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class EventEnvelope:
    """The wire envelope every event is carried in. Type-tagged."""
    event_id: str                       # unique; consumers dedup on this
    stream: str                         # e.g. "bazi.computed"
    type: str                           # e.g. "match.message.sent"
    occurred_at: str = field(default_factory=_utc_now)
    member_id: str = ""
    payload: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "event_id": self.event_id,
            "stream": self.stream,
            "type": self.type,
            "occurred_at": self.occurred_at,
            "member_id": self.member_id,
            "payload": self.payload,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "EventEnvelope":
        return cls(
            event_id=d["event_id"], stream=d["stream"], type=d["type"],
            occurred_at=d.get("occurred_at", _utc_now()),
            member_id=d.get("member_id", ""),
            payload=d.get("payload", {}),
        )


# --------------------------------------------------------------------------- #
# Stream names (single source of truth — matches Dev Backlog BAZI-6/MATCH-10/DAILY-5)
# --------------------------------------------------------------------------- #
STREAM_BAZI_COMPUTED = "bazi.computed"
STREAM_MATCH_EVENTS = "match.events"
STREAM_DAILY_GENERATED = "daily.generated"


# --------------------------------------------------------------------------- #
# BAZI-6: bazi.computed — published by BaZi Engine, consumed by Remedies (prefetch)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class BaziComputedEvent:
    """Carries the favorable elements so Remedies can warm its cache."""
    member_id: str
    day_master_element: str             # "wood" | "fire" | "earth" | "metal" | "water"
    favorable_elements: tuple[str, ...]
    birth_data_hash: str = ""           # cache key, NOT raw birth data

    def envelope(self) -> EventEnvelope:
        import uuid
        return EventEnvelope(
            event_id=f"evt_bazi_{uuid.uuid4().hex[:16]}",
            stream=STREAM_BAZI_COMPUTED, type="bazi.computed",
            member_id=self.member_id,
            payload={
                "day_master_element": self.day_master_element,
                "favorable_elements": list(self.favorable_elements),
                "birth_data_hash": self.birth_data_hash,
            },
        )


# --------------------------------------------------------------------------- #
# MATCH-10: match.events — published by Cosmic Match, consumed by Notification
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class MatchMadeEvent:
    member_id: str
    partner_profile_id: str             # prf_... — privacy-safe
    composite_score: int

    def envelope(self) -> EventEnvelope:
        import uuid
        return EventEnvelope(
            event_id=f"evt_match_{uuid.uuid4().hex[:16]}",
            stream=STREAM_MATCH_EVENTS, type="match.made",
            member_id=self.member_id,
            payload={"partner_profile_id": self.partner_profile_id,
                     "composite_score": self.composite_score},
        )


@dataclass(frozen=True)
class MatchMessageSentEvent:
    member_id: str                       # the RECIPIENT (notification target)
    sender_profile_id: str
    conversation_id: str
    message_preview: str                # truncated text, privacy-safe

    def envelope(self) -> EventEnvelope:
        import uuid
        return EventEnvelope(
            event_id=f"evt_msg_{uuid.uuid4().hex[:16]}",
            stream=STREAM_MATCH_EVENTS, type="match.message.sent",
            member_id=self.member_id,
            payload={"sender_profile_id": self.sender_profile_id,
                     "conversation_id": self.conversation_id,
                     "message_preview": self.message_preview[:120]},
        )


# --------------------------------------------------------------------------- #
# DAILY-5: daily.generated — published by Daily Content, consumed by Notification
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class DailyGeneratedEvent:
    member_id: str
    sun_sign: str
    ritual_type: str                    # "horoscope" | "affirmation"
    for_date: str                       # ISO date

    def envelope(self) -> EventEnvelope:
        import uuid
        return EventEnvelope(
            event_id=f"evt_daily_{uuid.uuid4().hex[:16]}",
            stream=STREAM_DAILY_GENERATED, type="daily.generated",
            member_id=self.member_id,
            payload={"sun_sign": self.sun_sign,
                     "ritual_type": self.ritual_type,
                     "for_date": self.for_date},
        )
