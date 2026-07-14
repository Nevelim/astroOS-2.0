"""BaZi reference: Element → favorable professions (блок 7 отчёта).

Classical Five-Element career associations: each element's energy aligns
with particular work domains. Used to recommend the top-3 career spheres
that match the Day Master's nature (and the favorable elements that support
it). Pure reference data.
"""
from __future__ import annotations

from dataclasses import dataclass

from services.bazi_engine.domain.constants import Element


@dataclass(frozen=True)
class Profession:
    title: str
    title_ru: str
    reason: str          # why this element suits it (EN)


# Element → top professions (the customer spec блок 7 + classical extensions).
ELEMENT_PROFESSIONS: dict[Element, tuple[Profession, ...]] = {
    Element.WOOD: (
        Profession("Education", "Образование", "Wood = growth, teaching, cultivation"),
        Profession("Healthcare", "Медицина", "Wood = vitality, healing, renewal"),
        Profession("Agriculture", "Сельское хозяйство", "Wood = nature, organic growth"),
        Profession("Design", "Дизайн", "Wood = creativity, expansion"),
    ),
    Element.FIRE: (
        Profession("Marketing & PR", "Маркетинг и PR", "Fire = visibility, charisma, influence"),
        Profession("Entertainment", "Шоу-бизнес", "Fire = performance, expression"),
        Profession("Sales", "Продажи", "Fire = passion, persuasion"),
        Profession("Leadership", "Лидерство", "Fire = inspiration, recognition"),
    ),
    Element.EARTH: (
        Profession("Real estate", "Недвижимость", "Earth = stability, land, property"),
        Profession("Finance analyst", "Финансовый аналитик", "Earth + Metal = structure, prudence"),
        Profession("Consulting", "Консалтинг", "Earth = reliability, strategy"),
        Profession("HR", "HR", "Earth = mediation, support"),
    ),
    Element.METAL: (
        Profession("IT architect", "IT-архитектор", "Metal = structure, precision, logic"),
        Profession("Law", "Юриспруденция", "Metal = rules, justice, order"),
        Profession("Engineering", "Инженерия", "Metal = systems, mechanics"),
        Profession("Banking", "Банкинг", "Metal = precision, numbers"),
    ),
    Element.WATER: (
        Profession("Trade & commerce", "Торговля", "Water = flow, exchange, networks"),
        Profession("Diplomacy", "Дипломатия", "Water = communication, adaptability"),
        Profession("Travel & logistics", "Туризм и логистика", "Water = movement, distribution"),
        Profession("Research", "Исследования", "Water = depth, wisdom, inquiry"),
    ),
}


def professions_for(element: Element, top_n: int = 3) -> tuple[Profession, ...]:
    """The top-N career suggestions for an element (блок 7)."""
    return ELEMENT_PROFESSIONS[element][:top_n]
