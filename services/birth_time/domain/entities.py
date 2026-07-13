"""Domain entities for Birth-Time Resolution.

This module contains PURE domain types with NO external dependencies.
Nothing here imports DB/HTTP/ORM/logging — it is the innermost ring of the
clean architecture. The dependency rule: dependencies point inward.

All time-math value objects are immutable and validated in their constructors.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from enum import Enum
from typing import Optional


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #
class TimeQuality(str, Enum):
    """How reliable the wall-clock birth time is. Drives BaZi depth."""

    EXACT = "exact"          # precise clock time → full houses + hour pillar
    APPROX = "approx"        # morning/day/evening bucket → Whole Sign range
    UNKNOWN = "unknown"      # no time at all → Whole Sign, no hour pillar


class Shichen(str, Enum):
    """The twelve traditional two-hour solar periods of BaZi (时辰).

    Boundaries are in TRUE SOLAR TIME (the sun, not the clock). Hour pillar
    depends on TST, which is why clock-time → TST conversion is load-bearing.
    """

    ZI = "zi"        # 子  23:00–01:00
    CHOU = "chou"    # 丑  01:00–03:00
    YIN = "yin"      # 寅  03:00–05:00
    MAO = "mao"      # 卯  05:00–07:00
    CHEN = "chen"    # 辰  07:00–09:00
    SI = "si"        # 巳  09:00–11:00
    WU = "wu"        # 午  11:00–13:00
    WEI = "wei"      # 未  13:00–15:00
    SHEN = "shen"    # 申  15:00–17:00
    YOU = "you"      # 酉  17:00–19:00
    XU = "xu"        # 戌  19:00–21:00
    HAI = "hai"      # 亥  21:00–23:00


class AmbiguityReason(str, Enum):
    """Why a local wall-clock time cannot be uniquely resolved."""

    NONE = "none"
    DST_FOLD = "dst_fold"   # clocks moved back → time occurred twice
    DST_GAP = "dst_gap"     # clocks moved forward → time never existed


# --------------------------------------------------------------------------- #
# Core value objects
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Coordinates:
    """A point on Earth. Lat/lng in decimal degrees."""

    lat: float
    lng: float

    def __post_init__(self) -> None:
        if not (-90.0 <= self.lat <= 90.0):
            raise ValueError(f"latitude out of range: {self.lat}")
        if not (-180.0 <= self.lng <= 180.0):
            raise ValueError(f"longitude out of range: {self.lng}")

    def longitude_offset_seconds(self) -> float:
        """Local Mean Time offset from UTC, in seconds.

        LMT = UTC + longitude/15h. 1° of longitude = 4 minutes = 240 seconds.
        Positive east of Greenwich (consistent with sign convention).
        """
        return (self.lng / 15.0) * 3600.0


@dataclass(frozen=True)
class Place:
    """A named geographic location with an IANA timezone.

    The iana_zone is CRITICAL: it is the only way to resolve historical
    DST rules (Soviet-era offsets changed frequently). Pure lat/lng is
    insufficient.
    """

    name: str
    country: str
    coordinates: Coordinates
    iana_zone: str
    place_id: str = ""

    def __post_init__(self) -> None:
        if not self.name:
            raise ValueError("place name is required")
        if not self.iana_zone:
            raise ValueError("iana_zone is required (cannot resolve DST without it)")


@dataclass(frozen=True)
class BirthInput:
    """What the user reports: a wall-clock time AS THEY SAW IT at a place.

    local_time is a NAIVE datetime (no tzinfo) — it is the clock reading on
    the wall at the hospital. The use-case layer attaches the zone and
    disambiguates DST.
    """

    local_date: date
    local_time: time
    place: Place
    time_quality: TimeQuality = TimeQuality.EXACT

    def __post_init__(self) -> None:
        if self.local_time is None:
            raise ValueError("local_time is required (use 00:00 if unknown minute)")
        # Future birth dates are nonsensical
        if self.local_date > date.today():
            raise ValueError(f"birth date in the future: {self.local_date}")

    def naive_local(self) -> datetime:
        """Combine date + time into a naive (tz-unaware) datetime."""
        return datetime.combine(self.local_date, self.local_time)


# --------------------------------------------------------------------------- #
# Resolved result
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class ResolvedTime:
    """The complete decomposition of a birth instant.

    Returns UTC, LMT and TST plus all provenance fields so downstream
    consumers (BaZi Engine, audit log, the UI) never need to recompute and
    can choose which standard to follow. Immutable & hashable for caching.
    """

    utc: datetime
    utc_offset_minutes: int          # signed offset that was active locally
    dst_active: bool
    iana_zone: str

    local_mean_time: time            # LMT as wall-clock at the meridian
    true_solar_time: time            # TST — the BaZi input
    equation_of_time_minutes: float
    longitude_correction_minutes: float
    tzdata_version: str

    ambiguity: AmbiguityReason = AmbiguityReason.NONE
    ambiguity_note: str = ""


@dataclass(frozen=True)
class BaZiHint:
    """A side-channel recommendation derived from TST. Advisory only — the
    real pillar math lives in the BaZi Engine service. We surface the shichen
    so the UI can warn when naive clock time would place the birth in a
    different two-hour period (a common, consequential mistake)."""

    recommended_time_standard: str = "true_solar_time"
    shichen: Optional[Shichen] = None
    note: str = ""


@dataclass(frozen=True)
class BirthResolution:
    """The full result of resolving a birth time."""

    birth_data_hash: str
    input_summary: str
    resolution: ResolvedTime
    bazi: BaZiHint = field(default_factory=BaZiHint)

    def etag(self) -> str:
        """Stable identity for HTTP caching. Equal birth inputs ⇒ equal etag.

        birth_data_hash already folds in all inputs plus tzdata_version, so it
        is the correct cache identity.
        """
        return self.birth_data_hash


# --------------------------------------------------------------------------- #
# Shichen computation (pure function — testable without any I/O)
# --------------------------------------------------------------------------- #
def shichen_for_tst(tst: time) -> Optional[Shichen]:
    """Map a True Solar Time-of-day onto a BaZi shichen.

    Each shichen spans two TST hours. Conventional boundaries fall on ODD
    hours, so a shichen named X covers the [odd, odd+2) window in clock hour:
      ZI   wraps: 23:00–01:00
      CHOU 01:00–03:00
      YIN   03:00–05:00
      MAO   05:00–07:00
      CHEN  07:00–09:00
      SI    09:00–11:00
      WU    11:00–13:00
      WEI   13:00–15:00
      SHEN  15:00–17:00
      YOU   17:00–19:00
      XU    19:00–21:00
      HAI   21:00–23:00

    >>> shichen_for_tst(time(14, 47)).value
    'wei'
    >>> shichen_for_tst(time(16, 40)).value
    'shen'
    >>> shichen_for_tst(time(23, 30)).value
    'zi'
    """
    if tst is None:
        return None
    h = tst.hour
    if h in (23, 0):
        return Shichen.ZI
    if h in (1, 2):
        return Shichen.CHOU
    if h in (3, 4):
        return Shichen.YIN
    if h in (5, 6):
        return Shichen.MAO
    if h in (7, 8):
        return Shichen.CHEN
    if h in (9, 10):
        return Shichen.SI
    if h in (11, 12):
        return Shichen.WU
    if h in (13, 14):
        return Shichen.WEI
    if h in (15, 16):
        return Shichen.SHEN
    if h in (17, 18):
        return Shichen.YOU
    if h in (19, 20):
        return Shichen.XU
    # h in (21, 22)
    return Shichen.HAI
