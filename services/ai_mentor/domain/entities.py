"""AI Mentor domain: conversation, message, voice, crisis detection entities.

Pure domain — no LLM, no I/O. Defines the contract for the streaming chat:
messages, voices, crisis flags, rate-limit state.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class VoiceProfile(str, Enum):
    """The 4 AI-mentor voice modes (matches Daily Content taxonomy)."""
    CALM = "calm"              # empowerment (default)
    WITTY = "witty"            # playful
    PROFESSIONAL = "professional"  # pragmatic
    TRAUMA = "trauma"          # reflective / 2am companion


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class CrisisLevel(str, Enum):
    NONE = "none"
    WARNING = "warning"       # concerning content detected
    CRISIS = "crisis"         # self-harm / suicide indicator


@dataclass(frozen=True)
class Message:
    role: MessageRole
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    voice: Optional[VoiceProfile] = None


@dataclass(frozen=True)
class ConversationContext:
    """Assembled context for the LLM: profile + transits + memory + RAG."""
    member_id: str
    birth_data_hash: str
    sun_sign: Optional[str] = None
    day_master: Optional[str] = None
    recent_messages: tuple[Message, ...] = ()
    memory_facts: tuple[str, ...] = ()
    rag_excerpts: tuple[str, ...] = ()


@dataclass(frozen=True)
class MentorResponse:
    """The result of a mentor turn — content + crisis flag + metadata."""
    content: str
    voice: VoiceProfile
    crisis: CrisisLevel
    crisis_hotline: Optional[str] = None
    tokens_used: int = 0
    cached: bool = False
