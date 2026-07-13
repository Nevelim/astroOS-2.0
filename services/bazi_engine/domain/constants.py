"""BaZi domain: fundamental constants — Heavenly Stems, Earthly Branches,
Five Elements, and their canonical relations.

These are the classical, unchanging tables of Chinese metaphysics. They have
no I/O, no time, no randomness — pure reference data. Putting them in a
separate module lets the rest of the domain import them without pulling in
any calculation logic.

Conventions:
  - Indices follow the classical order (0-based in Python).
  - Stems cycle 甲(0)…癸(9); Branches 子(0)…亥(11).
  - A pillar (干支) is the simultaneous stem+branch advancing by one — so only
    60 of the 120 combinations ever appear (the "sexagenary cycle").
"""
from __future__ import annotations

from enum import Enum


# --------------------------------------------------------------------------- #
# Five Elements (五行)
# --------------------------------------------------------------------------- #
class Element(str, Enum):
    WOOD = "wood"      # 木
    FIRE = "fire"      # 火
    EARTH = "earth"    # 土
    METAL = "metal"    # 金
    WATER = "water"    # 水


# Generating (生) and controlling (克) cycles — the heart of BaZi relations.
GENERATING_CYCLE: tuple[Element, Element] = (
    (Element.WOOD, Element.FIRE),     # 木生火
    (Element.FIRE, Element.EARTH),    # 火生土
    (Element.EARTH, Element.METAL),   # 土生金
    (Element.METAL, Element.WATER),   # 金生水
    (Element.WATER, Element.WOOD),    # 水生木
)
CONTROLLING_CYCLE: tuple[Element, Element] = (
    (Element.WOOD, Element.EARTH),    # 木克土
    (Element.EARTH, Element.WATER),   # 土克水
    (Element.WATER, Element.FIRE),    # 水克火
    (Element.FIRE, Element.METAL),    # 火克金
    (Element.METAL, Element.WOOD),    # 金克木
)


# --------------------------------------------------------------------------- #
# Yin / Yang (阴阳)
# --------------------------------------------------------------------------- #
class Polarity(str, Enum):
    YANG = "yang"
    YIN = "yin"


# --------------------------------------------------------------------------- #
# Heavenly Stems (十天干)
# --------------------------------------------------------------------------- #
class Stem(str, Enum):
    JIA = "jia"    # 甲  yang wood
    YI = "yi"      # 乙  yin  wood
    BING = "bing"  # 丙  yang fire
    DING = "ding"  # 丁  yin  fire
    WU = "wu"      # 戊  yang earth
    JI = "ji"      # 己  yin  earth
    GENG = "geng"  # 庚  yang metal
    XIN = "xin"    # 辛  yin  metal
    REN = "ren"    # 壬  yang water
    GUI = "gui"    # 癸  yin  water


# Ordered tuple — index = canonical stem number 0..9.
STEMS: tuple[Stem, ...] = (
    Stem.JIA, Stem.YI, Stem.BING, Stem.DING, Stem.WU,
    Stem.JI,  Stem.GENG, Stem.XIN, Stem.REN, Stem.GUI,
)

# Each stem's element + polarity — the load-bearing attributes.
STEM_ELEMENT: dict[Stem, Element] = {
    Stem.JIA: Element.WOOD, Stem.YI: Element.WOOD,
    Stem.BING: Element.FIRE, Stem.DING: Element.FIRE,
    Stem.WU: Element.EARTH, Stem.JI: Element.EARTH,
    Stem.GENG: Element.METAL, Stem.XIN: Element.METAL,
    Stem.REN: Element.WATER, Stem.GUI: Element.WATER,
}
STEM_POLARITY: dict[Stem, Polarity] = {
    # Even index → yang, odd index → yin.
    s: (Polarity.YANG if i % 2 == 0 else Polarity.YIN)
    for i, s in enumerate(STEMS)
}

# Hanzi / Unicode for display layer.
STEM_HANZI: dict[Stem, str] = {
    Stem.JIA: "甲", Stem.YI: "乙", Stem.BING: "丙", Stem.DING: "丁",
    Stem.WU: "戊", Stem.JI: "己", Stem.GENG: "庚", Stem.XIN: "辛",
    Stem.REN: "壬", Stem.GUI: "癸",
}


