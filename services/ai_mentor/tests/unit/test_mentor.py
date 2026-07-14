"""Unit tests for AI Mentor: crisis detection, guardrails, chat use case."""
from __future__ import annotations

import pytest

from services.ai_mentor.domain.entities import (
    ConversationContext, CrisisLevel, MessageRole, Message, VoiceProfile,
)
from services.ai_mentor.domain.crisis import (
    detect_crisis, response_has_forbidden_content, get_hotline, CRISIS_HOTLINES,
)
from services.ai_mentor.usecase.chat import MentorChat


# --------------------------------------------------------------------------- #
# Crisis detection — the most critical tests in the system
# --------------------------------------------------------------------------- #
class TestCrisisDetection:
    @pytest.mark.parametrize("text", [
        "I want to kill myself",
        "I'm suicidal",
        "I should end my life",
        "I want to die",
        "I'm going to hurt myself",
        "There's no reason to live",
        "Better off dead",
        "хочу умереть",
        "покончить с собой",
        "самоубийство",
        "не хочу жить",
        "khud ko mar",
    ])
    def test_crisis_phrases_detected(self, text):
        assert detect_crisis(text) == CrisisLevel.CRISIS

    @pytest.mark.parametrize("text", [
        "I feel depressed today",
        "Everything feels hopeless",
        "I'm so alone",
        "I feel worthless",
        "депрессия",
        "одинок",
        "опускаются руки",
    ])
    def test_warning_phrases_detected(self, text):
        assert detect_crisis(text) == CrisisLevel.WARNING

    @pytest.mark.parametrize("text", [
        "How does my Saturn return affect my career?",
        "What does Moon in Taurus mean?",
        "I feel great today!",
        "Расскажи про мою карту",
    ])
    def test_normal_phrases_pass_through(self, text):
        assert detect_crisis(text) == CrisisLevel.NONE

    def test_empty_text_is_none(self):
        assert detect_crisis("") == CrisisLevel.NONE

    def test_hotlines_for_major_countries(self):
        assert get_hotline("US") == "988"
        assert get_hotline("RU").startswith("+7")
        assert get_hotline("IN") == "9152987821"
        assert get_hotline("XX") == "988"  # fallback to US


# --------------------------------------------------------------------------- #
# Response guardrail
# --------------------------------------------------------------------------- #
class TestResponseGuardrail:
    def test_fatalism_blocked(self):
        assert response_has_forbidden_content("you will die alone") is True

    def test_medical_blocked(self):
        assert response_has_forbidden_content("you have cancer diagnosis") is True

    def test_financial_blocked(self):
        assert response_has_forbidden_content("guaranteed return on this investment") is True

    def test_safe_response_passes(self):
        assert response_has_forbidden_content("Your Sun in Aries gives you courage") is False


# --------------------------------------------------------------------------- #
# Chat use case — with fakes
# --------------------------------------------------------------------------- #
class FakeLLM:
    """Fake LLM that returns canned text."""
    def __init__(self, response: str = "Your chart shows great potential."):
        self.response = response
    def generate(self, system_prompt, context, user_message, voice):
        return self.response


class FakeStore:
    def __init__(self):
        self.messages = []
    async def append(self, conv_id, message):
        self.messages.append((conv_id, message))
    async def recent(self, conv_id, limit=10):
        return tuple(m for c, m in self.messages if c == conv_id)[-limit:]


class FakeCache:
    def __init__(self):
        self.store = {}
    async def get(self, key):
        return self.store.get(key)
    async def set(self, key, val):
        self.store[key] = val


def _ctx():
    return ConversationContext(member_id="m1", birth_data_hash="sha256:test")


class TestMentorChat:
    @pytest.mark.asyncio
    async def test_normal_flow(self):
        uc = MentorChat(FakeLLM(), FakeStore(), FakeCache())
        res = await uc.execute("conv1", _ctx(), "What does my Sun sign mean?")
        assert res.crisis == CrisisLevel.NONE
        assert "potential" in res.content.lower()
        assert res.cached is False

    @pytest.mark.asyncio
    async def test_crisis_intercepts_before_llm(self):
        uc = MentorChat(FakeLLM(), FakeStore(), FakeCache())
        res = await uc.execute("conv1", _ctx(), "I want to kill myself",
                               country_code="US")
        assert res.crisis == CrisisLevel.CRISIS
        assert "988" in res.content
        assert res.crisis_hotline == "988"

    @pytest.mark.asyncio
    async def test_cached_response(self):
        cache = FakeCache()
        # Pre-populate cache
        uc1 = MentorChat(FakeLLM("original"), FakeStore(), cache)
        await uc1.execute("conv1", _ctx(), "Tell me about Mars")
        # Second call with same message → cached
        uc2 = MentorChat(FakeLLM("different"), FakeStore(), cache)
        res = await uc2.execute("conv2", _ctx(), "Tell me about Mars")
        assert res.cached is True
        assert res.content == "original"

    @pytest.mark.asyncio
    async def test_forbidden_response_replaced(self):
        uc = MentorChat(
            FakeLLM("you will die alone in darkness"),
            FakeStore(), FakeCache(),
        )
        res = await uc.execute("conv1", _ctx(), "What's my future?")
        assert "die alone" not in res.content
        assert "strength" in res.content.lower()
