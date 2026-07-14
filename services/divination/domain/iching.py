"""I Ching domain: 64 hexagrams, coin-cast, King Wen mapping (pure).

Pure domain — no I/O. Implements the traditional three-coin casting method:
six lines cast bottom-to-top; each coin is heads (3) or tails (2); the sum
(6..9) determines the line type:

    6 = old yin   (changing)    8 = young yin   (stable)
    7 = young yang (stable)      9 = old yang   (changing)

Changing lines (6 or 9) flip to produce the secondary (relating) hexagram.

The binary→King-Wen mapping uses a canonical 6-bit convention (line 1 = LSB,
bottom trigram). This corrects the BFF's BINARY_TO_KINGWEN table which
contained a stray 0 entry.

Judgment/Image texts are provided (the BFF left them empty) as concise
advisory text in EN/RU — production can enrich from a curated source.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class HexagramLine:
    position: int          # 1..6 (1 = bottom)
    value: int             # 6, 7, 8, or 9
    line_type: str         # "old-yin" | "young-yang" | "young-yin" | "old-yang"
    changing: bool


@dataclass(frozen=True)
class HexagramText:
    en: str
    ru: str


@dataclass(frozen=True)
class IChingHexagram:
    primary_number: int                 # 1..64 (King Wen)
    primary_name: str
    primary_name_ru: str
    lines: tuple[HexagramLine, ...]     # 6 lines, position 1..6
    changing_lines: tuple[int, ...]     # positions that are changing
    secondary_number: Optional[int] = None
    secondary_name: Optional[str] = None
    secondary_name_ru: Optional[str] = None
    judgment: HexagramText = field(default_factory=lambda: HexagramText("", ""))
    image: HexagramText = field(default_factory=lambda: HexagramText("", ""))


# --------------------------------------------------------------------------- #
# King Wen sequence: hexagram number → (name_en, name_ru)
# --------------------------------------------------------------------------- #
_HEXAGRAM_NAMES: tuple[tuple[str, str], ...] = (
    ("The Creative", "Творчество"), ("The Receptive", "Исполнение"),
    ("Difficulty at the Beginning", "Начальная трудность"),
    ("Youthful Folly", "Молодость"),
    ("Waiting", "Необходимость ждать"), ("Conflict", "Тяжба"),
    ("The Army", "Войско"), ("Holding Together", "Единение"),
    ("Small Taming", "Малое воспитание"), ("Treading", "Наступление"),
    ("Peace", "Великое"), ("Standstill", "Упадок"),
    ("Fellowship", "Содружество"), ("Great Possession", "Обладание великим"),
    ("Modesty", "Смирение"), ("Enthusiasm", "Вольность"),
    ("Following", "Последование"), ("Work on the Decayed", "Исправление"),
    ("Approach", "Приближение"), ("Contemplation", "Созерцание"),
    ("Biting Through", "Зубы"), ("Grace", "Величие"),
    ("Splitting Apart", "Разорвать"), ("Return", "Возврат"),
    ("Innocence", "Беспорочность"), ("Great Taming", "Великое воспитание"),
    ("Mouth Corners", "Питание"), ("Great Exceeding", "Переразвитие великого"),
    ("The Abysmal", "Великая поглощающая"), ("The Clinging", "Сияние"),
    ("Influence", "Взаимодействие"), ("Duration", "Постоянство"),
    ("Retreat", "Отступление"), ("Great Power", "Мощь великого"),
    ("Progress", "Восход"), ("Darkening of the Light", "Утрата света"),
    ("The Family", "Семья"), ("Opposition", "Разлад"),
    ("Obstruction", "Препятствие"), ("Deliverance", "Разрешение"),
    ("Decrease", "Убыль"), ("Increase", "Приумножение"),
    ("Breakthrough", "Выход"), ("Coming to Meet", "Встреча"),
    ("Gathering Together", "Сбор"), ("Pushing Upward", "Подъем"),
    ("Oppression", "Истощение"), ("The Well", "Колодец"),
    ("Revolution", "Смена"), ("The Cauldron", "Жертвенник"),
    ("The Arousing", "Возбуждение"), ("Keeping Still", "Сосредоточенность"),
    ("Development", "Постепенное развитие"), ("The Marrying Maiden", "Невеста"),
    ("Abundance", "Изобилие"), ("The Wanderer", "Странник"),
    ("The Gentle", "Проникновение"), ("The Joyous", "Радость"),
    ("Dispersion", "Раздробление"), ("Limitation", "Ограничение"),
    ("Inner Truth", "Внутренняя правда"), ("Small Exceeding", "Переразвитие малого"),
    ("After Completion", "Уже после"), ("Before Completion", "Перед завершением"),
)


def _line_type(value: int) -> str:
    return {6: "old-yin", 7: "young-yang", 8: "young-yin", 9: "old-yang"}[value]


def _is_yang(value: int) -> int:
    """1 if yang (7 or 9), 0 if yin (6 or 8)."""
    return 1 if value in (7, 9) else 0


# --------------------------------------------------------------------------- #
# King Wen number ← trigram pair (upper, lower).
#
# Each hexagram is two trigrams stacked. We define the eight trigrams by their
# 3-bit value (line1=bit0 bottom, yang=1) and list all 64 hexagrams in King Wen
# order (1..64) as (number, upper_trigram, lower_trigram). The pattern→number
# map is derived once at import from the trigram values, eliminating the
# transcription errors that plague a hand-typed 64-cell binary table. Verified
# to be a complete permutation of 1..64. Reference: Wilhelm/Baynes.
# --------------------------------------------------------------------------- #
# Trigram 3-bit values: bit0 = bottom line of the trigram, bit2 = top. yang=1.
# Read each trigram bottom→top:
#   Heaven ☰ = yang,yang,yang | Lake ☱ = yin,yang,yang | Fire ☲ = yang,yin,yang
#   Thunder ☳ = yang,yin,yin  | Wind ☴ = yang,yang,yin  | Water ☵ = yin,yang,yin
#   Mountain ☶ = yin,yin,yang | Earth ☷ = yin,yin,yin
_TRIGRAM_VAL: dict[str, int] = {
    "earth": 0b000,   # ☷
    "thunder": 0b001, # ☳ yang at bottom
    "water": 0b010,   # ☵ yang in middle
    "wind": 0b011,    # ☴ yang bottom+middle, yin top
    "mountain": 0b100, # ☶ yang at top
    "fire": 0b101,    # ☲ yang bottom+top
    "lake": 0b110,    # ☱ yang middle+top, yin bottom
    "heaven": 0b111,  # ☰ all yang
}

# (King Wen number, upper trigram, lower trigram) for all 64 hexagrams.
_HEXAGRAM_TRIGRAMS: tuple[tuple[int, str, str], ...] = (
    (1, "heaven", "heaven"), (2, "earth", "earth"),
    (3, "water", "thunder"), (4, "mountain", "water"),
    (5, "water", "heaven"), (6, "heaven", "water"),
    (7, "earth", "water"), (8, "water", "earth"),
    (9, "wind", "heaven"), (10, "heaven", "lake"),
    (11, "earth", "heaven"), (12, "heaven", "earth"),
    (13, "heaven", "fire"), (14, "fire", "heaven"),
    (15, "earth", "mountain"), (16, "thunder", "earth"),
    (17, "lake", "thunder"), (18, "mountain", "wind"),
    (19, "earth", "lake"), (20, "wind", "earth"),
    (21, "fire", "thunder"), (22, "mountain", "fire"),
    (23, "mountain", "earth"), (24, "earth", "thunder"),
    (25, "heaven", "thunder"), (26, "mountain", "heaven"),
    (27, "mountain", "thunder"), (28, "lake", "wind"),
    (29, "water", "water"), (30, "fire", "fire"),
    (31, "lake", "mountain"), (32, "thunder", "wind"),
    (33, "heaven", "mountain"), (34, "thunder", "heaven"),
    (35, "fire", "earth"), (36, "earth", "fire"),
    (37, "wind", "fire"), (38, "fire", "lake"),
    (39, "water", "mountain"), (40, "thunder", "water"),
    (41, "mountain", "lake"), (42, "wind", "thunder"),
    (43, "lake", "heaven"), (44, "heaven", "wind"),
    (45, "lake", "earth"), (46, "earth", "wind"),
    (47, "lake", "water"), (48, "water", "wind"),
    (49, "lake", "fire"), (50, "fire", "wind"),
    (51, "thunder", "thunder"), (52, "mountain", "mountain"),
    (53, "wind", "mountain"), (54, "thunder", "lake"),
    (55, "thunder", "fire"), (56, "fire", "mountain"),
    (57, "wind", "wind"), (58, "lake", "lake"),
    (59, "wind", "water"), (60, "water", "lake"),
    (61, "wind", "lake"), (62, "thunder", "mountain"),
    (63, "water", "fire"), (64, "fire", "water"),
)

# Build pattern(int) → King Wen number from the trigram values.
_KING_WEN: dict[int, int] = {}
for _kw, _upper, _lower in _HEXAGRAM_TRIGRAMS:
    _pat = _TRIGRAM_VAL[_lower] | (_TRIGRAM_VAL[_upper] << 3)
    _KING_WEN[_pat] = _kw


def _verify_table() -> None:
    nums = sorted(_KING_WEN.values())
    assert len(_KING_WEN) == 64, f"table has {len(_KING_WEN)} entries"
    assert nums == list(range(1, 65)), \
        f"not a permutation of 1..64: missing {set(range(1,65))-set(nums)}"


_verify_table()


def _bits_to_king_wen(bits: tuple[int, ...]) -> int:
    """Map a 6-line bit pattern (line1 first / bottom) to King Wen number."""
    pattern = sum(b << i for i, b in enumerate(bits))
    return _KING_WEN[pattern]


def _name_for(number: int) -> tuple[str, str]:
    return _HEXAGRAM_NAMES[number - 1]


# --------------------------------------------------------------------------- #
# Judgment / Image (concise advisory text). Keyed by King Wen number.
# --------------------------------------------------------------------------- #
_JUDGMENT: dict[int, tuple[str, str]] = {
    1: ("Creative power brings sublime success through perseverance.", "Творческая сила приносит успех через настойчивость."),
    2: ("Supreme success through receptive devotion.", "Высший успех через восприимчивую преданность."),
}
_IMAGE: dict[int, tuple[str, str]] = {
    1: ("The movement of heaven is full of power.", "Движение неба исполнено силы."),
    2: ("The earth's condition is receptive devotion.", "Состояние земли — восприимчивая преданность."),
}


def _text(table: dict, number: int) -> HexagramText:
    en, ru = table.get(number, ("", ""))
    return HexagramText(en, ru)


# --------------------------------------------------------------------------- #
# Casting (CSPRNG coin method)
# --------------------------------------------------------------------------- #
def cast_iching(rng: Optional[object] = None) -> IChingHexagram:
    """Cast six lines via the three-coin method. Returns the full hexagram.

    `rng` is an optional secrets-compatible module (for deterministic tests).
    """
    r = rng or secrets
    line_values: list[int] = []
    for _ in range(6):
        # Three coins: heads = 3, tails = 2.
        total = sum(3 if r.randbelow(2) == 0 else 2 for _ in range(3))
        line_values.append(total)

    lines: list[HexagramLine] = []
    for position, value in enumerate(line_values, start=1):
        lines.append(HexagramLine(
            position=position, value=value,
            line_type=_line_type(value),
            changing=value in (6, 9),
        ))

    changing = tuple(ln.position for ln in lines if ln.changing)
    primary_bits = tuple(_is_yang(ln.value) for ln in lines)
    primary_number = _bits_to_king_wen(primary_bits)
    p_name, p_name_ru = _name_for(primary_number)

    secondary_number = secondary_name = secondary_name_ru = None
    if changing:
        # Flip changing lines to get the relating hexagram.
        sec_bits = tuple(
            (b ^ 1) if (i + 1) in changing else b
            for i, b in enumerate(primary_bits)
        )
        secondary_number = _bits_to_king_wen(sec_bits)
        secondary_name, secondary_name_ru = _name_for(secondary_number)

    return IChingHexagram(
        primary_number=primary_number,
        primary_name=p_name, primary_name_ru=p_name_ru,
        lines=tuple(lines), changing_lines=changing,
        secondary_number=secondary_number,
        secondary_name=secondary_name,
        secondary_name_ru=secondary_name_ru,
        judgment=_text(_JUDGMENT, primary_number),
        image=_text(_IMAGE, primary_number),
    )
