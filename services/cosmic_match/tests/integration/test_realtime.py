"""Integration tests for the match realtime Socket.IO server.

These spin up the ASGI app on an ephemeral port and connect a real
socketio.AsyncClient — a true end-to-end test through the Engine.IO
handshake (the same path the frontend socket.io-client takes).

Covers MATCH-1 (WS connect), MATCH-6 (chat + history + resync by last-msg-id),
MATCH-7 (moderation_flag). Privacy: `from` is always a profile_id.

All tests are async (asyncio_mode=auto) so the client and server share one
event loop — required for socketio.AsyncClient's background tasks.
"""
from __future__ import annotations

import asyncio
import socket as _socket
import time

import pytest
import socketio
import uvicorn

from services.cosmic_match.api.realtime import create_socketio
from services.cosmic_match.adapter.chat_store import InMemoryChatStore
from services.cosmic_match.usecase.handle_chat import HandleChatMessage


def _free_port() -> int:
    s = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


@pytest.fixture()
async def server():
    """Start the Socket.IO ASGI server on an ephemeral port. Yields (url, store)."""
    store = InMemoryChatStore()
    usecase = HandleChatMessage(store=store)
    sio = create_socketio(store=store, usecase=usecase)
    app = socketio.ASGIApp(sio)

    port = _free_port()
    config = uvicorn.Config(app, host="127.0.0.1", port=port,
                            log_level="error", loop="auto")
    server = uvicorn.Server(config)

    task = asyncio.create_task(server.serve())
    deadline = time.time() + 5
    while time.time() < deadline and not server.started:
        await asyncio.sleep(0.02)

    yield f"http://127.0.0.1:{port}", store

    server.should_exit = True
    try:
        await asyncio.wait_for(task, timeout=3)
    except asyncio.TimeoutError:
        task.cancel()


async def _connect(url, conv_id, auth):
    c = socketio.AsyncClient()
    try:
        await c.connect(f"{url}?conv_id={conv_id}", auth=auth,
                        transports=["websocket"])
        return c, True
    except Exception:
        await c.disconnect()
        return c, False


# --------------------------------------------------------------------------- #
# Connect (MATCH-1)
# --------------------------------------------------------------------------- #
class TestConnect:
    async def test_connect_as_participant(self, server):
        url, _ = server
        c, ok = await _connect(url, "conv_t1",
                               {"a": "prf_a", "b": "prf_b", "as": "prf_a"})
        assert ok is True
        await c.disconnect()

    async def test_rejected_without_auth(self, server):
        url, _ = server
        _, ok = await _connect(url, "conv_t2", {})
        assert ok is False

    async def test_rejected_for_non_participant(self, server):
        url, _ = server
        _, ok = await _connect(url, "conv_t3",
                               {"a": "prf_a", "b": "prf_b", "as": "prf_x"})
        assert ok is False


# --------------------------------------------------------------------------- #
# Ice-breaker (MATCH-6)
# --------------------------------------------------------------------------- #
class TestIceBreaker:
    async def test_first_participant_sees_ice_breaker(self, server):
        url, _ = server
        c = socketio.AsyncClient()
        got = []

        @c.on("match:message")
        async def on_msg(data):
            got.append(data)

        await c.connect(f"{url}?conv_id=conv_ice",
                        auth={"a": "prf_a", "b": "prf_b", "as": "prf_a"},
                        transports=["websocket"])
        await asyncio.sleep(0.3)
        await c.disconnect()

        assert len(got) >= 1
        ice = got[0]
        assert ice["from"] == "prf_astroos"
        assert len(ice["text"]) > 20
        assert ice["server_msg_id"].startswith("msg_ice_")


