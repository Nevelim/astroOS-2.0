"""Daily Content adapters: template generator + in-memory cache.

Production swaps TemplateContentGenerator for LLMContentGenerator (calls
z-ai-web-dev-sdk / OpenAI), but the template version gives deterministic,
fast, free content for dev/test — critical for unit testing.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from services.daily_content.domain.entities import (
    ContentRitualType,
    DailyContent,
    DailyContentKey,
    SunSign,
    VoiceProfile,
)


# --------------------------------------------------------------------------- #
# Template content generator (deterministic, no LLM)
# --------------------------------------------------------------------------- #
# Per-sign horoscope templates. Seed content — production LLM overrides.
_HOROSCOPE_TEMPLATES: dict[SunSign, dict[str, str]] = {
    SunSign.ARIES: {
        "en": "Your fire burns steady today. Channel impulsiveness into a single decisive act.",
        "ru": "Ваш огонь сегодня горит ровно. Направите импульсивность в одно решительное действие.",
    },
    SunSign.TAURUS: {
        "en": "Patience pays. Slow, deliberate steps bring tangible rewards.",
        "ru": "Терпение вознаграждается. Медленные, осознанные шаги приносят ощутимые плоды.",
    },
    SunSign.GEMINI: {
        "en": "Words carry weight today. Speak truth, listen deeper.",
        "ru": "Слова сегодня имеют вес. Говорите правду, слушайте глубже.",
    },
    SunSign.CANCER: {
        "en": "Home is where your power lies. Nurture your inner sanctuary.",
        "ru": "Дом — где ваша сила. Берегите внутреннее святилище.",
    },
    SunSign.LEO: {
        "en": "Your radiance inspires. Lead with warmth, not demand.",
        "ru": "Ваше сияние вдохновляет. Ведите теплом, не требованием.",
    },
    SunSign.VIRGO: {
        "en": "Order brings clarity. The details align in your favor.",
        "ru": "Порядок приносит ясность. Детали складываются в вашу пользу.",
    },
    SunSign.LIBRA: {
        "en": "Balance is your gift. Seek harmony without losing yourself.",
        "ru": "Равновесие — ваш дар. Ищите гармонию, не теряя себя.",
    },
    SunSign.SCORPIO: {
        "en": "Depth is your power. Transform through honesty, not control.",
        "ru": "Глубина — ваша сила. Преображайтесь через честность, не контроль.",
    },
    SunSign.SAGITTARIUS: {
        "en": "Adventure calls. Expand your horizon by one new idea.",
        "ru": "Приключение зовёт. Расширьте горизонт одной новой идеей.",
    },
    SunSign.CAPRICORN: {
        "en": "Discipline builds mountains. One stone at a time.",
        "ru": "Дисциплина строит горы. По одному камню за раз.",
    },
    SunSign.AQUARIUS: {
        "en": "Innovation flows through you. Trust the unconventional.",
        "ru": "Через вас течёт новаторство. Доверьтесь нестандартному.",
    },
    SunSign.PISCES: {
        "en": "Compassion is your compass. Feel deeply, act gently.",
        "ru": "Сострадание — ваш компас. Чувствуйте глубоко, действуйте мягко.",
    },
}

_AFFIRMATION_TEMPLATES: dict[SunSign, dict[str, str]] = {
    SunSign.ARIES: {"en": "I am the spark that ignites change.", "ru": "Я — искра, зажигающая перемен."},
    SunSign.TAURUS: {"en": "I am grounded in abundance.", "ru": "Я укоренён в изобилии."},
    SunSign.GEMINI: {"en": "My voice creates connection.", "ru": "Мой голос создаёт связь."},
    SunSign.CANCER: {"en": "I honor my feelings as guidance.", "ru": "Я чту свои чувства как проводник."},
    SunSign.LEO: {"en": "I shine without dimming others.", "ru": "Я сияю, не затмевая других."},
    SunSign.VIRGO: {"en": "I trust the process of refinement.", "ru": "Я доверяю процессу совершенствования."},
    SunSign.LIBRA: {"en": "I am the harmony I seek.", "ru": "Я — гармония, которую ищу."},
    SunSign.SCORPIO: {"en": "I transform through truth.", "ru": "Я преображаюсь через правду."},
    SunSign.SAGITTARIUS: {"en": "I am free to expand.", "ru": "Я свободен расширяться."},
    SunSign.CAPRICORN: {"en": "I build with patience and power.", "ru": "Я строю с терпением и силой."},
    SunSign.AQUARIUS: {"en": "I am the future I imagine.", "ru": "Я — будущее, которое воображаю."},
    SunSign.PISCES: {"en": "I flow with cosmic compassion.", "ru": "Я теку с космическим состраданием."},
}


class TemplateContentGenerator:
    """Deterministic content from templates. No LLM, no I/O."""

    def generate(self, key: DailyContentKey,
                 ritual_type: ContentRitualType) -> str:
        lang = key.language if key.language in ("en", "ru") else "en"
        sign = key.sun_sign

        if ritual_type == ContentRitualType.HOROSCOPE:
            tmpl = _HOROSCOPE_TEMPLATES.get(sign, {})
            body = tmpl.get(lang, tmpl.get("en", ""))
        elif ritual_type == ContentRitualType.AFFIRMATION:
            tmpl = _AFFIRMATION_TEMPLATES.get(sign, {})
            body = tmpl.get(lang, tmpl.get("en", ""))
        else:
            body = f"{ritual_type.value} for {sign.value} ({lang})"

        # Voice modulation: prefix for non-calm voices.
        if key.voice == VoiceProfile.WITTY and lang == "en":
            body = "✨ " + body
        elif key.voice == VoiceProfile.TRAUMA and lang == "en":
            body = "🤍 " + body
        return body


# --------------------------------------------------------------------------- #
# In-memory cache (dev). Production: Redis DB5.
# --------------------------------------------------------------------------- #
class InMemoryContentCache:
    def __init__(self) -> None:
        self._store: dict[str, DailyContent] = {}

    async def get(self, bucket_id: str,
                  ritual_type: ContentRitualType) -> Optional[DailyContent]:
        return self._store.get(f"{bucket_id}:{ritual_type.value}")

    async def set(self, content: DailyContent) -> None:
        key = f"{content.key.bucket_id()}:{content.ritual_type.value}"
        self._store[key] = content
