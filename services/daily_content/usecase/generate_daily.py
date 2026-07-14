"""Daily Content use case: generate horoscope + affirmation for a bucket.

Orchestrates the ContentGenerator port (LLM/template) with the cache.
Production: batch job at 02:00 UTC generates all buckets for the day.
On-demand: single bucket generation for premium users.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol

from services.daily_content.domain.entities import (
    ContentRitualType,
    DailyContent,
    DailyContentKey,
)


class ContentGenerator(Protocol):
    """Port: produces text content for a bucket key."""

    def generate(self, key: DailyContentKey,
                 ritual_type: ContentRitualType) -> str:
        ...  # pragma: no cover


class ContentCache(Protocol):
    """Port: immutable content store keyed by bucket_id + ritual_type."""

    async def get(self, bucket_id: str, ritual_type: ContentRitualType) -> Optional[DailyContent]:
        ...  # pragma: no cover

    async def set(self, content: DailyContent) -> None:
        ...  # pragma: no cover


@dataclass
class GenerateDailyContent:
    generator: ContentGenerator
    cache: ContentCache
    engine_version: str = "daily-v1"

    async def execute(
        self, key: DailyContentKey,
        ritual_type: ContentRitualType = ContentRitualType.HOROSCOPE,
    ) -> DailyContent:
        # 1. Cache check (immutable for the day)
        cached = await self.cache.get(key.bucket_id(), ritual_type)
        if cached is not None:
            return cached

        # 2. Generate
        body = self.generator.generate(key, ritual_type)
        title = _default_title(key, ritual_type)
        from datetime import datetime, timezone
        content = DailyContent(
            key=key,
            ritual_type=ritual_type,
            title=title,
            body=body,
            generated_at=datetime.now(timezone.utc).isoformat(),
            engine_version=self.engine_version,
        )

        # 3. Cache (24h TTL — content is daily)
        await self.cache.set(content)
        return content


def _default_title(key: DailyContentKey, ritual_type: ContentRitualType) -> str:
    sign_name = key.sun_sign.value.title()
    if ritual_type == ContentRitualType.HOROSCOPE:
        return f"Horoscope for {sign_name}"
    if ritual_type == ContentRitualType.AFFIRMATION:
        return f"Affirmation for {sign_name}"
    return f"{ritual_type.value.title()} for {sign_name}"