# --------------------------------------------------------------------------- #
# Chat roundtrip (MATCH-6)
# --------------------------------------------------------------------------- #
class TestChatRoundtrip:
    async def test_message_broadcast_to_partner(self, server):
        url, _ = server
        alice = socketio.AsyncClient()
        bob = socketio.AsyncClient()
        bob_got = []

        @bob.on("match:message")
        async def on_bob(data):
            bob_got.append(data)

        await alice.connect(f"{url}?conv_id=conv_chat",
                            auth={"a": "prf_alice", "b": "prf_bob",
                                  "as": "prf_alice", "sun_a": "leo"},
                            transports=["websocket"])
        await bob.connect(f"{url}?conv_id=conv_chat",
                          auth={"a": "prf_alice", "b": "prf_bob",
                                "as": "prf_bob", "sun_b": "aquarius"},
                          transports=["websocket"])
        await asyncio.sleep(0.2)
        bob_got.clear()
        await alice.emit("match:message", {"text": "Hi Bob!",
                                           "client_msg_id": "c1"})
        await asyncio.sleep(0.3)
        await alice.disconnect()
        await bob.disconnect()

        msgs = [m for m in bob_got if m["text"] == "Hi Bob!"]
        assert len(msgs) == 1
        assert msgs[0]["from"] == "prf_alice"
        assert msgs[0]["server_msg_id"].startswith("msg_")
        assert "ts" in msgs[0]


# --------------------------------------------------------------------------- #
# Resync by last-msg-id (MATCH-6)
# --------------------------------------------------------------------------- #
class TestResync:
    async def test_resync_replays_missed_only(self, server):
        url, store = server
        alice = socketio.AsyncClient()
        bob = socketio.AsyncClient()
        history = []

        @bob.on("match:history")
        async def on_hist(data):
            history.extend(data["messages"])

        await alice.connect(f"{url}?conv_id=conv_r",
                            auth={"a": "prf_a", "b": "prf_b", "as": "prf_a"},
                            transports=["websocket"])
        await bob.connect(f"{url}?conv_id=conv_r",
                          auth={"a": "prf_a", "b": "prf_b", "as": "prf_b"},
                          transports=["websocket"])
        await asyncio.sleep(0.2)
        await alice.emit("match:message", {"text": "first", "client_msg_id": "r1"})
        await asyncio.sleep(0.15)
        cursor = store.history("conv_r")[-1].server_msg_id
        await alice.emit("match:message", {"text": "second", "client_msg_id": "r2"})
        await asyncio.sleep(0.15)
        history.clear()
        await bob.emit("match:resync", {"last_msg_id": cursor})
        await asyncio.sleep(0.3)
        await alice.disconnect()
        await bob.disconnect()

        texts = [m["text"] for m in history]
        assert "second" in texts
        assert "first" not in texts


# --------------------------------------------------------------------------- #
# Moderation (MATCH-7)
# --------------------------------------------------------------------------- #
class TestModeration:
    async def test_warning_emits_moderation_flag(self, server):
        url, _ = server
        alice = socketio.AsyncClient()
        flags = []

        @alice.on("match:moderation")
        async def on_mod(data):
            flags.append(data)

        await alice.connect(f"{url}?conv_id=conv_mod",
                            auth={"a": "prf_a", "b": "prf_b", "as": "prf_a"},
                            transports=["websocket"])
        await asyncio.sleep(0.2)
        await alice.emit("match:message", {"text": "you're an idiot",
                                           "client_msg_id": "w1"})
        await asyncio.sleep(0.3)
        await alice.disconnect()

        assert len(flags) == 1
        assert flags[0]["severity"] == "warning"

    async def test_blocked_message_not_broadcast(self, server):
        url, _ = server
        alice = socketio.AsyncClient()
        bob = socketio.AsyncClient()
        bob_got = []

        @bob.on("match:message")
        async def on_bob(data):
            bob_got.append(data)

        await alice.connect(f"{url}?conv_id=conv_blk",
                            auth={"a": "prf_a", "b": "prf_b", "as": "prf_a"},
                            transports=["websocket"])
        await bob.connect(f"{url}?conv_id=conv_blk",
                          auth={"a": "prf_a", "b": "prf_b", "as": "prf_b"},
                          transports=["websocket"])
        await asyncio.sleep(0.2)
        bob_got.clear()
        await alice.emit("match:message", {"text": "I will kill you",
                                           "client_msg_id": "b1"})
        await asyncio.sleep(0.3)
        await alice.disconnect()
        await bob.disconnect()

        assert all("kill you" not in m["text"] for m in bob_got)
