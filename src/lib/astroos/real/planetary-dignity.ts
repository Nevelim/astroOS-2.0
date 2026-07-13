/**
 * Planetary dignity helper — essential dignity scoring for transit positions.
 *
 * Essential dignity is a classical astrology system that scores a planet's
 * strength based on the zodiac sign it occupies:
 *   - Ruler (domicile): planet in its own sign — strongest (+5)
 *   - Exalted: planet in its exaltation sign — very strong (+4)
 *   - Detriment: planet in the opposite of its rulership — weak (-3)
 *   - Fall: planet in the opposite of its exaltation — very weak (-2)
 *   - Neutral: no special dignity (0)
 *
 * This helper is the single source of truth for dignity tables. The natal
 * PlanetaryStrengthsPanel has its own inline copy (untouched — integrator
 * scope); this module is the canonical version for transit-time panels.
 *
 * Clean Architecture: pure domain logic, no framework/astronomy-engine deps.
 */

const ZODIAC_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/** Rulerships (domicile): each planet's home sign(s). */
const RULERSHIPS: Record<string, string[]> = {
  Mars: ["Aries", "Scorpio"],
  Venus: ["Taurus", "Libra"],
  Mercury: ["Gemini", "Virgo"],
  Moon: ["Cancer"],
  Sun: ["Leo"],
  Jupiter: ["Sagittarius", "Pisces"],
  Saturn: ["Capricorn", "Aquarius"],
  Uranus: ["Aquarius"], // modern ruler
  Neptune: ["Pisces"],  // modern ruler
  Pluto: ["Scorpio"],   // modern ruler
};

/** Exaltations: each planet's exaltation sign. */
const EXALTATIONS: Record<string, string> = {
  Sun: "Aries",
  Moon: "Taurus",
  Mercury: "Virgo",
  Venus: "Pisces",
  Mars: "Capricorn",
  Jupiter: "Cancer",
  Saturn: "Libra",
  // Uranus/Neptune/Pluto have no traditional exaltation (modern assignments vary)
};

function getOppositeSign(sign: string): string {
  const idx = ZODIAC_NAMES.indexOf(sign);
  if (idx === -1) return "";
  return ZODIAC_NAMES[(idx + 6) % 12];
}

const DETRIMENTS: Record<string, string[]> = {};
for (const [planet, signs] of Object.entries(RULERSHIPS)) {
  DETRIMENTS[planet] = signs.map(getOppositeSign);
}

const FALLS: Record<string, string> = {};
for (const [planet, sign] of Object.entries(EXALTATIONS)) {
  FALLS[planet] = getOppositeSign(sign);
}

export type DignityType = "Ruler" | "Exalted" | "Detriment" | "Fall" | "Neutral";

export interface PlanetDignity {
  /** The dignity type. */
  dignity: DignityType;
  /** Numeric score: Ruler +5, Exalted +4, Neutral 0, Fall -2, Detriment -3. */
  score: number;
  /** Localized labels (EN/RU/HI). */
  label: { en: string; ru: string; hi: string };
}

const DIGNITY_LABELS: Record<DignityType, { en: string; ru: string; hi: string }> = {
  Ruler: { en: "Ruler", ru: "Управитель", hi: "स्वामी" },
  Exalted: { en: "Exalted", ru: "Экзальтация", hi: "उच्च" },
  Detriment: { en: "Detriment", ru: "Изгнание", hi: "नीच" },
  Fall: { en: "Fall", ru: "Падение", hi: "पतन" },
  Neutral: { en: "Neutral", ru: "Нейтрально", hi: "तटस्थ" },
};

const DIGNITY_SCORES: Record<DignityType, number> = {
  Ruler: 5,
  Exalted: 4,
  Neutral: 0,
  Fall: -2,
  Detriment: -3,
};

/**
 * Compute the essential dignity of a planet in a given zodiac sign.
 * Returns the dignity type, score, and localized labels.
 */
export function getPlanetDignity(planet: string, sign: string): PlanetDignity {
  if (RULERSHIPS[planet]?.includes(sign)) {
    return { dignity: "Ruler", score: DIGNITY_SCORES.Ruler, label: DIGNITY_LABELS.Ruler };
  }
  if (EXALTATIONS[planet] === sign) {
    return { dignity: "Exalted", score: DIGNITY_SCORES.Exalted, label: DIGNITY_LABELS.Exalted };
  }
  if (DETRIMENTS[planet]?.includes(sign)) {
    return { dignity: "Detriment", score: DIGNITY_SCORES.Detriment, label: DIGNITY_LABELS.Detriment };
  }
  if (FALLS[planet] === sign) {
    return { dignity: "Fall", score: DIGNITY_SCORES.Fall, label: DIGNITY_LABELS.Fall };
  }
  return { dignity: "Neutral", score: DIGNITY_SCORES.Neutral, label: DIGNITY_LABELS.Neutral };
}

/** Map dignity type to a tone color for UI rendering. */
export function dignityTone(dignity: DignityType): "gold" | "jade" | "rose" | "neutral" {
  switch (dignity) {
    case "Ruler": return "gold";
    case "Exalted": return "jade";
    case "Detriment": return "rose";
    case "Fall": return "rose";
    default: return "neutral";
  }
}

/** Human-readable description of the dignity (for tooltips). */
export function dignityDescription(dignity: DignityType): { en: string; ru: string; hi: string } {
  switch (dignity) {
    case "Ruler":
      return {
        en: "In its home sign — strongest expression, the planet acts freely and authentically.",
        ru: "В родном знаке — сильнейшее проявление, планета действует свободно и естественно.",
        hi: "अपने घर राशि में — सबसे मजबूत अभिव्यक्ति।",
      };
    case "Exalted":
      return {
        en: "In its exaltation sign — very strong, the planet's energy is elevated and refined.",
        ru: "В знаке экзальтации — очень сильна, энергия планеты возвышена и утончена.",
        hi: "उच्च राशि में — बहुत मजबूत, ऊर्जा परिष्कृत।",
      };
    case "Detriment":
      return {
        en: "In the opposite of its home sign — weak, the planet struggles to express itself.",
        ru: "В противоположном родному знаке — слаба, планете трудно проявиться.",
        hi: "विपरीत राशि में — कमजोर, अभिव्यक्ति में कठिनाई।",
      };
    case "Fall":
      return {
        en: "In the opposite of its exaltation — very weak, the planet's energy is diminished.",
        ru: "В противоположном экзальтации знаке — очень слаба, энергия планеты угаслена.",
        hi: "उच्च के विपरीत — बहुत कमजोर, ऊर्जा क्षीण।",
      };
    default:
      return {
        en: "In a neutral sign — neither strong nor weak, average expression.",
        ru: "В нейтральном знаке — ни сильна ни слаба, среднее проявление.",
        hi: "तटस्थ राशि में — सामान्य अभिव्यक्ति।",
      };
  }
}
