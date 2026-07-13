"""Adapter: real timezone resolution via stdlib zoneinfo + the `tzdata` package.

Implements the TimeZoneResolver port from the use-case layer. This is the
OUTER ring of the clean architecture — the only place that imports zoneinfo.

Handles the two classic DST ambiguities:
  * FOLD — clocks move back, a wall-clock time occurs twice (autumn DST end).
  * GAP  — clocks move forward, a wall-clock time never exists (spring DST start).
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from services.birth_time.domain.entities import AmbiguityReason
from services.birth_time.usecase.resolve_birth_time import ZoneResolution


class ZoneInfoResolver:
    """TimeZoneResolver port implementation backed by stdlib `zoneinfo`.

    The tzdata package MUST be installed to guarantee historical accuracy
    (system tzdata on macOS/Linux may lag or be incomplete for pre-1970).
    """

    def __init__(self) -> None:
        # Force-import tzdata so the embedded IANA database is always used.
        try:  # pragma: no cover - import-time only
            import tzdata  # noqa: F401
        except ImportError as e:  # pragma: no cover
            raise RuntimeError(
                "tzdata package is required for historical DST accuracy. "
                "pip install tzdata"
            ) from e

    def resolve(self, naive_local: datetime, iana_zone: str) -> ZoneResolution:
        zone = ZoneInfo(iana_zone)

        # PEP 495 fold detection (Py3.9-compatible, no .exists() needed):
        # Build fold=0 and fold=1 versions and compare their UTC offsets.
        aware0 = naive_local.replace(fold=0, tzinfo=zone)
        aware1 = naive_local.replace(fold=1, tzinfo=zone)
        off0 = aware0.utcoffset() or timedelta(0)
        off1 = aware1.utcoffset() or timedelta(0)

        if off0 == off1:
            # Either unambiguous, OR a GAP (both folds collapse to one offset).
            # Distinguish: in a gap, the offset at the instant differs from the
            # offset one hour before AND one hour after (the transition jumps
            # over the instant). Probe neighbours to detect the jump.
            ambiguity = self._classify_via_neighbours(naive_local, zone)
            if ambiguity is AmbiguityReason.DST_GAP:
                utc = aware1.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
                note = (
                    f"Wall-clock {naive_local.strftime('%H:%M')} did not exist on "
                    f"{naive_local.date()} in {iana_zone} (clocks moved forward). "
                    f"Assumed the later, post-gap instant."
                )
            else:
                utc = aware0.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
                note = ""
        else:
            # FOLD: two distinct UTC instants for the same wall-clock.
            ambiguity = AmbiguityReason.DST_FOLD
            # Default to fold=1 (the later, post-transition occurrence).
            utc = aware1.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
            note = (
                f"Wall-clock {naive_local.strftime('%H:%M')} occurred twice on "
                f"{naive_local.date()} in {iana_zone} (clocks moved back). "
                f"Assumed the later, post-transition occurrence."
            )

        # Determine the active offset & DST flag from the chosen instant.
        aware_utc = utc.replace(tzinfo=ZoneInfo("UTC"))
        local_at_utc = aware_utc.astimezone(zone)
        offset = local_at_utc.utcoffset() or timedelta(0)
        offset_minutes = int(offset.total_seconds() // 60)
        dst_active = bool(local_at_utc.dst())

        return ZoneResolution(
            utc=utc,
            utc_offset_minutes=offset_minutes,
            dst_active=dst_active,
            ambiguity=ambiguity,
            note=note,
        )

    @staticmethod
    def _classify_via_neighbours(naive_local: datetime, zone: ZoneInfo) -> AmbiguityReason:
        """Distinguish an unambiguous time from a spring-forward GAP.

        Signature of a gap (verified against Europe/London 1989-03-26 02:30):
          - the offset at (t) differs from the offset at (t − 1h)
          - the offset at (t) equals the offset at (t + 1h)
        zoneinfo silently applies the POST-gap offset to the skipped instant,
        which is exactly what we exploit. A normal time has all three offsets
        equal; a fold is handled by the caller (offsets differ between folds).
        """
        from datetime import timedelta as _td
        off_here = (naive_local.replace(tzinfo=zone)).utcoffset() or _td(0)
        off_before = ((naive_local - _td(hours=1)).replace(tzinfo=zone)).utcoffset() or _td(0)
        off_after = ((naive_local + _td(hours=1)).replace(tzinfo=zone)).utcoffset() or _td(0)
        if off_here != off_before and off_here == off_after:
            return AmbiguityReason.DST_GAP
        return AmbiguityReason.NONE


class TzdataVersion:
    """Returns the embedded tzdata package version, e.g. '2026a'."""

    def __init__(self) -> None:
        self._cached: Optional[str] = None

    def version(self) -> str:
        if self._cached is not None:
            return self._cached
        # The tzdata package exposes IANA_VERSION (e.g. "2026c").
        try:
            import tzdata
            v = getattr(tzdata, "IANA_VERSION", None)
            if v:
                self._cached = str(v)
                return self._cached
        except Exception:  # pragma: no cover - environment-dependent
            pass
        self._cached = "unknown"
        return self._cached
