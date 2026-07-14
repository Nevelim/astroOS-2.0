"""Daily Content domain: entities for daily horoscopes + affirmations.

Pure domain — no I/O. Content is bucketed by (sun_sign × transit_cluster ×
voice × language) for cacheable batch generation per the Architecture ADR.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import Optional


class SunSign(str, Enum):
    ARIES = "aries"; TAURUS = "taurus"; GEMINI = "gemini"; CANCER = "cancer"
    LEO = "leo"; VIRGO = "virgo"; LIBRA = "libra"; SCORPIO = "scorpio"
    SAGITTARIUS = "sagittarius"; CAPRICORN = "capricorn"
    AQUARIUS = "aquarius"; PISCES = "pisces"


class VoiceProfile(str, Enum):
    """The 4 AI-mentor voice modes. Daily content uses the same taxonomy."""
    CALM = "calm"              # empowerment (default)
    WITTY = "witty"            # playful
    PROFESSIONAL = "professional"  # pragmatic
    TRAUMA = "trauma"          # reflective / trauma-sensitive


class ContentRitualType(str, Enum):
    HOROSCOPE = "horoscope"
    AFFIRMATION = "affirmation"
    COMPLIMENT = "compliment"
    TRANSIT_SUMMARY = "transit_summary"


@dataclass(frozen=True)
class DailyContentKey:
    """The cache bucket key. Equal keys → equal content (immutable)."""
    for_date: date
    sun_sign: SunSign
    voice: VoiceProfile
    language: str               # ISO-639-1: "ru", "en", "hi", ...
    transit_cluster: str = "default"  # coarse bucket: "mercury_retro", "eclipse", etc.

    def bucket_id(self) -> str:
        return f"{self.for_date.isoformat()}:{self.sun_sign.value}:{self.voice.value}:{self.language}:{self.transit_cluster}"


@dataclass(frozen=True)
class DailyContent:
    key: DailyContentKey
    ritual_type: ContentRitualType
    title: str
    body: str
    generated_at: str           # ISO timestamp
    engine_version: str

    @property
    def word_count(self) -> int:
        return len(self.body.split())
