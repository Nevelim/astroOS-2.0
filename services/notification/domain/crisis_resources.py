"""Notification domain: crisis follow-up resources (NOTIF-6).

Pure function that builds a localized crisis-follow-up notification body.
NOTIF-6 fires 24h after the AI Mentor detects a crisis (MENTOR-6 emits the
event); the follow-up re-shares current hotline resources in the member's
locale and offers a gentle check-in. The content is AUTHOR-CONTROLLED
(never user/LLM-generated), so it is exempt from tone-gate BLOCK (safety >
tone) per the tone_gate module.

The hotline numbers mirror the mentor service (services/ai_mentor/domain/
crisis.py CRISIS_HOTLINES). Kept as a local copy because Notification is a
separate bounded context — it should not import from ai_mentor's domain.
If the canonical list diverges, the integration test will catch it.
"""
from __future__ import annotations

from services.notification.domain.entities import (
    Channel,
    NotificationEvent,
    NotificationType,
)


# Localized hotline resources by country (ISO-2 → {number, name}).
# Source: public national crisis lines. Update quarterly.
CRISIS_RESOURCES: dict[str, dict[str, str]] = {
    "US": {"number": "988", "name": "988 Suicide & Crisis Lifeline"},
    "GB": {"number": "116 123", "name": "Samaritans"},
    "RU": {"number": "+7 (495) 989-50-50", "name": "Московская психологическая служба"},
    "IN": {"number": "9152987821", "name": "iCall"},
    "CN": {"number": "400-161-9995", "name": "Lifeline China"},
    "BR": {"number": "188", "name": "CVV"},
    "KZ": {"number": "150", "name": "Линия доверия"},
    "DE": {"number": "0800/1110111", "name": "Telefonseelsorge"},
    "FR": {"number": "3114", "name": "3114 Numéro national"},
    "AU": {"number": "131 114", "name": "Lifeline Australia"},
}

# Localized follow-up messages (gentle, opt-in framing).
_FOLLOWUP_BODY: dict[str, str] = {
    "en": (
        "We're thinking of you today. You deserve support, and you're not alone. "
        "If you're still struggling, please reach out — help is free and confidential."
    ),
    "ru": (
        "Мы думаем о вас сегодня. Вы заслуживаете поддержки, и вы не одни. "
        "Если вам всё ещё тяжело, пожалуйста, обратитесь за помощью — это бесплатно и конфиденциально."
    ),
    "hi": (
        "हम आज आपके बारे में सोच रहे हैं। आप सहायता के हकदार हैं, और आप अकेले नहीं हैं। "
        "अगर आप अभी भी संघर्ष कर रहे हैं, तो कृपया सहायता लें — यह मुफ़्त और गोपनीय है।"
    ),
}


def build_crisis_followup(member_id: str, country_code: str = "US",
                          language: str = "en") -> NotificationEvent:
    """Build the 24h crisis follow-up event with localized resources.

    Channels: push + in-app (never SMS without opt-in — the use case strips
    SMS if sms_opt_in is false). Crisis bypasses quiet hours + daily cap.
    """
    lang = language if language in _FOLLOWUP_BODY else "en"
    resource = CRISIS_RESOURCES.get(country_code.upper(), CRISIS_RESOURCES["US"])
    body = _FOLLOWUP_BODY[lang]
    title = {
        "en": "You're not alone",
        "ru": "Вы не одни",
        "hi": "आप अकेले नहीं हैं",
    }[lang]

    return NotificationEvent(
        member_id=member_id,
        type=NotificationType.CRISIS_FOLLOWUP,
        title=title,
        body=f"{body}\n\n{resource['name']}: {resource['number']}",
        channels=(Channel.PUSH, Channel.INAPP),
        payload={
            "country": country_code.upper(),
            "hotline_number": resource["number"],
            "hotline_name": resource["name"],
            "language": lang,
            "followup_window_h": 24,
        },
    )
