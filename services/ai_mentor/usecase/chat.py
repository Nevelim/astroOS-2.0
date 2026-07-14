"""AI Mentor use case: orchestrate a chat turn with guardrails + caching.

Flow (per Architecture ADR SM-03):
  1. Crisis pre-check (layer 1, regex)
  2. Semantic cache check (24h Redis)
  3. Context assembly (profile + transits + memory + RAG)
  4. Streaming LLM call with voice prompt
  5. Token-level guardrail (layer 2) — adapter responsibility
  6. Final response guardrail (layer 3) — forbidden content check
  7. Cache + return
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Optional, Protocol

from services.ai_mentor.domain.entities import (
    ConversationContext,
    CrisisLevel,
    Message,
    MessageRole,
    MentorResponse,
    VoiceProfile,
)
from services.ai_mentor.domain.crisis import (
    detect_crisis,
    get_hotline,
    response_has_forbidden_content,
)


# --------------------------------------------------------------------------- #
# Ports
# --------------------------------------------------------------------------- #
class LLMProvider(Protocol):
    """Streaming LLM port. Returns the full text (adapter streams to client)."""
    def generate(self, system_prompt: str, context: ConversationContext,
                 user_message: str, voice: VoiceProfile) -> str:
        ...  # pragma: no cover


class ConversationStore(Protocol):
    """Persists messages per conversation."""
    async def append(self, conversation_id: str, message: Message) -> None:
        ...  # pragma: no cover

    async def recent(self, conversation_id: str, limit: int = 10) -> tuple[Message, ...]:
        ...  # pragma: no cover


class ResponseCache(Protocol):
    """Semantic response cache (24h TTL in production)."""
    async def get(self, cache_key: str) -> Optional[str]:
        ...  # pragma: no cover

    async def set(self, cache_key: str, response: str) -> None:
        ...  # pragma: no cover


# --------------------------------------------------------------------------- #
# Voice system prompts (the 9-principle empowerment system)
# --------------------------------------------------------------------------- #
_SYSTEM_PROMPTS: dict[VoiceProfile, str] = {
    VoiceProfile.CALM:
        "You are AstroOS, a warm, empowering astrology mentor. "
        "You weave insights from the user's natal chart and BaZi into practical guidance. "
        "You NEVER predict doom or fate. You equip the user to create their destiny. "
        "You NEVER give medical, legal, or financial advice. "
        "If the user shows signs of crisis, respond with compassion and share a hotline.",
    VoiceProfile.WITTY:
        "You are AstroOS, a playful yet wise astrology mentor. "
        "You use humor to illuminate cosmic patterns, never to mock. "
        "You empower, never fatalize. No medical/financial advice.",
    VoiceProfile.PROFESSIONAL:
        "You are AstroOS, a pragmatic, structured astrology mentor. "
        "You give clear, actionable guidance grounded in the chart. "
        "Empowerment over fate. No medical/financial advice.",
    VoiceProfile.TRAUMA:
        "You are AstroOS, a gentle, trauma-sensitive companion. "
        "You respond softly, validate feelings, and prioritize safety. "
        "Short responses. Never probe trauma. Always offer hotline if distress appears.",
}


# --------------------------------------------------------------------------- #
# Use case
# --------------------------------------------------------------------------- #
@dataclass
class MentorChat:
    llm: LLMProvider
    store: ConversationStore
    cache: ResponseCache
    free_daily_limit: int = 3

    async def execute(
        self,
        conversation_id: str,
        context: ConversationContext,
        user_message: str,
        voice: VoiceProfile = VoiceProfile.CALM,
        country_code: str = "US",
        messages_used_today: int = 0,
    ) -> MentorResponse:
        # Layer 1: crisis pre-check
        crisis = detect_crisis(user_message)
        if crisis is CrisisLevel.CRISIS:
            hotline = get_hotline(country_code)
            return MentorResponse(
                content=self._crisis_response(hotline),
                voice=VoiceProfile.TRAUMA,
                crisis=CrisisLevel.CRISIS,
                crisis_hotline=hotline,
            )

        # Semantic cache check
        cache_key = self._cache_key(context, user_message, voice)
        cached = await self.cache.get(cache_key)
        if cached is not None:
            return MentorResponse(
                content=cached, voice=voice,
                crisis=detect_crisis(cached), cached=True,
            )

        # Persist user message
        user_msg = Message(role=MessageRole.USER, content=user_message)
        await self.store.append(conversation_id, user_msg)

        # LLM generation
        system_prompt = _SYSTEM_PROMPTS[voice]
        raw = self.llm.generate(system_prompt, context, user_message, voice)

        # Layer 3: final guardrail — forbidden content
        if response_has_forbidden_content(raw):
            raw = self._safe_fallback(voice)

        # Layer 2 (final crisis check on response)
        response_crisis = detect_crisis(raw)

        # Cache
        await self.cache.set(cache_key, raw)

        # Persist assistant message
        await self.store.append(conversation_id, Message(
            role=MessageRole.ASSISTANT, content=raw, voice=voice))

        return MentorResponse(
            content=raw, voice=voice, crisis=response_crisis,
            tokens_used=len(raw.split()),
        )

    def _cache_key(self, ctx: ConversationContext, msg: str, voice: VoiceProfile) -> str:
        payload = f"{ctx.birth_data_hash}:{voice.value}:{msg.lower().strip()}"
        h = hashlib.sha256(payload.encode()).hexdigest()
        return f"mentor:resp:{h}"

    @staticmethod
    def _crisis_response(hotline: str) -> str:
        return (
            "I hear you, and your pain matters. You are not alone. "
            f"Please reach out to a crisis line right now: {hotline}. "
            "They are trained to help, and calling is free and confidential."
        )

    @staticmethod
    def _safe_fallback(voice: VoiceProfile) -> str:
        return (
            "I want to support you thoughtfully. "
            "Your chart shows unique strengths — let's focus on those. "
            "What would feel most helpful right now?"
        )
