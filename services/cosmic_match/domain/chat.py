"""Cosmic Match chat domain: messages, conversations, moderation, ice-breakers.

Pure domain — no Socket.io, no I/O. Defines the realtime chat entities and
two pure algorithms required by MATCH-6 / MATCH-7:

  - moderate(text) — a toxicity / harassment classifier (MATCH-7). The Dev
    Backlog specifies this runs "through the Mentor pipeline" in production
    (an LLM classifier). Here we provide a deterministic regex classifier as
    the dev reference: it must flag genuine toxicity with ZERO false negatives
    on slurs/threats (same philosophy as the crisis detector). Production
    swaps the adapter to call the Mentor pipeline behind the same port.

  - build_ice_breaker(...) — the AI ice-breaker that opens a conversation
    (MATCH-6 AC: "ice-breaker от AI"). Production sources it from the Mentor
    LLM; here it is deterministic, derived from the two profiles' natal/BaZi
    summaries — privacy-safe (no birth data), warm, non-intrusive.

Privacy invariants (same as the match compute path):
  - `sender` / `from` is ALWAYS a profile_id (prf_...), never user_id, never
    birth data.
  - Coordinates never appear; only approx_distance_km.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class ModerationVerdict(str, Enum):
    """Result of the toxicity classifier (MATCH-7)."""
    OK = "ok"                  # safe to publish
    WARNING = "warning"        # borderline — publish + flag for review
    BLOCK = "block"            # toxic — do not publish to other participant


class ConversationState(str, Enum):
    ACTIVE = "active"
    CLOSED = "closed"


@dataclass(frozen=True)
class ChatMessage:
    """A single realtime chat message. Maps to the wire format."""
    server_msg_id: str
    conversation_id: str
    sender_profile_id: str        # prf_... — never user_id / birth data
    text: str
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    client_msg_id: Optional[str] = None   # idempotency / dedup key
    moderation: ModerationVerdict = ModerationVerdict.OK


@dataclass
class Conversation:
    """A 1:1 chat between two matched profiles."""
    conversation_id: str
    profile_a_id: str
    profile_b_id: str
    state: ConversationState = ConversationState.ACTIVE
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def participant_ids(self) -> tuple[str, ...]:
        return (self.profile_a_id, self.profile_b_id)

    def is_participant(self, profile_id: str) -> bool:
        return profile_id in self.participant_ids()


# --------------------------------------------------------------------------- #
# Moderation classifier (MATCH-7) — pure, conservative
# --------------------------------------------------------------------------- #
# BLOCK patterns: slurs, threats, severe harassment. Maintain conservatively —
# a false negative here lets toxicity reach the other participant. When in
# doubt, escalate (BLOCK > WARNING > OK).
_BLOCK_PATTERNS: tuple[re.Pattern, ...] = (
    # Direct threats / violence
    re.compile(r"\b(kill you|threaten|hurt you|rape|assault|"
               r"I will find you|coming for you)\b", re.IGNORECASE),
    # Severe slurs (broad-stroke; production LLM is more nuanced)
    re.compile(r"\b(n[il1]gg|f[a@]gg[o0]t|tr[a@]nn[yi]|retard|spic|kike)\b",
               re.IGNORECASE),
    # Encouragement of self-harm toward the other person
    re.compile(r"\b(kill yourself|go die|end yourself)\b", re.IGNORECASE),
    # Doxxing intent
    re.compile(r"\b(your (home )?address|where you live|doxx)\b", re.IGNORECASE),
)

# WARNING patterns: offensive but not severe — publish + flag for review.
_WARNING_PATTERNS: tuple[re.Pattern, ...] = (
    re.compile(r"\b(idiot|stupid|moron|dumb|loser|trash|garbage|"
               r"hate you|shut up|disgusting)\b", re.IGNORECASE),
    # All-caps shouting (sustained)
    re.compile(r"(?:[A-Z]{3,}\s+){3,}[A-Z]{3,}"),
    # Excessive profanity markers
    re.compile(r"(?:\bf[\W]*ck|\bsh[\W]*t|\bb[\W]*tch)", re.IGNORECASE),
)


def moderate(text: str) -> ModerationVerdict:
    """Classify a chat message for toxicity. Pure function.

    Conservative bias: returns BLOCK on any severe-pattern match, WARNING on
    borderline, OK otherwise. Production replaces this with the Mentor LLM
    classifier (MATCH-7 dep MENTOR-6) behind the same use-case port.
    """
    if not text or not text.strip():
        return ModerationVerdict.OK
    for pattern in _BLOCK_PATTERNS:
        if pattern.search(text):
            return ModerationVerdict.BLOCK
    for pattern in _WARNING_PATTERNS:
        if pattern.search(text):
            return ModerationVerdict.WARNING
    return ModerationVerdict.OK


# --------------------------------------------------------------------------- #
# Ice-breaker builder (MATCH-6) — pure, deterministic, privacy-safe
# --------------------------------------------------------------------------- #
_ICE_BREAKERS_FIRE = [
    "Your shared fire element promises lively, spontaneous energy. "
    "What adventure is calling you both right now?",
    "Fire meets fire — passion and momentum. "
    "What's one bold idea you're both curious about?",
]
_ICE_BREAKERS_EARTH = [
    "Grounded and steady — your charts suggest a patient, building energy. "
    "What are you each creating these days?",
    "Earth signs appreciate the tangible. "
    "What's a small ritual that keeps you centered?",
]
_ICE_BREAKERS_AIR = [
    "Air signs thrive on ideas and conversation. "
    "What topic could you talk about for hours?",
    "Curiosity connects you both. "
    "What's something new you've learned this week?",
]
_ICE_BREAKERS_WATER = [
    "Water signs feel deeply. "
    "What's a feeling you'd like to be braver about expressing?",
    "Your shared sensitivity is a gift. "
    "What makes you feel most at ease?",
]
_ICE_BREAKERS_MIXED = [
    "Your charts suggest complementary energies — one grounding, one sparking. "
    "What do you each bring to a friendship?",
    "Different elements, shared curiosity. "
    "What surprised you about each other's world?",
]
_ICE_BREAKERS_BAZI = {
    ("fire", "wood"): "Wood feeds your fire — a generating cycle of growth. What inspires you lately?",
    ("earth", "metal"): "Earth grounds your metal — steady strength. What are you refining in your life?",
    ("water", "wood"): "Water nourishes your wood — flexibility and growth. What are you cultivating?",
}


def _sign_element(sign: Optional[str]) -> Optional[str]:
    if not sign:
        return None
    elements = {
        "aries": "fire", "leo": "fire", "sagittarius": "fire",
        "taurus": "earth", "virgo": "earth", "capricorn": "earth",
        "gemini": "air", "libra": "air", "aquarius": "air",
        "cancer": "water", "scorpio": "water", "pisces": "water",
    }
    return elements.get(sign.lower())


def build_ice_breaker(sun_a: Optional[str], sun_b: Optional[str],
                      bazi_element_a: Optional[str] = None,
                      bazi_element_b: Optional[str] = None) -> str:
    """Build a warm, non-intrusive opening message (MATCH-6).

    Deterministic and privacy-safe: derived only from sign/element summaries,
    never birth data. Production sources this from the Mentor LLM.
    """
    import random
    rng = random.Random(hash((sun_a, sun_b)) & 0xFFFFFFFF)

    el_a = _sign_element(sun_a)
    el_b = _sign_element(sun_b)
    if el_a and el_b and el_a == el_b:
        pool = {"fire": _ICE_BREAKERS_FIRE, "earth": _ICE_BREAKERS_EARTH,
                "air": _ICE_BREAKERS_AIR, "water": _ICE_BREAKERS_WATER}.get(el_a)
        if pool:
            return rng.choice(pool)
    # BaZi generating cycle flavor (keys are sorted pairs for symmetry)
    if bazi_element_a and bazi_element_b:
        pair = tuple(sorted((bazi_element_a.lower(), bazi_element_b.lower())))
        if pair in _ICE_BREAKERS_BAZI:
            return _ICE_BREAKERS_BAZI[pair]
    return rng.choice(_ICE_BREAKERS_MIXED)