# --------------------------------------------------------------------------- #
# Earthly Branches (十二地支)
# --------------------------------------------------------------------------- #
class Branch(str, Enum):
    ZI = "zi"      # 子
    CHOU = "chou"  # 丑
    YIN = "yin"    # 寅
    MAO = "mao"    # 卯
    CHEN = "chen"  # 辰
    SI = "si"      # 巳
    WU = "wu"      # 午
    WEI = "wei"    # 未
    SHEN = "shen"  # 申
    YOU = "you"    # 酉
    XU = "xu"      # 戌
    HAI = "hai"    # 亥


BRANCHES: tuple[Branch, ...] = (
    Branch.ZI, Branch.CHOU, Branch.YIN, Branch.MAO, Branch.CHEN, Branch.SI,
    Branch.WU, Branch.WEI, Branch.SHEN, Branch.YOU, Branch.XU, Branch.HAI,
)

# Each branch's primary element (地支藏干本气 — simplified to dominant element).
BRANCH_ELEMENT: dict[Branch, Element] = {
    Branch.ZI: Element.WATER,  Branch.CHOU: Element.EARTH,
    Branch.YIN: Element.WOOD,  Branch.MAO: Element.WOOD,
    Branch.CHEN: Element.EARTH, Branch.SI: Element.FIRE,
    Branch.WU: Element.FIRE,   Branch.WEI: Element.EARTH,
    Branch.SHEN: Element.METAL, Branch.YOU: Element.METAL,
    Branch.XU: Element.EARTH,  Branch.HAI: Element.WATER,
}
BRANCH_POLARITY: dict[Branch, Polarity] = {
    Branch.ZI: Polarity.YANG, Branch.CHOU: Polarity.YIN,
    Branch.YIN: Polarity.YANG, Branch.MAO: Polarity.YIN,
    Branch.CHEN: Polarity.YANG, Branch.SI: Polarity.YIN,
    Branch.WU: Polarity.YANG, Branch.WEI: Polarity.YIN,
    Branch.SHEN: Polarity.YANG, Branch.YOU: Polarity.YIN,
    Branch.XU: Polarity.YANG, Branch.HAI: Polarity.YIN,
}

BRANCH_HANZI: dict[Branch, str] = {
    Branch.ZI: "子", Branch.CHOU: "丑", Branch.YIN: "寅", Branch.MAO: "卯",
    Branch.CHEN: "辰", Branch.SI: "巳", Branch.WU: "午", Branch.WEI: "未",
    Branch.SHEN: "申", Branch.YOU: "酉", Branch.XU: "戌", Branch.HAI: "亥",
}

# Branch ↔ BaZi animal (生肖) — for display only.
BRANCH_ANIMAL: dict[Branch, str] = {
    Branch.ZI: "rat", Branch.CHOU: "ox", Branch.YIN: "tiger", Branch.MAO: "rabbit",
    Branch.CHEN: "dragon", Branch.SI: "snake", Branch.WU: "horse", Branch.WEI: "goat",
    Branch.SHEN: "monkey", Branch.YOU: "rooster", Branch.XU: "dog", Branch.HAI: "pig",
}

# Branch ↔ TST hour range (the two-hour shichen). CRITICAL: BaZi hour-pillar
# uses TRUE SOLAR TIME, which is exactly what Birth-Time resolves.
BRANCH_HOUR_RANGE: dict[Branch, tuple[int, int]] = {
    Branch.ZI:   (23, 1),   # 子 wraps midnight
    Branch.CHOU: (1, 3),
    Branch.YIN:  (3, 5),
    Branch.MAO:  (5, 7),
    Branch.CHEN: (7, 9),
    Branch.SI:   (9, 11),
    Branch.WU:   (11, 13),
    Branch.WEI:  (13, 15),
    Branch.SHEN: (15, 17),
    Branch.YOU:  (17, 19),
    Branch.XU:   (19, 21),
    Branch.HAI:  (21, 23),
}


# --------------------------------------------------------------------------- #
# Pure relations used by Ten Gods / compatibility
# --------------------------------------------------------------------------- #
def generates(a: Element, b: Element) -> bool:
    """a generates (生) b — a is the mother of b."""
    return (a, b) in GENERATING_CYCLE


def controls(a: Element, b: Element) -> bool:
    """a controls (克) b — a dominates b."""
    return (a, b) in CONTROLLING_CYCLE


def same_element(a: Element, b: Element) -> bool:
    return a == b
