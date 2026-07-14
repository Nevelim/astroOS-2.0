"""AI Mentor domain: crisis detection + guardrails.

Pure functions — no LLM, no I/O. Crisis detection uses keyword/regex matching
(the first layer of the 4-layer guardrail from the Architecture ADR).
The streaming LLM classifier (layer 2) runs in the adapter.

This module is CRITICAL: it must not produce false negatives on genuine
crisis content. False positives are acceptable (better safe).
"""
from __future__ import annotations

import re
from typing import Iterable

from services.ai_mentor.domain.entities import CrisisLevel


# --------------------------------------------------------------------------- #
# Crisis keywords (multilingual)
# --------------------------------------------------------------------------- #
# These patterns trigger immediate CRISIS level. Maintain conservatively.
_CRISIS_PATTERNS: tuple[re.Pattern, ...] = (
    # English
    re.compile(r"\b(kill myself|suicide|suicidal|end my life|want to die|"
               r"hurt myself|self[- ]?harm|no reason to live|better off dead)\b",
               re.IGNORECASE),
    # Russian (no \b — Python re \b doesn't work reliably with Cyrillic)
    re.compile(r"(покончить с собой|суицид|самоубийст|хочу умереть|"
               r"причинить себе вред|нет смысла жить|не хочу жить|"
               r"лучше бы умер|порезать себя|убить себя)", re.IGNORECASE),
    # Hindi (transliterated common phrases)
    re.compile(r"\b(khud ko mar|atmahatya|jiene nahi chahta|mar jana chahta)\b",
               re.IGNORECASE),
)

# Warning patterns — not immediate crisis but warrant care.
_WARNING_PATTERNS: tuple[re.Pattern, ...] = (
    re.compile(r"\b(depressed|hopeless|worthless|alone|empty|"
               r"exhausted|can.?t go on|giving up)\b", re.IGNORECASE),
    re.compile(r"(депресс|безнадеж|ничего не стоит|одинок|пустот|"
               r"не могу больше|опускаются руки)", re.IGNORECASE),
)

# Content that must NEVER appear in mentor responses (fatalism/medical/financial).
_FORBIDDEN_RESPONSE_PATTERNS: tuple[re.Pattern, ...] = (
    re.compile(r"\byou (will|are going to) (die|fail|lose)\b", re.IGNORECASE),
    # Medical: both a disease term AND a diagnosis phrase appear (any order)
    re.compile(r"\b(cancer|tumor|terminal|diagnos)\b", re.IGNORECASE),
    re.compile(r"\b(guaranteed return|sure profit|cannot lose money)\b", re.IGNORECASE),
    re.compile(r"вы (умрёте|потеряете всё|обязательно провалитесь)", re.IGNORECASE),
)


def detect_crisis(text: str) -> CrisisLevel:
    """Classify user input text for crisis indicators.

    Pure function. Layer 1 of the 4-layer guardrail.
    Returns CRISIS for self-harm indicators, WARNING for concerning content.
    """
    if not text:
        return CrisisLevel.NONE
    for pattern in _CRISIS_PATTERNS:
        if pattern.search(text):
            return CrisisLevel.CRISIS
    for pattern in _WARNING_PATTERNS:
        if pattern.search(text):
            return CrisisLevel.WARNING
    return CrisisLevel.NONE


def response_has_forbidden_content(text: str) -> bool:
    """Check if a generated response contains forbidden fatalism/medical/financial."""
    for pattern in _FORBIDDEN_RESPONSE_PATTERNS:
        if pattern.search(text):
            return True
    return False


# --------------------------------------------------------------------------- #
# Crisis hotlines by country (ISO-2 → number)
# --------------------------------------------------------------------------- #
CRISIS_HOTLINES: dict[str, str] = {
    "US": "988",
    "GB": "116123",       # Samaritans
    "RU": "+7 (495) 989-50-50",  # Московская психологическая служба
    "IN": "9152987821",   # iCall
    "CN": "400-161-9995", # Lifeline
    "BR": "188",          # CVV
    "KZ": "150",          # линия доверия
    "DE": "0800/1110111",
    "FR": "3114",
    "AU": "131114",
}


def get_hotline(country_code: str) -> str:
    """Return crisis hotline for a country, or US default."""
    return CRISIS_HOTLINES.get(country_code.upper(), CRISIS_HOTLINES["US"])
