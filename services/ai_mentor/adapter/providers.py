"""AI Mentor adapters: deterministic LLM, conversation store, response cache.

The adapter layer is the OUTER ring — it implements the Protocol ports
declared in `usecase.chat`. Production swaps these for real providers:
  - DeterministicLLM → ZAIMentorService / OpenAI fallback (z-ai-web-dev-sdk)
    with circuit breaker (ADR MENTOR-3, cost-control ADR-0007).
  - InMemoryConversationStore → Postgres `mentor_messages` (partitioned).
  - InMemoryResponseCache → Redis DB6, 24h TTL (semantic cache).

The deterministic versions here give reproducible, free, instant responses —
essential for unit/integration testing the guardrail pipeline without an
LLM API key. They also let the streaming endpoint serve a real token stream.
"""
from __future__ import annotations

import time
from typing import AsyncIterator, Optional

from services.ai_mentor.domain.entities import (
    ConversationContext,
    Message,
    VoiceProfile,
)


# --------------------------------------------------------------------------- #
# Deterministic LLM provider
# --------------------------------------------------------------------------- #
# A canned, voice-aware response per (intent-keyword → reply). This is NOT an
# LLM — it is a deterministic stand-in so the full guardrail pipeline (crisis
# pre-check → cache → generation → forbidden-content filter) is exercisable
# in dev/test without API keys or network. The real provider drops in behind
# the same LLMProvider port; the domain/usecase never import this class.
_VOICE_TEMPLATES: dict[VoiceProfile, str] = {
    VoiceProfile.CALM:
        "Your natal chart reveals genuine strengths worth leaning into. "
        "The current transits invite steady, intentional growth. "
        "What small step would feel most aligned for you today?",
    VoiceProfile.WITTY:
        "Cosmos says: your Mercury placement is doing the most — in a good way. "
        "Lean into that quick wit. The stars are not the boss of you, "
        "but they did leave a hint.",
    VoiceProfile.PROFESSIONAL:
        "Based on your chart's structure, here is a focused recommendation: "
        "prioritize the Saturn-ruled area this week. Concrete action beats "
        "speculation. Set one measurable goal.",
    VoiceProfile.TRAUMA:
        "Thank you for sharing. Your feelings are valid. "
        "Let's take this gently — one moment at a time. "
        "You deserve support, and you are not alone in this.",
}


class DeterministicLLM:
    """Port impl: deterministic, voice-aware responses. No network, no keys.

    Honors the streaming contract: generate() returns the full text;
    stream() yields it word-by-word (simulated token stream for SSE).
    """

    def generate(self, system_prompt: str, context: ConversationContext,
                 user_message: str, voice: VoiceProfile) -> str:
        # Context-aware: if the message mentions a planet/sign, reflect it back.
        msg_lower = user_message.lower()
        body = _VOICE_TEMPLATES.get(voice, _VOICE_TEMPLATES[VoiceProfile.CALM])
        for planet in ("saturn", "moon", "venus", "mars", "сатурн", "луна"):
            if planet in msg_lower:
                body = f"Your {planet} placement is a meaningful thread here. " + body
                break
        return body

    async def stream(self, system_prompt: str, context: ConversationContext,
                     user_message: str, voice: VoiceProfile) -> AsyncIterator[str]:
        """Yield tokens (words) for SSE streaming. Simulates latency."""
        text = self.generate(system_prompt, context, user_message, voice)
        for word in text.split():
            yield word + " "
            await _sleep(0.005)  # 5ms/token — fast for tests, visible for demos


async def _sleep(seconds: float) -> None:
    # tiny helper so tests can monkeypatch if needed
    import asyncio
    await asyncio.sleep(seconds)


# --------------------------------------------------------------------------- #
# In-memory conversation store
# --------------------------------------------------------------------------- #
class InMemoryConversationStore:
    """Port impl: per-conversation message log. Dev only (no persistence)."""

    def __init__(self) -> None:
        self._conversations: dict[str, list[Message]] = {}

    async def append(self, conversation_id: str, message: Message) -> None:
        self._conversations.setdefault(conversation_id, []).append(message)

    async def recent(self, conversation_id: str, limit: int = 10) -> tuple[Message, ...]:
        msgs = self._conversations.get(conversation_id, [])
        return tuple(msgs[-limit:])


# --------------------------------------------------------------------------- #
# In-memory response cache
# --------------------------------------------------------------------------- #
class InMemoryResponseCache:
    """Port impl: semantic response cache. Production: Redis, 24h TTL."""

    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    async def get(self, cache_key: str) -> Optional[str]:
        return self._store.get(cache_key)

    async def set(self, cache_key: str, response: str) -> None:
        self._store[cache_key] = response
