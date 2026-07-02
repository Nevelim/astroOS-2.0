/**
 * CastIChing — use case: бросок Книги Перемен (64 гексаграммы).
 * Метод: 3 монеты × 6 линий. Каждая линия 6..9 (old yin, young yang, young yin, old yang).
 */
export type IChingLineType = "old-yin" | "young-yang" | "young-yin" | "old-yang";

export interface IChingLine {
  position: number; // 1..6, bottom to top
  type: IChingLineType;
  value: number; // 6..9
}

export interface IChingHexagram {
  primaryNumber: number; // 1..64
  primaryName: string;
  primaryNameRu: string;
  changingLines: number[]; // positions
  secondaryNumber?: number; // if changing
  secondaryName?: string;
  secondaryNameRu?: string;
  judgment: { en: string; ru: string };
  image: { en: string; ru: string };
}

const HEXAGRAM_NAMES: Array<{ name: string; nameRu: string }> = [
  { name: "The Creative", nameRu: "Творчество" },
  { name: "The Receptive", nameRu: "Исполнение" },
  { name: "Difficulty at the Beginning", nameRu: "Начальная трудность" },
  { name: "Youthful Folly", nameRu: "Юношеское невежество" },
  { name: "Waiting", nameRu: "Необходимость ждать" },
  { name: "Conflict", nameRu: "Суд" },
  { name: "The Army", nameRu: "Войско" },
  { name: "Holding Together", nameRu: "Близость" },
  { name: "Small Taming Power", nameRu: "Малое воспитание" },
  { name: "Treading", nameRu: "Наступление" },
  { name: "Peace", nameRu: "Расцвет" },
  { name: "Standstill", nameRu: "Упадок" },
  { name: "Fellowship with Others", nameRu: "Единомышленники" },
  { name: "Great Possession", nameRu: "Великое владение" },
  { name: "Modesty", nameRu: "Смирение" },
  { name: "Enthusiasm", nameRu: "Восторг" },
  { name: "Following", nameRu: "Следование" },
  { name: "Work on the Decayed", nameRu: "Исправление испорченного" },
  { name: "Approach", nameRu: "Приближение" },
  { name: "Contemplation", nameRu: "Созерцание" },
  { name: "Biting Through", nameRu: "Прокусывание" },
  { name: "Grace", nameRu: "Украшение" },
  { name: "Splitting Apart", nameRu: "Разорване" },
  { name: "Return", nameRu: "Возвращение" },
  { name: "Innocence", nameRu: "Беспорочность" },
  { name: "Great Taming Power", nameRu: "Великое воспитание" },
  { name: "Mouth Corners", nameRu: "Питание" },
  { name: "Great Exceeding", nameRu: "Переразвитие великого" },
  { name: "The Abysmal Water", nameRu: "Бездна" },
  { name: "The Clinging Fire", nameRu: "Сияние" },
  { name: "Influence", nameRu: "Взаимодействие" },
  { name: "Duration", nameRu: "Постоянство" },
  { name: "Retreat", nameRu: "Отступление" },
  { name: "Great Power", nameRu: "Великая сила" },
  { name: "Progress", nameRu: "Успех" },
  { name: "Darkening of the Light", nameRu: "Утрата света" },
  { name: "The Family", nameRu: "Семья" },
  { name: "Opposition", nameRu: "Разлад" },
  { name: "Obstruction", nameRu: "Препятствие" },
  { name: "Deliverance", nameRu: "Освобождение" },
  { name: "Decrease", nameRu: "Убыль" },
  { name: "Increase", nameRu: "Приумножение" },
  { name: "Breakthrough", nameRu: "Выход" },
  { name: "Coming to Meet", nameRu: "Сближение" },
  { name: "Gathering Together", nameRu: "Сбор" },
  { name: "Pushing Upward", nameRu: "Подъём" },
  { name: "Oppression", nameRu: "Истощение" },
  { name: "The Well", nameRu: "Колодец" },
  { name: "Revolution", nameRu: "Смена" },
  { name: "The Cauldron", nameRu: "Жертвенник" },
  { name: "The Arousing Thunder", nameRu: "Возбуждение" },
  { name: "Keeping Still", nameRu: "Созерцание покоя" },
  { name: "Development", nameRu: "Постепенное развитие" },
  { name: "The Marrying Maiden", nameRu: "Невеста" },
  { name: "Abundance", nameRu: "Изобилие" },
  { name: "The Wanderer", nameRu: "Странник" },
  { name: "The Gentle Wind", nameRu: "Проникновение" },
  { name: "Joy", nameRu: "Радость" },
  { name: "Dispersion", nameRu: "Рассеяние" },
  { name: "Limitation", nameRu: "Ограничение" },
  { name: "Inner Truth", nameRu: "Внутренняя правда" },
  { name: "Small Preponderance", nameRu: "Малое превосходство" },
  { name: "After Completion", nameRu: "После завершения" },
  { name: "Before Completion", nameRu: "Перед завершением" },
];

