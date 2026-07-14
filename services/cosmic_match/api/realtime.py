"""Cosmic Match realtime transport — Socket.IO ASGI server (MATCH-1, MATCH-6).

Implements the WS contract from AstroOS-API-Integration-Guide (screen Match):
  - Client connects with ?conv_id=<conversation> in the query string.
  - The conversation's profile ids are passed via auth ({a, b}) on connect.
  - Events (all type-tagged JSON on the `match:message` / `match:resync`
    / `match:history` channel names):
      client → server:  match:message   { text, client_msg_id }
                        match:resync    { last_msg_id }
      server → client:  match:message   { from, text, server_msg_id, ts }
                        match:moderation{ severity }
                        match:history   { messages: [...] }

MATCH-1: cross-instance fanout would use the Socket.io Redis adapter (DB4).
Single-process here for dev; the adapter attaches behind create_socketio() so
production can pass `client_manager=socketio.AsyncRedisManager(...)`.

Privacy: `from` is ALWAYS a profile_id (prf_...). The server never emits
user_id or birth data. Coordinates never appear.
"""
from __future__ import annotations

import os
from typing import Optional

import socketio

from services.cosmic_match.adapter.chat_store import InMemoryChatStore
from services.cosmic_match.domain.chat import (
    ChatMessage,
    Conversation,
    ConversationState,
    build_ice_breaker,
)
from services.cosmic_match.usecase.handle_chat import (
    ConversationNotFound,
    HandleChatMessage,
    NotParticipant,
)


def _serialize(msg: ChatMessage) -> dict:
    """Wire format — matches the API Integration Guide."""
    return {
        "type": "message",
        "from": msg.sender_profile_id,
        "text": msg.text,
        "server_msg_id": msg.server_msg_id,
        "ts": msg.ts,
    }


def create_socketio(store: Optional[InMemoryChatStore] = None,
                    usecase: Optional[HandleChatMessage] = None
                    ) -> socketio.AsyncServer:
    """Build the Socket.IO AsyncServer wired to the chat use case.

    Returns the server (call .asgi_app() to get the ASGI app for mounting).
    """
    store = store or InMemoryChatStore()
    usecase = usecase or HandleChatMessage(store=store)

    # MATCH-1: Redis adapter (DB4) when configured for horizontal fanout.
    redis_url = os.environ.get("MATCH_REDIS_URL")  # e.g. redis://redis:6379/4
    if redis_url:
        client_manager = socketio.AsyncRedisManager(redis_url)
        sio = socketio.AsyncServer(
            async_mode="asgi", cors_allowed_origins="*",
            client_manager=client_manager)
    else:
        sio = socketio.AsyncServer(
            async_mode="asgi", cors_allowed_origins="*")

    # Track conversation ↔ room and participant ↔ profile_id per socket.
    state: dict[str, dict] = {}  # sid → {conv_id, profile_id, partner_id}

    @sio.event
    async def connect(sid, environ, auth):  # noqa: ANN001
        query = environ.get("QUERY_STRING", "")
        conv_id = _query_param(query, "conv_id")
        if not conv_id or not isinstance(auth, dict):
            return False  # reject — missing conversation or auth

        a = auth.get("a")
        b = auth.get("b")
        if not a or not b:
            return False  # both participants must be identified

        # Ensure conversation exists (idempotent). The participant that
        # connects first creates it.
        conv = store.ensure_conversation(Conversation(
            conversation_id=conv_id, profile_a_id=a, profile_b_id=b))

        # Which profile is this socket speaking as? Passed via auth.as.
        profile_id = auth.get("as")
        if not conv.is_participant(profile_id):
            return False  # not a participant — reject

        partner = b if profile_id == a else a
        state[sid] = {"conv_id": conv_id, "profile_id": profile_id,
                      "partner_id": partner}
        await sio.enter_room(sid, conv_id)

        # If this is the first participant, seed the ice-breaker (MATCH-6).
        history = store.history(conv_id)
        if not history:
            ice = build_ice_breaker(
                _sun(auth.get("sun_a")), _sun(auth.get("sun_b")),
                auth.get("bazi_el_a"), auth.get("bazi_el_b"))
            ice_msg = ChatMessage(
                server_msg_id=f"msg_ice_{conv_id}",
                conversation_id=conv_id,
                sender_profile_id="prf_astroos",  # system / AI ice-breaker
                text=ice,
            )
            store.append(ice_msg)
            await sio.emit("match:message", _serialize(ice_msg), to=conv_id)

    @sio.on("match:message")
    async def on_message(sid, data):  # noqa: ANN001
        st = state.get(sid)
        if not st:
            return
        text = (data or {}).get("text", "")
        client_msg_id = (data or {}).get("client_msg_id")
        try:
            result = usecase.send(
                st["conv_id"], st["profile_id"], text, client_msg_id)
        except (ConversationNotFound, NotParticipant):
            return  # silently drop — bad state

        if result.publish:
            await sio.emit("match:message",
                           _serialize(result.message), to=st["conv_id"])
        # Moderation feedback to the sender (MATCH-7)
        if result.moderation.value != "ok":
            await sio.emit("match:moderation", {
                "severity": result.moderation.value,
                "server_msg_id": result.message.server_msg_id,
            }, to=sid)

    @sio.on("match:resync")
    async def on_resync(sid, data):  # noqa: ANN001
        """On reconnect, replay missed messages (MATCH-6 last-msg-id resync)."""
        st = state.get(sid)
        if not st:
            return
        last_msg_id = (data or {}).get("last_msg_id")
        missed = usecase.resync(st["conv_id"], last_msg_id) if last_msg_id \
            else usecase.history(st["conv_id"])
        await sio.emit("match:history", {
            "messages": [_serialize(m) for m in missed],
        }, to=sid)

    @sio.event
    async def disconnect(sid):  # noqa: ANN001
        state.pop(sid, None)

    return sio


def _query_param(query_string: str, name: str) -> Optional[str]:
    """Parse a query param from a raw QUERY_STRING (urlencoded)."""
    from urllib.parse import parse_qs, unquote
    pairs = parse_qs(query_string)
    vals = pairs.get(name)
    return unquote(vals[0]) if vals else None


def _sun(val) -> Optional[str]:
    return val if isinstance(val, str) else None
