"""Cosmic Match chat use case: process an inbound realtime message.

Clean Architecture: depends ONLY on the domain layer (chat entities,
moderate(), build_ice_breaker()) and Protocol ports declared here
(ChatStore, ProfileLookup). The realtime transport (Socket.io) lives in the
api layer and calls into this use case.

Pipeline (per Architecture ADR SM-05 / MATCH-6, MATCH-7):
  1. Resolve conversation + validate sender is a participant.
  2. Persist (idempotent on client_msg_id — dedup for reconnect).
  3. Moderate (MATCH-7): BLOCK → don't publish; WARNING → publish + flag.
  4. Return the stored message + verdict so the api layer can broadcast.

Privacy: the sender identity carried in every message is a profile_id
(prf_...), never user_id or birth data. The use case never touches raw
birth data — only the natal/BaZi summaries needed for the ice-breaker.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional, Protocol

from services.cosmic_match.domain.chat import (
    ChatMessage,
    Conversation,
    ModerationVerdict,
    moderate,
)


# --------------------------------------------------------------------------- #
# Ports
# --------------------------------------------------------------------------- #
class ChatStore(Protocol):
    """Port: conversation + message persistence + resync."""

    def ensure_conversation(self, conv: Conversation) -> Conversation:
        ...  # pragma: no cover

    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        ...  # pragma: no cover

    def append(self, message: ChatMessage) -> tuple[ChatMessage, bool]:
        ...  # pragma: no cover

    def history(self, conversation_id: str, limit: int = 50) -> list[ChatMessage]:
        ...  # pragma: no cover

    def resync(self, conversation_id: str, last_msg_id: str) -> list[ChatMessage]:
        ...  # pragma: no cover


class ProfileLookup(Protocol):
    """Port: resolve profile summaries for ice-breakers. Privacy-safe."""

    def get(self, profile_id: str):
        """Returns a MemberProfile (or None). Only summaries, no birth data."""
        ...  # pragma: no cover


# --------------------------------------------------------------------------- #
# Errors
# --------------------------------------------------------------------------- #
class NotParticipant(Exception):
    def __init__(self, profile_id: str, conversation_id: str) -> None:
        super().__init__(
            f"profile '{profile_id}' is not a participant of '{conversation_id}'")


class ConversationNotFound(Exception):
    def __init__(self, conversation_id: str) -> None:
        super().__init__(f"conversation '{conversation_id}' not found")


# --------------------------------------------------------------------------- #
# Result
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class ProcessedMessage:
    message: ChatMessage
    is_new: bool                # False = dedup hit (idempotent reconnect)
    publish: bool               # False if moderation blocked
    moderation: ModerationVerdict


# --------------------------------------------------------------------------- #
# Use case
# --------------------------------------------------------------------------- #
@dataclass
class HandleChatMessage:
    store: ChatStore

    def send(self, conversation_id: str, sender_profile_id: str,
             text: str, client_msg_id: Optional[str] = None) -> ProcessedMessage:
        conv = self.store.get_conversation(conversation_id)
        if conv is None:
            raise ConversationNotFound(conversation_id)
        if not conv.is_participant(sender_profile_id):
            raise NotParticipant(sender_profile_id, conversation_id)

        # Moderation BEFORE persist of a publishable copy (MATCH-7).
        verdict = moderate(text)

        message = ChatMessage(
            server_msg_id=f"msg_{uuid.uuid4().hex[:16]}",
            conversation_id=conversation_id,
            sender_profile_id=sender_profile_id,
            text=text,
            client_msg_id=client_msg_id,
            moderation=verdict,
        )
        stored, is_new = self.store.append(message)

        # BLOCK: do not publish to the other participant. The sender still
        # gets an ack so their client isn't left hanging.
        publish = verdict is not ModerationVerdict.BLOCK
        return ProcessedMessage(message=stored, is_new=is_new,
                                publish=publish, moderation=verdict)

    def history(self, conversation_id: str, limit: int = 50) -> list[ChatMessage]:
        return self.store.history(conversation_id, limit)

    def resync(self, conversation_id: str, last_msg_id: str) -> list[ChatMessage]:
        return self.store.resync(conversation_id, last_msg_id)
