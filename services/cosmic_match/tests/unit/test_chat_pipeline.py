"""Unit tests for the chat pipeline: dedup, moderation gating, resync."""
from __future__ import annotations

import pytest

from services.cosmic_match.adapter.chat_store import InMemoryChatStore
from services.cosmic_match.domain.chat import Conversation
from services.cosmic_match.usecase.handle_chat import (
    ConversationNotFound,
    HandleChatMessage,
    NotParticipant,
)


def _setup():
    store = InMemoryChatStore()
    store.ensure_conversation(Conversation(
        conversation_id="conv1", profile_a_id="prf_a", profile_b_id="prf_b"))
    return HandleChatMessage(store=store), store


class TestSendAndDedup:
    def test_send_returns_message(self):
        uc, _ = _setup()
        result = uc.send("conv1", "prf_a", "Hello!", client_msg_id="c1")
        assert result.is_new is True
        assert result.publish is True
        assert result.message.text == "Hello!"
        assert result.message.sender_profile_id == "prf_a"
        assert result.message.server_msg_id.startswith("msg_")

    def test_dedup_same_client_msg_id(self):
        """Re-emitting the same client_msg_id returns the original (MATCH-6)."""
        uc, _ = _setup()
        r1 = uc.send("conv1", "prf_a", "Hello!", client_msg_id="dup1")
        r2 = uc.send("conv1", "prf_a", "Hello again", client_msg_id="dup1")
        assert r1.is_new is True
        assert r2.is_new is False
        assert r1.message.server_msg_id == r2.message.server_msg_id
        assert r2.message.text == "Hello!"  # original text preserved

    def test_different_client_msg_ids_both_stored(self):
        uc, store = _setup()
        uc.send("conv1", "prf_a", "one", client_msg_id="c1")
        uc.send("conv1", "prf_a", "two", client_msg_id="c2")
        assert len(store.history("conv1")) == 2


class TestModerationGating:
    def test_block_not_published(self):
        uc, store = _setup()
        result = uc.send("conv1", "prf_a", "I will kill you")
        assert result.moderation.value == "block"
        assert result.publish is False
        # Still persisted (for audit) but won't be broadcast
        assert len(store.history("conv1")) == 1

    def test_warning_published_and_flagged(self):
        uc, _ = _setup()
        result = uc.send("conv1", "prf_a", "you're an idiot")
        assert result.moderation.value == "warning"
        assert result.publish is True  # published + flagged

    def test_ok_published(self):
        uc, _ = _setup()
        result = uc.send("conv1", "prf_a", "Nice to meet you!")
        assert result.publish is True
        assert result.moderation.value == "ok"


class TestAuthorization:
    def test_non_participant_rejected(self):
        uc, _ = _setup()
        with pytest.raises(NotParticipant):
            uc.send("conv1", "prf_intruder", "hi")

    def test_missing_conversation(self):
        uc, _ = _setup()
        with pytest.raises(ConversationNotFound):
            uc.send("nope", "prf_a", "hi")


class TestHistoryAndResync:
    def test_history_returns_all(self):
        uc, _ = _setup()
        uc.send("conv1", "prf_a", "m1", client_msg_id="1")
        uc.send("conv1", "prf_b", "m2", client_msg_id="2")
        uc.send("conv1", "prf_a", "m3", client_msg_id="3")
        assert len(uc.history("conv1")) == 3

    def test_resync_returns_missed_only(self):
        """After reconnect, only messages after last_msg_id are returned."""
        uc, _ = _setup()
        uc.send("conv1", "prf_a", "m1", client_msg_id="1")
        r2 = uc.send("conv1", "prf_b", "m2", client_msg_id="2")
        uc.send("conv1", "prf_a", "m3", client_msg_id="3")
        missed = uc.resync("conv1", r2.message.server_msg_id)
        assert len(missed) == 1
        assert missed[0].text == "m3"

    def test_resync_unknown_id_returns_empty(self):
        uc, _ = _setup()
        uc.send("conv1", "prf_a", "m1", client_msg_id="1")
        assert uc.resync("conv1", "msg_nonexistent") == []