export class CastIChing {
  /** Криптографически честный бросок (crypto.getRandomValues / node:crypto). */
  execute(seed?: string): IChingHexagram {
    const lines: IChingLine[] = [];
    for (let i = 1; i <= 6; i++) {
      lines.push(this.castLine(i, seed));
    }
    return this.buildHexagram(lines);
  }

  private castLine(position: number, _seed?: string): IChingLine {
    // Метод 3 монет: каждая монета орёл=3, решка=2. Сумма 6..9.
    const coins = [this.flipCoin(), this.flipCoin(), this.flipCoin()];
    const value = coins.reduce((a, b) => a + b, 0);
    const type: IChingLineType =
      value === 6 ? "old-yin" :
      value === 7 ? "young-yang" :
      value === 8 ? "young-yin" :
      "old-yang";
    return { position, type, value };
  }

  private flipCoin(): number {
    // Web Crypto API — работает и в браузере, и в Node 20+
    const buf = new Uint8Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % 2 === 0 ? 3 : 2;
  }

  private buildHexagram(lines: IChingLine[]): IChingHexagram {
    // Бинарное представление: yang=1, yin=0, снизу вверх
    const primaryBits = lines.map((l) => (l.value === 7 || l.value === 9 ? 1 : 0));
    const primaryNumber = this.bitsToHexagramNumber(primaryBits);
    const changingLines = lines.filter((l) => l.value === 6 || l.value === 9).map((l) => l.position);

    const meta = HEXAGRAM_NAMES[primaryNumber - 1] ?? { name: "Unknown", nameRu: "Неизвестно" };
    const result: IChingHexagram = {
      primaryNumber,
      primaryName: meta.name,
      primaryNameRu: meta.nameRu,
      changingLines,
      judgment: { en: "", ru: "" },
      image: { en: "", ru: "" },
    };

    if (changingLines.length > 0) {
      // Инвертируем меняющиеся линии
      const secondaryBits = primaryBits.map((b, i) =>
        changingLines.includes(i + 1) ? (b ^ 1) : b
      );
      const secondaryNumber = this.bitsToHexagramNumber(secondaryBits);
      const secondaryMeta = HEXAGRAM_NAMES[secondaryNumber - 1];
      result.secondaryNumber = secondaryNumber;
      result.secondaryName = secondaryMeta?.name;
      result.secondaryNameRu = secondaryMeta?.nameRu;
    }

    return result;
  }

  private bitsToHexagramNumber(bits: number[]): number {
    // King Wen sequence mapping (упрощённый бинарный порядок → King Wen)
    // Бинарное число снизу вверх
    let binary = 0;
    for (let i = 5; i >= 0; i--) {
      binary = binary * 2 + bits[i];
    }
    // Маппинг бинарного порядка в King Wen sequence (1..64)
    const BINARY_TO_KINGWEN: number[] = [
      2, 23, 8, 20, 16, 35, 45, 0,
      15, 52, 39, 53, 62, 56, 31, 33,
      7, 4, 29, 59, 40, 64, 47, 6,
      46, 18, 48, 57, 32, 50, 28, 44,
      24, 27, 3, 42, 51, 21, 17, 25,
      36, 22, 63, 37, 55, 30, 49, 13,
      19, 41, 60, 61, 54, 38, 58, 10,
      11, 26, 5, 9, 34, 14, 43, 1,
    ];
    return BINARY_TO_KINGWEN[binary] ?? 1;
  }
}
