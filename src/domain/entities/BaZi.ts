/**
 * BaZi — доменная сущность восточного гороскопа (4 столпа судьбы).
 * Year/Month/Day/Time pillars + Day Master + 8 Luck Pillars + Ten Gods.
 */
export type HeavenlyStem =
  | "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";

export type EarthlyBranch =
  | "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未"
  | "申" | "酉" | "戌" | "亥";

export type FiveElement = "Wood" | "Fire" | "Earth" | "Metal" | "Water";

export type YinYang = "Yang" | "Yin";

export type TenGod =
  | "Self" | "Companion" | "Rob Wealth"
  | "Eating God" | "Hurting Officer"
  | "Partial Wealth" | "Direct Wealth"
  | "Direct Officer" | "Seven Killings"
  | "Resource" | "Indirect Resource";

export interface Pillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  stemElement: FiveElement;
  stemYinYang: YinYang;
}

export interface LuckPillar extends Pillar {
  startAge: number;
  endAge: number;
  direction: "forward" | "reverse";
}

export class BaZi {
  private constructor(
    public readonly yearPillar: Pillar,
    public readonly monthPillar: Pillar,
    public readonly dayPillar: Pillar,
    public readonly timePillar: Pillar,
    public readonly dayMaster: HeavenlyStem,
    public readonly dayMasterElement: FiveElement,
    public readonly dayMasterYinYang: YinYang,
    public readonly luckPillars: ReadonlyArray<LuckPillar>,
    public readonly elementBalance: Readonly<Record<FiveElement, number>>,
    public readonly tenGods: ReadonlyArray<TenGod>,
  ) {
    Object.freeze(this);
    Object.freeze(this.luckPillars);
    Object.freeze(this.elementBalance);
    Object.freeze(this.tenGods);
  }

  static create(input: {
    yearPillar: Pillar;
    monthPillar: Pillar;
    dayPillar: Pillar;
    timePillar: Pillar;
    luckPillars: LuckPillar[];
    elementBalance: Record<FiveElement, number>;
    tenGods: TenGod[];
  }): BaZi {
    const dayMaster = input.dayPillar.stem;
    const dayMasterElement = input.dayPillar.stemElement;
    const dayMasterYinYang = input.dayPillar.stemYinYang;
    return new BaZi(
      input.yearPillar,
      input.monthPillar,
      input.dayPillar,
      input.timePillar,
      dayMaster,
      dayMasterElement,
      dayMasterYinYang,
      input.luckPillars,
      input.elementBalance,
      input.tenGods,
    );
  }

  /** Рекомендации по стихии Day Master (недостающая/избыточная). */
  elementRecommendation(): {
    favorable: FiveElement[];
    unfavorable: FiveElement[];
    dominant: FiveElement;
    deficient: FiveElement;
  } {
    const entries = (Object.entries(this.elementBalance) as Array<[FiveElement, number]>)
      .sort((a, b) => b[1] - a[1]);
    const dominant = entries[0][0];
    const deficient = entries[entries.length - 1][0];
    // Благоприятные = порождающие Day Master + сам Day Master element
    const generating = generatingElement(this.dayMasterElement);
    const favorable = [this.dayMasterElement, generating];
    const unfavorable = entries.slice(0, 2).map((e) => e[0]).filter((e) => !favorable.includes(e));
    return { favorable, unfavorable, dominant, deficient };
  }
}

/** Порождение стихий (пяти элементов) по циклу Сян-Шэн. */
export function generatingElement(el: FiveElement): FiveElement {
  const cycle: Record<FiveElement, FiveElement> = {
    Wood: "Water",
    Fire: "Wood",
    Earth: "Fire",
    Metal: "Earth",
    Water: "Metal",
  };
  return cycle[el];
}

export function controllingElement(el: FiveElement): FiveElement {
  const cycle: Record<FiveElement, FiveElement> = {
    Wood: "Earth",
    Earth: "Water",
    Water: "Fire",
    Fire: "Metal",
    Metal: "Wood",
  };
  return cycle[el];
}

export const HEAVENLY_STEMS: Array<{ stem: HeavenlyStem; element: FiveElement; yinYang: YinYang; pinyin: string }> = [
  { stem: "甲", element: "Wood", yinYang: "Yang", pinyin: "Jiǎ" },
  { stem: "乙", element: "Wood", yinYang: "Yin", pinyin: "Yǐ" },
  { stem: "丙", element: "Fire", yinYang: "Yang", pinyin: "Bǐng" },
  { stem: "丁", element: "Fire", yinYang: "Yin", pinyin: "Dīng" },
  { stem: "戊", element: "Earth", yinYang: "Yang", pinyin: "Wù" },
  { stem: "己", element: "Earth", yinYang: "Yin", pinyin: "Jǐ" },
  { stem: "庚", element: "Metal", yinYang: "Yang", pinyin: "Gēng" },
  { stem: "辛", element: "Metal", yinYang: "Yin", pinyin: "Xīn" },
  { stem: "壬", element: "Water", yinYang: "Yang", pinyin: "Rén" },
  { stem: "癸", element: "Water", yinYang: "Yin", pinyin: "Guǐ" },
];

export const EARTHLY_BRANCHES: Array<{ branch: EarthlyBranch; element: FiveElement; zodiac: string; pinyin: string }> = [
  { branch: "子", element: "Water", zodiac: "Rat", pinyin: "Zǐ" },
  { branch: "丑", element: "Earth", zodiac: "Ox", pinyin: "Chǒu" },
  { branch: "寅", element: "Wood", zodiac: "Tiger", pinyin: "Yín" },
  { branch: "卯", element: "Wood", zodiac: "Rabbit", pinyin: "Mǎo" },
  { branch: "辰", element: "Earth", zodiac: "Dragon", pinyin: "Chén" },
  { branch: "巳", element: "Fire", zodiac: "Snake", pinyin: "Sì" },
  { branch: "午", element: "Fire", zodiac: "Horse", pinyin: "Wǔ" },
  { branch: "未", element: "Earth", zodiac: "Goat", pinyin: "Wèi" },
  { branch: "申", element: "Metal", zodiac: "Monkey", pinyin: "Shēn" },
  { branch: "酉", element: "Metal", zodiac: "Rooster", pinyin: "Yǒu" },
  { branch: "戌", element: "Earth", zodiac: "Dog", pinyin: "Xū" },
  { branch: "亥", element: "Water", zodiac: "Pig", pinyin: "Hài" },
];
