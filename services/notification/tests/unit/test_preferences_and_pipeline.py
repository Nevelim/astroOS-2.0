"""Unit tests for preferences + the full pipeline (quiet hours, caps, crisis).

These test the use case in isolation with fake adapters (in-memory), covering
NOTIF-3 (tone-gate), NOTIF-5 (preferences/caps/quiet hours), and NOTIF-6
(crisis follow-up bypass). Pure logic, no HTTP.
"""
from __future__ import annotations

from datetime import time

import pytest

from services.notification.adapter.channels import (
    InMemoryChannelSink,
    InMemoryClock,
    InMemoryNotificationStore,
    InMemoryPreferenceProvider,
)
from services.notification.domain.crisis_resources import build_crisis_followup
from services.notification.domain.entities import (
    Channel,
    NotificationEvent,
    NotificationType,
    Preferences,
)
from services.notification.usecase.process_event import (
    ProcessNotificationEvent,
)


def _event(member="m1", ntype=NotificationType.DAILY_MORNING, title="Daily insight",
           body="A calm, grounding day.", channels=(Channel.PUSH, Channel.INAPP)):
    return NotificationEvent(member_id=member, type=ntype, title=title,
                             body=body, channels=channels)


async def _run(uc, event):
    """Await the async use case (asyncio_mode=auto handles the event loop)."""
    return await uc.execute(event)


def _uc(clock=None, prefs=None):
    store = InMemoryNotificationStore()
    sink = InMemoryChannelSink()
    pref_provider = prefs or InMemoryPreferenceProvider()
    clk = clock or InMemoryClock()
    return ProcessNotificationEvent(store=store, sink=sink, prefs=pref_provider,
                                    clock=clk), store, sink


class TestPreferences:
    def test_crisis_always_allowed_even_if_opted_out(self):
        prefs = Preferences(enabled_types=())  # opted out of everything
        assert prefs.allows(NotificationType.CRISIS_FOLLOWUP) is True

    def test_normal_type_respects_opt_out(self):
        prefs = Preferences(enabled_types=(NotificationType.DAILY_MORNING,))
        assert prefs.allows(NotificationType.WEEKLY_DIGEST) is False


class TestQuietHours:
    def test_wraps_midnight(self):
        prefs = Preferences()  # 22:00–07:00
        assert prefs.is_quiet(time(23, 30)) is True
        assert prefs.is_quiet(time(3, 0)) is True
        assert prefs.is_quiet(time(8, 0)) is False
        assert prefs.is_quiet(time(21, 59)) is False

    def test_same_day_window(self):
        prefs = Preferences(quiet_hours_start=time(13, 0),
                            quiet_hours_end=time(14, 0))
        assert prefs.is_quiet(time(13, 30)) is True
        assert prefs.is_quiet(time(12, 30)) is False

    async def test_quiet_hours_defers_non_crisis(self):
        clk = InMemoryClock(fixed_local=time(23, 30))
        uc, _, _ = _uc(clock=clk)
        result = await _run(uc, _event())
        assert result.deferred is True
        assert result.delivered is False

    async def test_crisis_bypasses_quiet_hours(self):
        clk = InMemoryClock(fixed_local=time(23, 30))
        uc, _, _ = _uc(clock=clk)
        result = await _run(uc, build_crisis_followup("m1", "US", "en"))
        assert result.delivered is True
        assert result.deferred is False


class TestFrequencyCap:
    async def test_cap_suppresses_after_limit(self):
        uc, store, _ = _uc()
        prefs = Preferences(daily_cap=2)
        uc.prefs.set_prefs("m1", prefs)
        r1 = await _run(uc, _event(title="insight 1"))
        r2 = await _run(uc, _event(title="insight 2"))
        r3 = await _run(uc, _event(title="insight 3"))
        assert r1.delivered and r2.delivered
        assert r3.accepted is False
        assert "cap" in (r3.suppressed_reason or "")

    async def test_crisis_bypasses_cap(self):
        uc, store, _ = _uc()
        prefs = Preferences(daily_cap=1)
        uc.prefs.set_prefs("m1", prefs)
        await _run(uc, _event(title="first"))  # exhausts cap
        result = await _run(uc, build_crisis_followup("m1", "US", "en"))
        assert result.delivered is True


class TestSmsOptIn:
    async def test_sms_stripped_without_opt_in(self):
        uc, _, sink = _uc()
        result = await _run(uc, _event(channels=(Channel.PUSH, Channel.SMS)))
        assert result.delivered is True
        delivered_channels = {ch for _, ch, _ in sink.deliveries}
        assert Channel.SMS not in delivered_channels
        assert Channel.PUSH in delivered_channels

    async def test_sms_delivered_with_opt_in(self):
        uc, _, sink = _uc()
        uc.prefs.set_prefs("m1", Preferences(sms_opt_in=True))
        result = await _run(uc, _event(channels=(Channel.PUSH, Channel.SMS)))
        delivered_channels = {ch for _, ch, _ in sink.deliveries}
        assert Channel.SMS in delivered_channels


class TestToneGateInPipeline:
    async def test_blocked_event_not_delivered(self):
        uc, _, sink = _uc()
        result = await _run(uc, _event(title="URGENT!!!", body="Act now!!!"))
        assert result.accepted is False
        assert result.tone_verdict.value == "block"
        assert sink.deliveries == []

    async def test_softened_event_delivered_with_calm_wording(self):
        uc, store, _ = _uc()
        result = await _run(uc, _event(title="HURRY", body="Read now!"))
        assert result.delivered is True
        assert result.tone_verdict.value == "soften"
        saved = store.all()[0]
        # Title deflated (no ALL-CAPS shouting); body pressure removed.
        assert saved.title == saved.title.title()
        assert "hurry" not in saved.body.lower()
        assert "now" not in saved.body.lower()


class TestCrisisResources:
    def test_us_resources(self):
        ev = build_crisis_followup("m1", "US", "en")
        assert ev.payload["hotline_number"] == "988"
        assert "988" in ev.body

    def test_ru_resources_localized(self):
        ev = build_crisis_followup("m1", "RU", "ru")
        assert ev.payload["hotline_number"].startswith("+7")
        assert "не одни" in ev.body or "не одни" in ev.body

    def test_unknown_country_falls_back_us(self):
        ev = build_crisis_followup("m1", "ZZ", "en")
        assert ev.payload["hotline_number"] == "988"
