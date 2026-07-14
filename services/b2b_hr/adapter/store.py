"""B2B HR adapters: in-memory org store + audit logger.

Implements the Protocol ports from usecase.analyze_team. Production swaps:
  - InMemoryOrgStore → EU-isolated Postgres :5433 (eu-central-1) with RLS per
    company + IAM-forbidden cross-read with B2C (B2B-1).
  - InMemoryAuditLogger → append-only audit table (partitioned) for GDPR Art.9
    evidence + BetrVG §87 notification trail (B2B-6).

The in-memory versions are deterministic and sufficient for dev/test.
"""
from __future__ import annotations

from typing import Optional

from services.b2b_hr.domain.entities import Seat


class InMemoryOrgStore:
    """Port impl: holds orgs + seats in-process."""

    def __init__(self) -> None:
        self._seats: dict[str, Seat] = {}
        self._orgs: dict[str, dict] = {}

    def create_org(self, org_id: str, name: str, seats_limit: int = 10) -> None:
        self._orgs[org_id] = {"name": name, "seats_limit": seats_limit}

    def add_seat(self, seat: Seat) -> None:
        self._seats[seat.seat_id] = seat

    def get_seat(self, seat_id: str) -> Optional[Seat]:
        return self._seats.get(seat_id)

    def seats_for_org(self, org_id: str) -> list[Seat]:
        return [s for s in self._seats.values() if s.org_id == org_id]

    def update_seat(self, seat: Seat) -> None:
        self._seats[seat.seat_id] = seat

    def org_exists(self, org_id: str) -> bool:
        return org_id in self._orgs


class InMemoryAuditLogger:
    """Port impl: append-only audit log (B2B-6 compliance trail)."""

    def __init__(self) -> None:
        self._entries: list[dict] = []

    def log(self, org_id: str, action: str, seat_id: str = "",
            detail: str = "") -> None:
        from datetime import datetime, timezone
        self._entries.append({
            "org_id": org_id, "action": action, "seat_id": seat_id,
            "detail": detail,
            "ts": datetime.now(timezone.utc).isoformat(),
        })

    def entries(self) -> list[dict]:
        return list(self._entries)

    def for_org(self, org_id: str) -> list[dict]:
        return [e for e in self._entries if e["org_id"] == org_id]
