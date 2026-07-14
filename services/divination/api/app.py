"""HTTP API for Divination service (порт 3011).

Endpoints:
  GET  /v1/tarot/spreads      — list available spreads
  POST /v1/tarot              — draw a spread
  POST /v1/iching             — cast a hexagram
  GET  /healthz | /readyz     — liveness/readiness

Response shapes match the BFF's existing /api/tarot and /api/iching contracts
so this Python reference is interchangeable (the BFF can proxy to it).
Errors: RFC 7807 problem+json.

Randomness uses Python's `secrets` (CSPRNG) — the equivalent of the BFF's
Web Crypto Fisher-Yates shuffle + per-card reversed coin.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.divination.domain.tarot import (
    Spread,
    SPREAD_CARD_COUNT,
    SPREAD_POSITIONS,
    TarotCard,
)
from services.divination.usecase.divination import CastIChing, DrawTarot


class TarotRequest(BaseModel):
    spread: str = Field("three", examples=["three"])
    question: Optional[str] = Field(None, max_length=500)


class IChingRequest(BaseModel):
    question: Optional[str] = Field(None, max_length=500)


@dataclass
class Dependencies:
    tarot: DrawTarot
    iching: CastIChing


def default_dependencies() -> Dependencies:
    return Dependencies(tarot=DrawTarot(), iching=CastIChing())


def _problem(status: int, slug: str, title: str, detail: str,
             instance: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"type": f"https://errors.astroos.com/{slug}", "title": title,
                 "status": status, "detail": detail, "instance": instance},
        media_type="application/problem+json",
    )


def _serialize_card(card: TarotCard, reversed_: bool, position: str) -> dict:
    from services.divination.domain.tarot_interpretations import interpretation_for
    upright_meaning, reversed_meaning = interpretation_for(card.id)
    return {
        "card": {
            "id": card.id,
            "name": card.name,
            "nameRu": card.name_ru,
            "arcana": card.arcana.value,
            "suit": card.suit.value if card.suit else None,
            "rank": card.rank,
            "element": card.element,
            "keywordsUpright": list(card.keywords_upright),
            "keywordsReversed": list(card.keywords_reversed),
            "meaningUpright": upright_meaning,
            "meaningReversed": reversed_meaning,
        },
        "reversed": reversed_,
        "position": position,
    }


def create_app(deps: Optional[Dependencies] = None) -> FastAPI:
    from services.common.observability import setup_telemetry, instrument_app
    setup_telemetry("astroos-divination")
    deps = deps or default_dependencies()
    app = FastAPI(title="AstroOS Divination", version="1.0.0",
                  docs_url="/docs", redoc_url=None)
    app.state.deps = deps

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict:
        return {"status": "alive"}

    @app.get("/readyz", tags=["meta"])
    def readyz() -> dict:
        return {"status": "ready", "deck_size": 78, "hexagrams": 64}

    @app.get("/v1/tarot/spreads", tags=["tarot"])
    def list_spreads() -> JSONResponse:
        descriptions = {
            Spread.SINGLE: "Quick guidance for the present moment",
            Spread.THREE: "Timeline spread — past, present, future",
            Spread.CELTIC: "Deep insight across ten positions",
        }
        return JSONResponse(status_code=200, content={
            "spreads": [
                {"id": s.value,
                 "name": {"single": "Single Card",
                          "three": "Past · Present · Future",
                          "celtic": "Celtic Cross"}[s.value],
                 "count": SPREAD_CARD_COUNT[s],
                 "description": descriptions[s]}
                for s in (Spread.SINGLE, Spread.THREE, Spread.CELTIC)
            ],
            "deckSize": 78,
        })

    @app.post("/v1/tarot", tags=["tarot"])
    def draw(payload: TarotRequest, request: Request) -> JSONResponse:
        try:
            spread = Spread(payload.spread)
        except ValueError:
            valid = [s.value for s in Spread]
            return _problem(422, "tarot/invalid-spread", "Invalid spread",
                            f"'{payload.spread}' is not valid. Valid: {valid}",
                            request.url.path)
        result = deps.tarot.execute(spread=spread, question=payload.question)
        return JSONResponse(status_code=200, content={
            "spread": result.spread.value,
            "cards": [_serialize_card(c.card, c.reversed, c.position)
                      for c in result.cards],
            "question": result.question,
            "deckSize": result.deck_size,
        })

    @app.post("/v1/iching", tags=["iching"])
    def cast(payload: IChingRequest, request: Request) -> JSONResponse:
        h = deps.iching.execute(question=payload.question)
        return JSONResponse(status_code=200, content={
            "hexagram": {
                "primaryNumber": h.primary_number,
                "primaryName": h.primary_name,
                "primaryNameRu": h.primary_name_ru,
                "lines": [
                    {"position": ln.position, "value": ln.value,
                     "type": ln.line_type, "changing": ln.changing}
                    for ln in h.lines
                ],
                "changingLines": list(h.changing_lines),
                "secondaryNumber": h.secondary_number,
                "secondaryName": h.secondary_name,
                "secondaryNameRu": h.secondary_name_ru,
                "judgment": {"en": h.judgment.en, "ru": h.judgment.ru},
                "image": {"en": h.image.en, "ru": h.image.ru},
            },
            "question": payload.question,
        })

    instrument_app(app)
    return app


app = create_app()
