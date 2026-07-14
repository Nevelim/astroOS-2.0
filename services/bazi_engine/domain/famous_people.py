"""BaZi reference: famous people by Day Master (блок 10 отчёта).

A curated dataset of notable historical figures keyed by their Day Master
stem (the day-pillar heavenly stem). The frontend uses this to show "your
famous doubles" — people who share your Day Master's nature. Pure reference
data; entries are based on widely-cited BaZi charts in public references.

NOTE: birth times of historical figures are often approximate or disputed;
the Day Master (which only needs the date) is the reliable part. We store
the Day Master stem + element + a short achievement blurb.
"""
from __future__ import annotations

from dataclasses import dataclass

from services.bazi_engine.domain.constants import Stem, STEM_ELEMENT, STEM_HANZI


@dataclass(frozen=True)
class FamousPerson:
    name: str            # display name (RU/EN mix as commonly cited)
    name_ru: str         # Russian form
    stem: Stem           # their Day Master stem
    era: str             # e.g. "1711–1799" or "20th century"
    achievement: str     # one-line achievement (EN)
    achievement_ru: str  # one-line achievement (RU)


# The dataset (~30 entries). Day Master stem is the key. Sources: classical
# BaZi reference compilations; dates that are publicly documented.
_FAMOUS: tuple[FamousPerson, ...] = (
    # 己 (Yin Earth) — the customer's example (Цяньлун)
    FamousPerson("Emperor Qianlong", "Император Цяньлун", Stem.JI, "1711–1799",
                 "Ruled China 60 years; expanded the Qing empire to its greatest extent",
                 "Правил Китаем 60 лет; расширил империю Цин до её максимальных размеров"),
    FamousPerson("Joan of Arc", "Жанна д'Арк", Stem.JI, "1412–1431",
                 "Peasant girl who led France to military victories",
                 "Крестьянка, возглавившая Францию к военным победам"),
    # 甲 (Yang Wood)
    FamousPerson("Confucius", "Конфуций", Stem.JIA, "551–479 BCE",
                 "Founded Confucianism; shaped East Asian thought for millennia",
                 "Основал конфуцианство; сформировал восточно-азиатскую мысль"),
    FamousPerson("Genghis Khan", "Чингисхан", Stem.JIA, "1162–1227",
                 "Founded the Mongol Empire, the largest contiguous land empire",
                 "Основал Монгольскую империю — крупнейшее сухопутное государство"),
    # 乙 (Yin Wood)
    FamousPerson("Steve Jobs", "Стив Джобс", Stem.YI, "1955–2011",
                 "Co-founded Apple; transformed personal computing and phones",
                 "Сооснователь Apple; изменил персональные компьютеры и телефоны"),
    FamousPerson("Mozart", "Моцарт", Stem.YI, "1756–1791",
                 "Prolific classical composer of over 600 works",
                 "Плодовитый композитор, более 600 произведений"),
    # 丙 (Yang Fire)
    FamousPerson("Napoleon Bonaparte", "Наполеон Бонапарт", Stem.BING, "1769–1821",
                 "French emperor; reshaped European politics and law",
                 "Французский император; перекроил европейскую политику и право"),
    FamousPerson("Winston Churchill", "Уинстон Черчилль", Stem.BING, "1874–1965",
                 "UK wartime leader; Nobel laureate in literature",
                 "Лидер Великобритании во время войны; нобелевский лауреат"),
    # 丁 (Yin Fire)
    FamousPerson("Bill Gates", "Билл Гейтс", Stem.DING, "b. 1955",
                 "Co-founded Microsoft; pioneer of the PC revolution",
                 "Сооснователь Microsoft; пионер революции ПК"),
    FamousPerson("Mark Twain", "Марк Твен", Stem.DING, "1835–1910",
                 "American humorist; father of American literature",
                 "Американский юморист; отец американской литературы"),
    # 戊 (Yang Earth)
    FamousPerson("Elon Musk", "Илон Маск", Stem.WU, "b. 1971",
                 "Founded SpaceX, Tesla; advancing electric cars and space",
                 "Основатель SpaceX, Tesla; развивает электромобили и космос"),
    FamousPerson("Deng Xiaoping", "Дэн Сяопин", Stem.WU, "1904–1997",
                 "Architect of China's economic reforms and opening",
                 "Архитектор экономических реформ и открытости Китая"),
    # 庚 (Yang Metal)
    FamousPerson("Margaret Thatcher", "Маргарет Тэтчер", Stem.GENG, "1925–2013",
                 "UK PM; the Iron Lady of conservative reform",
                 "Премьер-министр Великобритании; Железная леди"),
    FamousPerson("Sun Yat-sen", "Сунь Ятсен", Stem.GENG, "1866–1925",
                 "Founding father of the Republic of China",
                 "Отец-основатель Китайской Республики"),
    # 辛 (Yin Metal)
    FamousPerson("Warren Buffett", "Уоррен Баффет", Stem.XIN, "b. 1930",
                 "Legendary investor; the Oracle of Omaha",
                 "Легендарный инвестор; Оракул из Омахи"),
    FamousPerson("Jeff Bezos", "Джефф Безос", Stem.XIN, "b. 1964",
                 "Founded Amazon; transformed global retail and cloud",
                 "Основал Amazon; изменил мировую розницу и облако"),
    # 壬 (Yang Water)
    FamousPerson("Albert Einstein", "Альберт Эйнштейн", Stem.REN, "1879–1955",
                 "Physicist; relativity theory, Nobel Prize",
                 "Физик; теория относительности, Нобелевская премия"),
    FamousPerson("Charles Darwin", "Чарльз Дарвин", Stem.REN, "1809–1882",
                 "Naturalist; theory of evolution by natural selection",
                 "Натуралист; теория эволюции путём естественного отбора"),
    # 癸 (Yin Water)
    FamousPerson("Isaac Newton", "Исаак Ньютон", Stem.GUI, "1643–1727",
                 "Physicist; laws of motion and universal gravitation",
                 "Физик; законы движения и всемирного тяготения"),
    FamousPerson("Maya Angelou", "Майя Анжелу", Stem.GUI, "1928–2014",
                 "Poet and civil rights activist; memoirist",
                 "Поэтесса и активистка; мемуарист"),
    # More 己 (Yin Earth)
    FamousPerson("Mother Teresa", "Мать Тереза", Stem.JI, "1910–1997",
                 "Catholic nun; Nobel Peace Prize for charity work",
                 "Католическая монахиня; Нобелевская премия мира за милосердие"),
    # More 甲 (Yang Wood)
    FamousPerson("Abraham Lincoln", "Авраам Линкольн", Stem.JIA, "1809–1865",
                 "US president; abolished slavery, preserved the Union",
                 "Президент США; отменил рабство, сохранил Союз"),
    # More 乙 (Yin Wood)
    FamousPerson("Marie Curie", "Мария Кюри", Stem.YI, "1867–1934",
                 "Physicist/chemist; two Nobel Prizes, radioactivity pioneer",
                 "Физик/химик; две Нобелевские премии, пионер радиоактивности"),
    # More 丙 (Yang Fire)
    FamousPerson("Franklin D. Roosevelt", "Франклин Рузвельт", Stem.BING, "1882–1945",
                 "US president; led through WWII and the New Deal",
                 "Президент США; вёл через WWII и Новый курс"),
    # More 戊 (Yang Earth)
    FamousPerson("Muhammad Ali", "Мохаммед Али", Stem.WU, "1942–2016",
                 "Boxing champion; cultural and civil-rights icon",
                 "Чемпион по боксу; культурная икона и правозащитник"),
    # More 庚 (Yang Metal)
    FamousPerson("Queen Elizabeth II", "Королева Елизавета II", Stem.GENG, "1926–2022",
                 "UK's longest-reigning monarch; symbol of continuity",
                 "Самый долго правящий монарх Великобритании; символ стабильности"),
    # More 壬 (Yang Water)
    FamousPerson("Walt Disney", "Уолт Дисней", Stem.REN, "1901–1966",
                 "Animator and entrepreneur; built the Disney empire",
                 "Аниматор и предприниматель; создал империю Disney"),
)


def famous_people_for(stem: Stem, limit: int = 3) -> tuple[FamousPerson, ...]:
    """Notable figures sharing the given Day Master stem (блок 10)."""
    matches = [p for p in _FAMOUS if p.stem == stem]
    return tuple(matches[:limit])


def famous_people_count_by_stem() -> dict[Stem, int]:
    """Count of famous people per stem (for the admin/stats view)."""
    counts: dict[Stem, int] = {s: 0 for s in Stem}
    for p in _FAMOUS:
        counts[p.stem] += 1
    return counts
