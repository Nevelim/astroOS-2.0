"""BaZi reference: Element → compass direction + favorable countries.

Classical Five-Element direction mapping (后八卦 / Luo Shu orientation):
  Wood=East, Fire=South, Earth=Center, Metal=West, Water=North.
Plus the per-element favorable-country suggestions (блок 8 отчёта: стороны
света и страны). Countries are illustrative examples tying the element's
energy to a destination's climate/culture — not an exhaustive list.

Pure reference data; no computation beyond lookup.
"""
from __future__ import annotations

from services.bazi_engine.domain.constants import Element


# Element → compass direction (the Bagua association).
ELEMENT_DIRECTION: dict[Element, str] = {
    Element.WOOD: "east",
    Element.FIRE: "south",
    Element.EARTH: "center",
    Element.METAL: "west",
    Element.WATER: "north",
}

# Direction → 8-sector compass label (for the UI).
DIRECTION_LABEL: dict[str, tuple[str, str, str]] = {
    # direction: (ru, en, hi)
    "east": ("Восток", "East", "पूर्व"),
    "south": ("Юг", "South", "दक्षिण"),
    "center": ("Центр", "Center", "केंद्र"),
    "west": ("Запад", "West", "पश्चिम"),
    "north": ("Север", "North", "उत्तर"),
}

# Element → (purpose, example countries) — from the customer spec блок 8.
# Each entry describes WHY the direction/country suits that element's energy.
ELEMENT_COUNTRIES: dict[Element, tuple[str, tuple[str, ...]]] = {
    Element.FIRE: (
        "Работа, активность, признание",
        ("Италия", "Испания", "Греция", "Португалия"),
    ),
    Element.EARTH: (
        "Сон, отдых, стабильность, недвижимость",
        ("Швейцария", "Австрия", "Грузия", "Чехия"),
    ),
    Element.METAL: (
        "Структура, финансы, технологии",
        ("Германия", "Япония", "Южная Корея", "Сингапур"),
    ),
    Element.WATER: (
        "Коммуникация, торговля, путешествия",
        ("Нидерланды", "Великобритания", "Канада", "Скандинавия"),
    ),
    Element.WOOD: (
        "Рост, образование, новые начала, семья",
        ("Новая Зеландия", "Япония", "Ирландия", "Латвия"),
    ),
}


def direction_for(element: Element) -> str:
    """Compass direction for an element (блок 8)."""
    return ELEMENT_DIRECTION[element]


def countries_for(element: Element) -> tuple[str, tuple[str, ...]]:
    """(purpose, example-countries) for an element (блок 8)."""
    return ELEMENT_COUNTRIES[element]
