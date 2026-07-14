"""Unit + integration tests for Daily Content service."""
from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient

from services.daily_content.adapter.generators import (
    InMemoryContentCache,
    TemplateContentGenerator,
)
from services.daily_content.domain.entities import (
    ContentRitualType,
    DailyContentKey,
    SunSign,
    VoiceProfile,
)
from services.daily_content.usecase.generate_daily import GenerateDailyContent
from services.daily_content.api.app import create_app, default_dependencies


# --------------------------------------------------------------------------- #
# Domain unit tests
# --------------------------------------------------------------------------- #
class TestDailyContentKey:
    def test_bucket_id_deterministic(self):
        k = DailyContentKey(date(2026, 7, 14), SunSign.ARIES, VoiceProfile.CALM, "ru")
        assert k.bucket_id() == "2026-07-14:aries:calm:ru:default"

    def test_different_sign_different_bucket(self):
        k1 = DailyContentKey(date(2026, 7, 14), SunSign.ARIES, VoiceProfile.CALM, "ru")
        k2 = DailyContentKey(date(2026, 7, 14), SunSign.TAURUS, VoiceProfile.CALM, "ru")
        assert k1.bucket_id() != k2.bucket_id()


class TestTemplateGenerator:
    def setup_method(self):
        self.gen = TemplateContentGenerator()

    def test_aries_horoscope_ru(self):
        k = DailyContentKey(date(2026, 7, 14), SunSign.ARIES, VoiceProfile.CALM, "ru")
        body = self.gen.generate(k, ContentRitualType.HOROSCOPE)
        assert "Овен" in body or "огонь" in body.lower() or "импульс" in body.lower()

    def test_aries_horoscope_en(self):
        k = DailyContentKey(date(2026, 7, 14), SunSign.ARIES, VoiceProfile.CALM, "en")
        body = self.gen.generate(k, ContentRitualType.HOROSCOPE)
        assert "fire" in body.lower() or "impulsiveness" in body.lower()

    def test_affirmation_for_pisces(self):
        k = DailyContentKey(date(2026, 7, 14), SunSign.PISCES, VoiceProfile.CALM, "en")
        body = self.gen.generate(k, ContentRitualType.AFFIRMATION)
        assert "compassion" in body.lower()

    def test_unknown_lang_falls_back_to_en(self):
        k = DailyContentKey(date(2026, 7, 14), SunSign.LEO, VoiceProfile.CALM, "fr")
        body = self.gen.generate(k, ContentRitualType.HOROSCOPE)
        # Should return English fallback
        assert len(body) > 10

    def test_all_signs_have_ru_and_en(self):
        for sign in SunSign:
            for lang in ("ru", "en"):
                k = DailyContentKey(date(2026, 7, 14), sign, VoiceProfile.CALM, lang)
                body = self.gen.generate(k, ContentRitualType.HOROSCOPE)
                assert len(body) > 10, f"empty content for {sign.value}/{lang}"


# --------------------------------------------------------------------------- #
# Use case tests (with cache)
# --------------------------------------------------------------------------- #
class TestGenerateDailyContent:
    @pytest.mark.asyncio
    async def test_generates_and_caches(self):
        cache = InMemoryContentCache()
        uc = GenerateDailyContent(
            generator=TemplateContentGenerator(),
            cache=cache,
        )
        key = DailyContentKey(date(2026, 7, 14), SunSign.ARIES, VoiceProfile.CALM, "ru")
        c1 = await uc.execute(key, ContentRitualType.HOROSCOPE)
        assert c1.body
        # Second call → cached
        c2 = await uc.execute(key, ContentRitualType.HOROSCOPE)
        assert c2.body == c1.body


# --------------------------------------------------------------------------- #
# API integration tests
# --------------------------------------------------------------------------- #
class TestDailyAPI:
    @pytest.fixture
    def client(self):
        return TestClient(create_app(default_dependencies()))

    def test_health(self, client):
        assert client.get("/healthz").json() == {"status": "alive"}

    def test_horoscope_aries_ru(self, client):
        r = client.get("/v1/daily/aries", params={"lang": "ru", "date": "2026-07-14"})
        assert r.status_code == 200
        body = r.json()
        assert body["sun_sign"] == "aries"
        assert body["language"] == "ru"
        assert len(body["body"]) > 10

    def test_affirmation_pisces_en(self, client):
        r = client.get("/v1/daily/pisces/affirmation", params={"lang": "en"})
        assert r.status_code == 200
        # The affirmation is now transit-generated (dynamic), so we verify
        # structural properties rather than a fixed template word.
        body = r.json()["body"]
        assert len(body) > 5
        assert body[0].isupper()  # starts with a capital (sentence)

    def test_invalid_sign_404(self, client):
        r = client.get("/v1/daily/invalidsign")
        assert r.status_code == 422  # FastAPI enum validation
