"""Use cases: application layer.

Pure orchestration of domain logic. Ports (abstract interfaces) are defined
HERE, in the application layer — outer adapters implement them. This is the
dependency-inversion rule: high-level policy does not depend on low-level
details; both depend on abstractions owned by the high level.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import Optional, Protocol

from services.birth_time.domain.entities import (
    AmbiguityReason,
    BaZiHint,
    BirthInput,
    BirthResolution,
    ResolvedTime,
    Shichen,
    shichen_for_tst,
)


# --------------------------------------------------------------------------- #
# Ports — implemented by adapters in the outer ring
# --------------------------------------------------------------------------- #
class TimeZoneResolver(Protocol):
    """Resolves a naive local datetime in an IANA zone into an aware UTC
    instant, reporting DST status and detecting fold/gap ambiguity."""

    def resolve(self, naive_local: datetime, iana_zone: str) -> "ZoneResolution":
        ...  # pragma: no cover


class SolarTimeProvider(Protocol):
    """Returns the Equation of Time (minutes) for a given UTC instant.

    EoT = apparent solar time − mean solar time. Range ≈ −14..+16 minutes.
    Implemented by NOAA/Spencer formula in the adapter layer."""

    def equation_of_time_minutes(self, utc: datetime) -> float:
        ...  # pragma: no cover


class TzdataVersionProvider(Protocol):
    """Returns the embedded tzdata version string (e.g. '2026a')."""

    def version(self) -> str:
        ...  # pragma: no cover


# --------------------------------------------------------------------------- #
# Port result type
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class ZoneResolution:
    """Outcome of attaching an IANA zone to a naive local wall-clock time."""

    utc: datetime
    utc_offset_minutes: int
    dst_active: bool
    ambiguity: AmbiguityReason
    note: str = ""


# --------------------------------------------------------------------------- #
# Helpers (pure, tested)
# --------------------------------------------------------------------------- #
def _birth_data_hash(birth: BirthInput, tzdata_version: str, eot: float) -> str:
    """Deterministic identity for a resolved birth.

    Folds together the wall-clock input, place coordinates, IANA zone, the
    tzdata version that resolved the offset, and the EoT used — everything
    that can change the output. Two equal inputs ⇒ equal hash ⇒ same cache
    entry, same ETag.
    """
    payload = {
        "d": birth.local_date.isoformat(),
        "t": birth.local_time.strftime("%H:%M:%S"),
        "lat": round(birth.place.coordinates.lat, 6),
        "lng": round(birth.place.coordinates.lng, 6),
        "tz": birth.place.iana_zone,
        "q": birth.time_quality.value,
        "tzdata": tzdata_version,
        "eot": round(eot, 4),
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def _add_seconds_to_time(t: time, seconds: float) -> time:
    """Add a (possibly negative, possibly >24h) number of seconds to a time.

    Used to compute LMT and TST from a UTC instant. Wraps modulo a day.
    """
    base = datetime(2000, 1, 1, t.hour, t.minute, t.second, t.microsecond)
    shifted = base + timedelta(seconds=seconds)
    return shifted.time()


# --------------------------------------------------------------------------- #
# The use case
# --------------------------------------------------------------------------- #
@dataclass
class ResolveBirthTime:
    """Resolve a user-reported birth into UTC / LMT / TST + BaZi shichen.

    Orchestrates the timezone port (offset + DST + ambiguity), the solar-time
    port (EoT) and pure domain math. Returns an immutable BirthResolution.
    """

    tz_resolver: TimeZoneResolver
    solar: SolarTimeProvider
    tzdata: TzdataVersionProvider

    # ---- public API ------------------------------------------------------- #
    def execute(self, birth: BirthInput) -> BirthResolution:
        tz_version = self.tzdata.version()
        naive = birth.naive_local()

        # 1) wall-clock → UTC, detecting DST fold/gap
        zr = self.tz_resolver.resolve(naive, birth.place.iana_zone)
        if zr.ambiguity is not AmbiguityReason.NONE:
            # We still compute everything downstream, but flag it. Callers
            # (API layer) may reject ambiguous inputs with 422 per spec.
            pass

        # 2) EoT (depends only on the date/UTC instant — independent of zone)
        eot = self.solar.equation_of_time_minutes(zr.utc)

        # 3) LMT = UTC + longitude correction
        lng_offset_sec = birth.place.coordinates.longitude_offset_seconds()
        lmt_time = _add_seconds_to_time(zr.utc.time(), lng_offset_sec)

        # 4) TST = LMT + EoT (in seconds). EoT negative ⇒ TST before LMT.
        tst_time = _add_seconds_to_time(lmt_time, eot * 60.0)

        resolved = ResolvedTime(
            utc=zr.utc,
            utc_offset_minutes=zr.utc_offset_minutes,
            dst_active=zr.dst_active,
            iana_zone=birth.place.iana_zone,
            local_mean_time=lmt_time,
            true_solar_time=tst_time,
            equation_of_time_minutes=eot,
            longitude_correction_minutes=lng_offset_sec / 60.0,
            tzdata_version=tz_version,
            ambiguity=zr.ambiguity,
            ambiguity_note=zr.note,
        )

        # 5) BaZi shichen derived from TST (advisory)
        sch = shichen_for_tst(tst_time)
        note = self._bazi_note(birth, tst_time, sch)
        bazi = BaZiHint(
            recommended_time_standard="true_solar_time",
            shichen=sch,
            note=note,
        )

        h = _birth_data_hash(birth, tz_version, eot)
        return BirthResolution(
            birth_data_hash=h,
            input_summary=self._summary(birth),
            resolution=resolved,
            bazi=bazi,
        )

    # ---- private ---------------------------------------------------------- #
    @staticmethod
    def _summary(birth: BirthInput) -> str:
        return (
            f"{birth.local_date.isoformat()} "
            f"{birth.local_time.strftime('%H:%M')} "
            f"at {birth.place.name} ({birth.place.iana_zone})"
        )

    @staticmethod
    def _bazi_note(birth: BirthInput, tst: time, sch: Optional[Shichen]) -> str:
        """Warn when naive clock time would fall in a different shichen.

        This is the most consequential pitfall: e.g. Pavlodar 1989-04-15
        clock 16:40 → TST 14:47, so the hour pillar is WEI not SHEN.
        """
        if sch is None:
            return ""
        naive_sch = shichen_for_tst(birth.local_time)
        if naive_sch == sch:
            return f"TST places birth in {sch.value} hour."
        return (
            f"TST places birth in {sch.value} hour; "
            f"naive clock time would imply {naive_sch.value}."
        )
