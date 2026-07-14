"""Cosmic Match chat adapters: in-memory conversation + message store.

Implements the ports declared in `usecase.handle_chat`. Production swaps:
  - InMemoryChatStore → Postgres `match_messages` (partitioned by month) +
    Redis Sorted Set for fast resync-by-last-msg-id.
  - The Socket.io Redis adapter (DB4, per MATCH-1) handles cross-instance
    fanout; here we run single-process for dev.

Key behaviors:
  - append() is idempotent on client_msg_id (dedup): re-emitting a message
    with the same client_msg_id returns the original server_msg_id instead
    of creating a duplicate. This is the MATCH-6 "reconnect without loss"
    guarantee.
  - resync(last_msg_id) returns messages strictly after the given id, in
    order — used on reconnect to fill the gap.
"""
from __future__ import annotations

from typing import Optional

from services.cosmic_match.domain.chat import ChatMessage, Conversation


class InMemoryChatStore:
    """Port impl: per-conversation message history + dedup + resync.

    Dev only (in-process dict). Production: Postgres + Redis sorted set.
    """

    def __init__(self) -> None:
        self._conversations: dict[str, Conversation] = {}
        self._messages: dict[str, list[ChatMessage]] = {}
        # client_msg_id → server_msg_id (per conversation) for idempotent dedup
        self._client_id_index: dict[str, dict[str, str]] = {}

    # ---- conversations -------------------------------------------------- #
    def ensure_conversation(self, conv: Conversation) -> Conversation:
        existing = self._conversations.get(conv.conversation_id)
        if existing is None:
            self._conversations[conv.conversation_id] = conv
            self._messages.setdefault(conv.conversation_id, [])
            self._client_id_index.setdefault(conv.conversation_id, {})
            return conv
        return existing

    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        return self._conversations.get(conversation_id)

    # ---- messages ------------------------------------------------------- #
    def append(self, message: ChatMessage) -> tuple[ChatMessage, bool]:
        """Append a message, deduping by client_msg_id.

        Returns (stored_message, is_new). If the client_msg_id was already
        seen, returns the ORIGINAL stored message with is_new=False — this is
        the idempotent reconnect path (MATCH-6).
        """
        conv_id = message.conversation_id
        cid = message.client_msg_id
        if cid:
            index = self._client_id_index.setdefault(conv_id, {})
            if cid in index:
                # Already stored — return the original, no duplicate.
                for m in self._messages[conv_id]:
                    if m.server_msg_id == index[cid]:
                        return m, False
            index[cid] = message.server_msg_id
        self._messages.setdefault(conv_id, []).append(message)
        return message, True

    def history(self, conversation_id: str, limit: int = 50) -> list[ChatMessage]:
        msgs = self._messages.get(conversation_id, [])
        return list(msgs[-limit:])

    def resync(self, conversation_id: str, last_msg_id: str) -> list[ChatMessage]:
        """Return messages strictly after last_msg_id, in order (MATCH-6)."""
        msgs = self._messages.get(conversation_id, [])
        found = False
        out: list[ChatMessage] = []
        for m in msgs:
            if found:
                out.append(m)
            elif m.server_msg_id == last_msg_id:
                found = True
        return out
