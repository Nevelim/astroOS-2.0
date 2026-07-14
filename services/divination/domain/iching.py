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
    1: ("Creative power brings sublime success through perseverance.", "Творческая сила приносит высший успех через настойчивость."),
    2: ("Supreme success through receptive devotion.", "Высший успех через восприимчивую преданность."),
    3: ("Difficulty at the beginning brings success through perseverance; appoint helpers.", "В начале — трудность; успех через настойчивость и помощников."),
    4: ("Youthful folly meets success; do not seek the young fool — let him seek you.", "Молодая неопытность встретит успех; не ищи глупца — пусть он сам ищет тебя."),
    5: ("Waiting brings sincere success through steadfastness; cross the great river.", "Ожидание приносит успех через стойкость; переплыви великую реку."),
    6: ("Conflict requires cautious halfway measures; meeting great brings misfortune.", "Тяжба требует осторожности; полумеры благоприятны, уступи вовремя."),
    7: ("The army needs perseverance and a strong leader; no blame.", "Войску нужна стойкость и сильный вождь; тогда не будет хулы."),
    8: ("Holding together brings good fortune; inquire which to follow.", "Единение приносит удачу; спроси, кому следовать."),
    9: ("Small taming brings success through small, gradual efforts.", "Малое воспитание даёт успех через малые постепенные усилия."),
    10: ("Treading on the tiger's tail brings success through courtesy.", "Наступать на хвост тигцу — успех через учтивость."),
    11: ("Peace means the small departs and the great approaches; good fortune.", "Мир: малое уходит, великое приходит; удача."),
    12: ("Standstill means evil people do not further; the great departs, the small approaches.", "Упадок: злые люди не помогают; великое уходит, малое приходит."),
    13: ("Fellowship with men in the open brings success; cross the great river.", "Содружество людей на открытом месте приносит успех; переплыви великую реку."),
    14: ("Great possession brings supreme success.", "Обладание великим приносит высший успех."),
    15: ("Modesty brings success; the superior man carries it through.", "Смирение приносит успех; благородный человек доводит дело до конца."),
    16: ("Enthusiasm furthers the appointment of helpers and mobilization.", "Вольность способствует назначению помощников и мобилизации."),
    17: ("Following has supreme success; persevere, then it furthers.", "Последование даёт высший успех; будь стойким, и это поможет."),
    18: ("Work on the decayed has supreme success; cross the great river.", "Исправление испорченного даёт высший успех; переплыви великую реку."),
    19: ("Approach brings success; in the eighth month there is misfortune.", "Приближение приносит успех; на восьмом месяце — несчастье."),
    20: ("Contemplation demands sincerity; the ablution has been made.", "Созерцание требует искренности; омовение уже совершено."),
    21: ("Biting through brings success; use penal justice.", "Зубы приносят успех; применяй справедливое наказание."),
    22: ("Grace has success in small matters.", "Величие даёт успех в малых делах."),
    23: ("Splitting apart means no advantage in going anywhere.", "Разорвать: никуда не выгодно идти."),
    24: ("Return brings success; going and coming without error.", "Возврат приносит успех; уход и приход без ошибки."),
    25: ("Innocence brings supreme success; stray from it and there is misfortune.", "Беспорочность даёт высший успех; отступишь — несчастье."),
    26: ("Great taming brings perseverance and good fortune; eat well at home.", "Великое воспитание даёт стойкость и удачу; питайся дома."),
    27: ("Mouth corners demand nourishment; perseverance brings good fortune.", "Питание требует заботы; стойкость приносит удачу."),
    28: ("Great exceeding means the ridgepole sags; furthering to set things in order.", "Переразвитие великого: балка прогибается; действуй, чтобы всё упорядочить."),
    29: ("The abysmal repeated: be sincere and act with the heart's truth.", "Великая поглощающая повторяется; будь искренен, действуй с правдивостью сердца."),
    30: ("The clinging means perseverance furthers; success, care of the cow.", "Сияние: стойкость помогает; успех через заботу о корове."),
    31: ("Influence brings success; take a maiden as wife, good fortune.", "Взаимодействие приносит успех; взять девицу в жёны — к удаче."),
    32: ("Duration brings success; no blame, furthering to have direction.", "Постоянство приносит успех; без хулы, выгодно иметь цель."),
    33: ("Retreat brings success; perseverance in small things.", "Отступление приносит успех; стойкость в малом."),
    34: ("Great power demands perseverance in the right; no end.", "Мощь великого требует стойкости в правильном; без хулы."),
    35: ("Progress is like a powerful prince receiving horses in one day.", "Восход подобен могучему князю, получающему коней в один день."),
    36: ("Darkening of the light furthers through perseverance in difficulty.", "Утрата света: выгодна стойкость в трудности."),
    37: ("The family demands the woman's role within, the man's without.", "Семья: женщина — внутри, мужчина — снаружи; ролями не пренебрегать."),
    38: ("Opposition brings good fortune in small matters.", "Разлад приносит удачу в малых делах."),
    39: ("Obstruction — the southwest furthers, the northeast does not; see the great man.", "Препятствие: юго-запад благоприятен, северо-восток — нет; увидь великого человека."),
    40: ("Deliverance brings success; the southwest furthers; return, then no mistake.", "Разрешение приносит успех; юго-запад благоприятен; возвратись, и без ошибки."),
    41: ("Decrease with sincerity brings supreme good fortune; no blame.", "Убыль с искренностью приносит высшую удачу; без хулы."),
    42: ("Increase furthers undertaking something; cross the great river.", "Приумножение помогает начинать; переплыви великую реку."),
    43: ("Breakthrough requires declaring it at the king's court with truth.", "Выход: решительно объяви при дворе государя с правдивостью."),
    44: ("Coming to meet — the strong woman should not be taken.", "Встреча: сильную женщину брать не следует."),
    45: ("Gathering together brings success; the king approaches the temple.", "Сбор приносит успех; государь приближается к храму."),
    46: ("Pushing upward brings supreme success; see the great man, fear not.", "Подъём даёт высший успех; увидь великого человека, не бойся."),
    47: ("Oppression — success, perseverance; for the great man, no blame; words not believed.", "Истощение: успех через стойкость; великому человеку без хулы; словам не верят."),
    48: ("The well — the town may change, but the well not; it is nearly emptied.", "Колодец: город меняется, колодец — нет; уровень воды падает."),
    49: ("Revolution — on your own day gain the people's trust.", "Смена: в свой день завоюй доверие народа."),
    50: ("The cauldron brings supreme good fortune; success.", "Жертвенник приносит высшую удачу; успех."),
    51: ("The arousing brings success; shock, terror, then laughter and words.", "Возбуждение приносит успех; трепет и ужас, затем смех и слова."),
    52: ("Keeping still brings success through calm of the back so one feels no body.", "Сосредоточенность приносит успех: спокоен спиной, не ощущает тела."),
    53: ("Development means the maiden is given in marriage; good fortune in perseverance.", "Постепенное развитие: девицу выдают замуж; стойкость к удаче."),
    54: ("The marrying maiden furthers action; no end.", "Невеста: действия благоприятны, но без завершения."),
    55: ("Abundance brings success; the king attains abundance — be sad as at noon.", "Изобилие приносит успех; государь достигает его — будь печален в полдень."),
    56: ("The wanderer attains small success through steadfastness.", "Странник достигает малого успеха через стойкость."),
    57: ("The gentle brings success through small matters; have direction to see the great man.", "Проникновение даёт успех в малом; иди к великому человеку."),
    58: ("The joyous brings success; perseverance furthers.", "Радость приносит успех; стойкость помогает."),
    59: ("Dispersion brings success; the king approaches the temple; cross the great river.", "Раздробление приносит успех; государь приближается к храму; переплыви великую реку."),
    60: ("Limitation brings success; do not press galling limits, or exhaustion.", "Ограничение приносит успех; не доводи до мучительных пределов."),
    61: ("Inner truth brings good fortune through pigs and fishes; crossing the river.", "Внутренняя правда приносит удачу; правдивость до свиней и рыб; переплыви реку."),
    62: ("Small exceeding brings success; perseverance, small matters; no flying, descending.", "Переразвитие малого даёт успех; стойкость в малом; не летать, а спускаться."),
    63: ("After completion brings success in small things; beginning good fortune, end disorder.", "Уже после: успех в малом; начало к удаче, конец к беспорядку."),
    64: ("Before completion brings success; the little fox wets its tail crossing, furthers nothing.", "Перед завершением: успех; лисица мочит хвост при переправе — без пользы."),
}
_IMAGE: dict[int, tuple[str, str]] = {
    1: ("The movement of heaven is full of power.", "Движение неба исполнено силы."),
    2: ("The earth's condition is receptive devotion.", "Состояние земли — восприимчивая преданность."),
    3: ("Clouds and thunder: the superior man brings order to the tangled.", "Облака и гром: благородный человек наводит порядок в спутанном."),
    4: ("A spring wells up beneath the mountain: youthful folly is nurtured.", "Под горой бьёт источник: юная неопытность воспитывается."),
    5: ("Clouds rise to heaven: the superior man eats, drinks, is joyous.", "Облака поднимаются к небу: благородный муж ест, пьёт и радуется."),
    6: ("Heaven and water go opposite ways: consider the beginning of all.", "Небо и вода идут врозь: обдумай начало всех дел."),
    7: ("Water in the earth: the superior man nourishes the people, gathers them.", "Вода в земле: благородный муж питает народ и собирает его."),
    8: ("Water on the earth: ancient kings built states and befriended princes.", "Вода на земле: древние цари создавали государства и дружили с князьями."),
    9: ("Wind drives across heaven: the superior man refines the outward forms.", "Ветер гуляет по небу: благородный муж утончает внешние формы."),
    10: ("Heaven above, lake below: the superior man discriminates high and low.", "Небо вверху, озеро внизу: благородный муж различает высокое и низкое."),
    11: ("Heaven and earth unite: the ruler regulates the seasons' courses.", "Небо и земля соединяются: владыка упорядочивает ход времён года."),
    12: ("Heaven and earth do not unite: the superior man withdraws into worth.", "Небо и земля не соединяются: благородный муж уходит в свою ценность."),
    13: ("Heaven and fire: the superior man organizes clans and discerns things.", "Небо и огонь: благородный муж объединяет роды и различает вещи."),
    14: ("Fire in heaven above: the superior man curbs evil and furthers good.", "Огонь в небе вверху: благородный муж подавляет зло и творит добро."),
    15: ("Earth buried in the mountain: the superior man reduces the excess, augments the scarce.", "Земля внутри горы: благородный муж убавляет избыток, прибавляет малое."),
    16: ("Thunder comes up: ancient kings honored merit and promoted virtue.", "Гром поднимается: древние цари чтили заслуги и возвышали добродетель."),
    17: ("Thunder within the lake: at dusk the superior man rests.", "Гром в озере: в сумерках благородный муж отходит ко сну."),
    18: ("Wind below the mountain: the superior man rouses the people, strengthens their spirit.", "Ветер под горой: благородный муж будит народ и укрепляет его дух."),
    19: ("Earth above the lake: the superior man is inexhaustible in teaching.", "Земля над озером: благородный муж неисчерпаем в обучении."),
    20: ("Wind blows over the earth: ancient kings visited regions and observed the people.", "Ветер веет над землёй: древние цари обходили области и наблюдали народ."),
    21: ("Thunder and lightning: ancient kings set firm laws through penalties.", "Гром и молния: древние цари устанавливали твёрдые законы через кары."),
    22: ("Fire at the foot of the mountain: the superior man sheds light on affairs.", "Огонь у подножия горы: благородный муж проясняет текущие дела."),
    23: ("Mountain rests on the earth: those above secure their position through generosity below.", "Гора покоится на земле: верхи укрепляют положение щедростью к низам."),
    24: ("Thunder within the earth: ancient kings closed passes on the solstice day.", "Гром в земле: древние цари в день солнцеворота закрывали заставы."),
    25: ("Thunder rolls under heaven: ancient kings nourished all things in harmony with the seasons.", "Гром гремит под небом: древние цари питали всё сущее согласно временам."),
    26: ("Heaven within the mountain: the superior man acquaints himself with many sayings and deeds.", "Небо в горе: благородный муж познаёт множество речей и деяний прошлого."),
    27: ("Thunder beneath the mountain: the superior man is careful of words and temperate in eating.", "Гром под горой: благородный муж осторожен в речах и умерен в пище."),
    28: ("The lake rises over the trees: the superior man stands alone without fear.", "Озеро поднимается над деревьями: благородный муж стоит один без страха."),
    29: ("Water flows on endlessly: the superior man walks in lasting virtue.", "Вода течёт непрестанно: благородный муж творит постоянную добродетель."),
    30: ("Brilliance rises twice: the great man illumines the four quarters.", "Сияние восходит дважды: великий муж освещает четыре стороны света."),
    31: ("A lake over the mountain: the superior man takes people in with his emptiness.", "Озеро над горой: благородный муж принимает людей своей пустотой."),
    32: ("Thunder and wind: the superior man stands firm and does not change his direction.", "Гром и ветер: благородный муж стоит твёрдо и не меняет направления."),
    33: ("Mountain under heaven: the superior man keeps small people at a distance.", "Гора под небом: благородный муж держит ничтожных людей в стороне."),
    34: ("Thunder in heaven: the superior man does not tread on paths that do not accord with ritual.", "Гром в небе: благородный муж не ступает на пути, противные ритуалу."),
    35: ("The sun rises over the earth: the superior man augments his bright virtue himself.", "Солнце восходит над землёй: благородный муж сам приумножает светлую добродетель."),
    36: ("The light sinks into the earth: the superior man lives with the crowd, veiling his light.", "Свет погружается в землю: благородный муж живёт с толпой, скрывая свет."),
    37: ("Wind comes forth from fire: the superior man gives substance to words and duration to deeds.", "Ветер исходит из огня: благородный муж придаёт вес словам и длительность делам."),
    38: ("Fire above, lake below: the superior man preserves his independence in fellowship.", "Огонь вверху, озеро внизу: благородный муж в общении сохраняет самостоятельность."),
    39: ("Water on a mountain: the superior man turns his attention to himself and enhances virtue.", "Вода на горе: благородный муж обращается к себе и совершенствует добродетель."),
    40: ("Thunder and rain: the superior man pardons mistakes and forgives misdeeds.", "Гром и дождь: благородный муж прощает ошибки и отпускает провинности."),
    41: ("Lake at the foot of the mountain: the superior man checks his anger and restrains his impulses.", "Озеро у подножия горы: благородный муж сдерживает гнев и обуздывает порывы."),
    42: ("Wind and thunder: the superior man sees good, does it; if wrong, amends it.", "Ветер и гром: благородный муж видит доброе — творит, злое — исправляет."),
    43: ("Waters rise to heaven: the superior man bestows wealth to those below.", "Воды поднимаются к небу: благородный муж раздаёт богатство низам."),
    44: ("Under heaven wind blows: the prince publishes commands and declares them to the four quarters.", "Под небом веет ветер: князь издаёт приказы и объявляет их всем сторонам."),
    45: ("Lake rises over the earth: the superior man repairs his weapons to meet the unforeseen.", "Озеро поднимается над землёй: благородный муж готовит оружие на случай неожиданного."),
    46: ("Wood grows in the earth: the superior man piles up small things to become high and great.", "Дерево растёт в земле: благородный муж копит малое, достигая высоты и величия."),
    47: ("There is no water in the lake: the superior man lives his life, fulfills his destiny.", "В озере нет воды: благородный муж живёт свою жизнь и исполняет своё назначение."),
    48: ("Water over wood: the superior man encourages the people and urges them to help one another.", "Вода над деревом: благородный муж ободряет народ и побуждает к взаимопомощи."),
    49: ("Fire in the lake: the superior man orders the calendar and makes the seasons clear.", "Огонь в озере: благородный муж упорядочивает календарь и проясняет времена года."),
    50: ("Fire over wood: the superior man keeps his position upright and aligns fate.", "Огонь над деревом: благородный муж стоит прямо и согласуется с предначертанием."),
    51: ("Thunder repeated: the superior man sets his life in order with fear and trembling.", "Гром повторяется: благородный муж в страхе и трепете наводит порядок в жизни."),
    52: ("Mountains next to each other: the superior man does not let his thoughts wander.", "Горы стоят рядом: благородный муж не даёт мыслям блуждать."),
    53: ("Tree on the mountain: the superior man keeps his virtue sound and improves manners.", "Дерево на горе: благородный муж сохраняет добродетель нетронутой и улучшает нравы."),
    54: ("Thunder over lake: the superior man understands transience in the long view.", "Гром над озером: благородный муж в долгом взгляде постигает преходящее."),
    55: ("Thunder and lightning come together: the superior man decides lawsuits and carries out penalties.", "Гром и молния приходят вместе: благородный муж разбирает тяжбы и приводит в исполнение кары."),
    56: ("Fire on the mountain: the superior man applies penalties with clarity and caution.", "Огонь на горе: благородный муж ясно и осторожно применяет наказания."),
    57: ("Winds following each other: the superior man spreads his commands and carries out his undertakings.", "Ветры следуют друг за другом: благородный муж распространяет повеления и выполняет дела."),
    58: ("Lakes resting on each other: the superior man joins friends for discussion and practice.", "Озёра покоятся друг на друге: благородный муж беседует и практикуется с друзьями."),
    59: ("Wind over water: ancient kings sacrificed to the Lord and built temples.", "Ветер над водой: древние цари приносили жертвы Владыке и строили храмы."),
    60: ("Water over lake: the superior man creates numbers and measures, examines virtue and conduct.", "Вода над озером: благородный муж устанавливает меру и число, проверяет добродетель и поведение."),
    61: ("Wind over lake: the superior man discusses lawsuits to delay executions.", "Ветер над озером: благородный муж обсуждает тяжбы, чтобы оттянуть казни."),
    62: ("Thunder on the mountain: the superior man gives preponderance to reverence in conduct.", "Гром на горе: благородный муж придаёт перевес почтительности в поведении."),
    63: ("Water over fire: the superior man carefully considers misfortune and guards against it.", "Вода над огнём: благородный муж размышляет о несчастье и остерегается его."),
    64: ("Fire over water: the superior man distinguishes things carefully by their place.", "Огонь над водой: благородный муж тщательно различает вещи по их месту."),
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
