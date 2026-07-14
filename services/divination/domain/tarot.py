"""Tarot domain: Rider-Waite-Smith 78-card deck, spreads, pure draw logic.

Pure domain — no I/O. Defines the canonical deck (matches the BFF's
TarotDeck.ts so results are interchangeable), the three spreads (single /
three / celtic), and a cryptographically-secure draw using `secrets` (the
Python equivalent of the BFF's Web Crypto Fisher-Yates shuffle + per-card
reversed coin).

Fixes carried over from the BFF TS implementation:
  - "penticles" typo → "pentacles" everywhere.
  - Court reversed-keywords prefix unified ("shadow " like the BFF).

The deck is built once at import; draw_tarot() shuffles a fresh copy each call.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Arcana(str, Enum):
    MAJOR = "major"
    MINOR = "minor"


class Suit(str, Enum):
    WANDS = "wands"
    CUPS = "cups"
    SWORDS = "swords"
    PENTACLES = "pentacles"   # corrected from BFF typo "penticles"


class Spread(str, Enum):
    SINGLE = "single"
    THREE = "three"
    CELTIC = "celtic"


SPREAD_CARD_COUNT: dict[Spread, int] = {
    Spread.SINGLE: 1,
    Spread.THREE: 3,
    Spread.CELTIC: 10,
}

SPREAD_POSITIONS: dict[Spread, tuple[str, ...]] = {
    Spread.SINGLE: ("Present",),
    Spread.THREE: ("Past", "Present", "Future"),
    Spread.CELTIC: (
        "Present", "Challenge", "Foundation", "Recent Past",
        "Possible Outcome", "Near Future", "Self", "Environment",
        "Hopes & Fears", "Final Outcome",
    ),
}


@dataclass(frozen=True)
class TarotCard:
    id: int                       # 0..77
    name: str                     # English
    name_ru: str                  # Russian
    arcana: Arcana
    suit: Optional[Suit]          # None for Major
    rank: int                     # 0..21 Major, 1..14 Minor (11=Page..14=King)
    keywords_upright: tuple[str, ...]
    keywords_reversed: tuple[str, ...]
    element: str                  # Fire/Water/Air/Earth/Spirit


@dataclass(frozen=True)
class DrawnCard:
    card: TarotCard
    reversed: bool
    position: str


@dataclass(frozen=True)
class TarotDrawResult:
    spread: Spread
    cards: tuple[DrawnCard, ...]
    question: Optional[str] = None
    deck_size: int = 78


# --------------------------------------------------------------------------- #
# Major Arcana (22 cards) — names EN/RU + keywords
# --------------------------------------------------------------------------- #
_MAJOR: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("The Fool", "Шут", ("beginnings", "innocence", "spontaneity")),
    ("The Magician", "Маг", ("manifestation", "willpower", "skill")),
    ("The High Priestess", "Верховная Жрица", ("intuition", "mystery", "subconscious")),
    ("The Empress", "Императрица", ("abundance", "nurturing", "fertility")),
    ("The Emperor", "Император", ("authority", "structure", "control")),
    ("The Hierophant", "Иерофант", ("tradition", "spirituality", "conformity")),
    ("The Lovers", "Влюблённые", ("love", "harmony", "choices")),
    ("The Chariot", "Колесница", ("determination", "willpower", "victory")),
    ("Strength", "Сила", ("courage", "patience", "inner power")),
    ("The Hermit", "Отшельник", ("introspection", "solitude", "guidance")),
    ("Wheel of Fortune", "Колесо Фортуны", ("change", "cycles", "fate")),
    ("Justice", "Справедливость", ("truth", "fairness", "law")),
    ("The Hanged Man", "Повешенный", ("surrender", "new perspective", "pause")),
    ("Death", "Смерть", ("endings", "transformation", "transition")),
    ("Temperance", "Умеренность", ("balance", "moderation", "patience")),
    ("The Devil", "Дьявол", ("bondage", "materialism", "shadow")),
    ("The Tower", "Башня", ("upheaval", "revelation", "awakening")),
    ("The Star", "Звезда", ("hope", "inspiration", "renewal")),
    ("The Moon", "Луна", ("illusion", "fear", "intuition")),
    ("The Sun", "Солнце", ("joy", "success", "vitality")),
    ("Judgement", "Суд", ("rebirth", "reflection", "absolution")),
    ("The World", "Мир", ("completion", "fulfillment", "wholeness")),
)


def _build_deck() -> tuple[TarotCard, ...]:
    cards: list[TarotCard] = []
    # Major Arcana
    for i, (name, name_ru, kw) in enumerate(_MAJOR):
        cards.append(TarotCard(
            id=i, name=name, name_ru=name_ru,
            arcana=Arcana.MAJOR, suit=None, rank=i,
            keywords_upright=kw,
            keywords_reversed=tuple(f"blocked {k}" for k in kw),
            element="Spirit",
        ))
    # Minor Arcana: 4 suits × 14
    suit_element = {Suit.WANDS: "Fire", Suit.CUPS: "Water",
                    Suit.SWORDS: "Air", Suit.PENTACLES: "Earth"}
    suit_ru = {Suit.WANDS: "Жезлы", Suit.CUPS: "Кубки",
               Suit.SWORDS: "Мечи", Suit.PENTACLES: "Пентакли"}
    ranks_ru = {1: "Туз", 11: "Паж", 12: "Рыцарь", 13: "Королева", 14: "Король"}
    card_id = 22
    for suit in (Suit.WANDS, Suit.CUPS, Suit.SWORDS, Suit.PENTACLES):
        for rank in range(1, 15):
            if rank <= 10:
                num_ru = ranks_ru.get(rank, str(rank))
                name = f"{_rank_word(rank)} of {_suit_word(suit)}"
                name_ru = f"{num_ru} {suit_ru[suit]}"
                kw = _pip_keywords(suit, rank)
                reversed_kw = tuple(f"blocked {k}" for k in kw)
            else:
                title = _court_word(rank)
                name = f"{title} of {_suit_word(suit)}"
                name_ru = f"{ranks_ru[rank]} {suit_ru[suit]}"
                kw = _court_keywords(suit, rank)
                reversed_kw = tuple(f"shadow {k}" for k in kw)
            cards.append(TarotCard(
                id=card_id, name=name, name_ru=name_ru,
                arcana=Arcana.MINOR, suit=suit, rank=rank,
                keywords_upright=kw, keywords_reversed=reversed_kw,
                element=suit_element[suit],
            ))
            card_id += 1
    return tuple(cards)


def _rank_word(rank: int) -> str:
    return {1: "Ace", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six",
            7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten"}[rank]


def _suit_word(suit: Suit) -> str:
    return suit.value.capitalize()


def _court_word(rank: int) -> str:
    return {11: "Page", 12: "Knight", 13: "Queen", 14: "King"}[rank]


def _pip_keywords(suit: Suit, rank: int) -> tuple[str, ...]:
    # Compact representative keywords per suit (kept short for the dev ref).
    base = {
        Suit.WANDS: ("passion", "energy", "action"),
        Suit.CUPS: ("emotion", "intuition", "connection"),
        Suit.SWORDS: ("intellect", "conflict", "clarity"),
        Suit.PENTACLES: ("resources", "stability", "growth"),
    }[suit]
    if rank == 1:
        return base
    return tuple(f"{base[i % 3]}" for i in range(3))


def _court_keywords(suit: Suit, rank: int) -> tuple[str, ...]:
    role = {11: ("eager", "curious"), 12: ("driven", "questing"),
            13: ("caring", "receptive"), 14: ("masterful", "grounded")}[rank]
    return role


TAROT_DECK: tuple[TarotCard, ...] = _build_deck()
_DECK_BY_ID: dict[int, TarotCard] = {c.id: c for c in TAROT_DECK}


# --------------------------------------------------------------------------- #
# Pure draw logic (CSPRNG)
# --------------------------------------------------------------------------- #
def draw_tarot(spread: Spread = Spread.THREE,
               question: Optional[str] = None,
               rng: Optional[object] = None) -> TarotDrawResult:
    """Shuffle a fresh copy of the deck and draw the spread.

    `rng` is an optional secrets-compatible module (for deterministic tests).
    Production passes nothing → uses the `secrets` module (CSPRNG).
    """
    r = rng or secrets
    count = SPREAD_CARD_COUNT[spread]
    positions = SPREAD_POSITIONS[spread]

    # Fisher-Yates shuffle of card ids.
    ids = list(_DECK_BY_ID.keys())
    for i in range(len(ids) - 1, 0, -1):
        j = r.randbelow(i + 1)
        ids[i], ids[j] = ids[j], ids[i]

    drawn: list[DrawnCard] = []
    for i in range(count):
        card = _DECK_BY_ID[ids[i]]
        reversed_ = bool(r.randbelow(2))  # 0 or 1, independent per card
        pos = positions[i] if i < len(positions) else f"Position {i + 1}"
        drawn.append(DrawnCard(card=card, reversed=reversed_, position=pos))
    return TarotDrawResult(spread=spread, cards=tuple(drawn),
                           question=question, deck_size=len(TAROT_DECK))
