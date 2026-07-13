/**
 * CosmicMatch — доменный сервис совместимости двух Members.
 * Western astrology (Sun/Moon/Venus aspects) + BaZi (Day Master compatibility).
 * Clean Architecture: domain service, чистый TS.
 */

export interface CompatibilityInput {
  // Member A
  a: {
    sunSign: string;
    moonSign: string;
    venusSign?: string;
    dayMasterElement?: string; // Five Element
  };
  // Member B
  b: {
    sunSign: string;
    moonSign: string;
    venusSign?: string;
    dayMasterElement?: string;
  };
}

export interface CompatibilityAspect {
  name: string;
  score: number; // 0..100
  description: { en: string; ru: string; hi: string };
  tone: "gold" | "jade" | "rose" | "neutral";
}

export interface CompatibilityResult {
  overall: number; // 0..100
  tone: "gold" | "jade" | "rose" | "neutral";
  aspects: CompatibilityAspect[];
  summary: { en: string; ru: string; hi: string };
  baZiCompatibility: number | null; // null если нет Day Master
  westernCompatibility: number;
}

const ELEMENT_COMPAT: Record<string, Record<string, number>> = {
  Wood: { Wood: 60, Fire: 85, Earth: 55, Metal: 35, Water: 80 },
  Fire: { Wood: 85, Fire: 60, Earth: 80, Metal: 35, Water: 30 },
  Earth: { Wood: 55, Fire: 80, Earth: 60, Metal: 85, Water: 50 },
  Metal: { Wood: 35, Fire: 35, Earth: 85, Metal: 60, Water: 80 },
  Water: { Wood: 80, Fire: 30, Earth: 50, Metal: 80, Water: 60 },
};

const SIGN_ELEMENT: Record<string, string> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

const SIGN_COMPAT: Record<string, Record<string, number>> = {
  Aries: { Aries: 65, Taurus: 45, Gemini: 70, Cancer: 50, Leo: 85, Virgo: 50, Libra: 70, Scorpio: 55, Sagittarius: 85, Capricorn: 45, Aquarius: 75, Pisces: 55 },
  Taurus: { Aries: 45, Taurus: 70, Gemini: 50, Cancer: 80, Leo: 50, Virgo: 85, Libra: 70, Scorpio: 65, Sagittarius: 45, Capricorn: 85, Aquarius: 50, Pisces: 75 },
  Gemini: { Aries: 70, Taurus: 50, Gemini: 65, Cancer: 55, Leo: 75, Virgo: 60, Libra: 85, Scorpio: 45, Sagittarius: 70, Capricorn: 50, Aquarius: 85, Pisces: 55 },
  Cancer: { Aries: 50, Taurus: 80, Gemini: 55, Cancer: 70, Leo: 55, Virgo: 75, Libra: 55, Scorpio: 85, Sagittarius: 50, Capricorn: 65, Aquarius: 45, Pisces: 85 },
  Leo: { Aries: 85, Taurus: 50, Gemini: 75, Cancer: 55, Leo: 70, Virgo: 55, Libra: 80, Scorpio: 50, Sagittarius: 85, Capricorn: 50, Aquarius: 70, Pisces: 55 },
  Virgo: { Aries: 50, Taurus: 85, Gemini: 60, Cancer: 75, Leo: 55, Virgo: 70, Libra: 60, Scorpio: 80, Sagittarius: 50, Capricorn: 85, Aquarius: 55, Pisces: 70 },
  Libra: { Aries: 70, Taurus: 70, Gemini: 85, Cancer: 55, Leo: 80, Virgo: 60, Libra: 70, Scorpio: 55, Sagittarius: 75, Capricorn: 55, Aquarius: 85, Pisces: 60 },
  Scorpio: { Aries: 55, Taurus: 65, Gemini: 45, Cancer: 85, Leo: 50, Virgo: 80, Libra: 55, Scorpio: 75, Sagittarius: 50, Capricorn: 75, Aquarius: 45, Pisces: 85 },
  Sagittarius: { Aries: 85, Taurus: 45, Gemini: 70, Cancer: 50, Leo: 85, Virgo: 50, Libra: 75, Scorpio: 50, Sagittarius: 70, Capricorn: 55, Aquarius: 80, Pisces: 55 },
  Capricorn: { Aries: 45, Taurus: 85, Gemini: 50, Cancer: 65, Leo: 50, Virgo: 85, Libra: 55, Scorpio: 75, Sagittarius: 55, Capricorn: 70, Aquarius: 60, Pisces: 70 },
  Aquarius: { Aries: 75, Taurus: 50, Gemini: 85, Cancer: 45, Leo: 70, Virgo: 55, Libra: 85, Scorpio: 45, Sagittarius: 80, Capricorn: 60, Aquarius: 70, Pisces: 60 },
  Pisces: { Aries: 55, Taurus: 75, Gemini: 55, Cancer: 85, Leo: 55, Virgo: 70, Libra: 60, Scorpio: 85, Sagittarius: 55, Capricorn: 70, Aquarius: 60, Pisces: 70 },
};

export class CosmicMatch {
  compute(input: CompatibilityInput): CompatibilityResult {
    const aspects: CompatibilityAspect[] = [];

    // Sun-Sun compatibility
    const sunScore = SIGN_COMPAT[input.a.sunSign]?.[input.b.sunSign] ?? 50;
    aspects.push({
      name: "Sun · Sun",
      score: sunScore,
      description: {
        en: `${input.a.sunSign} meets ${input.b.sunSign} — core identity resonance.`,
        ru: `${input.a.sunSign} встречает ${input.b.sunSign} — резонанс ядерной идентичности.`,
        hi: `${input.a.sunSign} ${input.b.sunSign} से मिलता है — मूल पहचान गुंजयमान।`,
      },
      tone: sunScore >= 75 ? "gold" : sunScore >= 55 ? "jade" : sunScore >= 40 ? "rose" : "neutral",
    });

    // Moon-Moon compatibility (emotional)
    const moonScore = SIGN_COMPAT[input.a.moonSign]?.[input.b.moonSign] ?? 50;
    aspects.push({
      name: "Moon · Moon",
      score: moonScore,
      description: {
        en: `${input.a.moonSign} Moon with ${input.b.moonSign} Moon — emotional flow.`,
        ru: `Луна в ${input.a.moonSign} с Луной в ${input.b.moonSign} — эмоциональный поток.`,
        hi: `${input.a.moonSign} चंद्रमा ${input.b.moonSign} चंद्रमा के साथ — भावनात्मक प्रवाह।`,
      },
      tone: moonScore >= 75 ? "jade" : moonScore >= 55 ? "gold" : moonScore >= 40 ? "rose" : "neutral",
    });

    // Element harmony (Sun signs elements)
    const aElement = SIGN_ELEMENT[input.a.sunSign] ?? "Spirit";
    const bElement = SIGN_ELEMENT[input.b.sunSign] ?? "Spirit";
    const elementScore = aElement === bElement ? 80 : 60;
    aspects.push({
      name: "Element harmony",
      score: elementScore,
      description: {
        en: `${aElement} meets ${bElement} — elemental dance.`,
        ru: `${aElement} встречает ${bElement} — танец стихий.`,
        hi: `${aElement} ${bElement} से मिलता है — तत्व नृत्य।`,
      },
      tone: elementScore >= 75 ? "gold" : "jade",
    });

    // BaZi Day Master compatibility
    let baZiCompatibility: number | null = null;
    if (input.a.dayMasterElement && input.b.dayMasterElement) {
      baZiCompatibility = ELEMENT_COMPAT[input.a.dayMasterElement]?.[input.b.dayMasterElement] ?? 50;
      aspects.push({
        name: "Day Master · Day Master",
        score: baZiCompatibility,
        description: {
          en: `${input.a.dayMasterElement} × ${input.b.dayMasterElement} — five-element resonance.`,
          ru: `${input.a.dayMasterElement} × ${input.b.dayMasterElement} — резонанс пяти стихий.`,
          hi: `${input.a.dayMasterElement} × ${input.b.dayMasterElement} — पंच-तत्व गुंजयमान।`,
        },
        tone: baZiCompatibility >= 75 ? "gold" : baZiCompatibility >= 55 ? "jade" : baZiCompatibility >= 40 ? "rose" : "neutral",
      });
    }

    // Western overall = weighted Sun/Moon/Element
    const westernCompatibility = Math.round(sunScore * 0.4 + moonScore * 0.4 + elementScore * 0.2);

    // Overall
    const scores = aspects.map((a) => a.score);
    const overall = baZiCompatibility !== null
      ? Math.round((westernCompatibility * 0.6 + baZiCompatibility * 0.4))
      : westernCompatibility;

    const tone: CompatibilityResult["tone"] = overall >= 75 ? "gold" : overall >= 60 ? "jade" : overall >= 45 ? "rose" : "neutral";

    return {
      overall,
      tone,
      aspects,
      summary: {
        en: overall >= 75 ? "A magnetic connection — complementary forces." :
            overall >= 60 ? "A nurturing flow with room for growth." :
            overall >= 45 ? "A teaching connection — friction that refines." :
            "A karmic mirror — what you resist, you meet.",
        ru: overall >= 75 ? "Магнетическая связь — дополняющие силы." :
            overall >= 60 ? "Питающий поток с пространством для роста." :
            overall >= 45 ? "Учительная связь — трение, что оттачивает." :
            "Кармическое зеркало — что отвергаешь, то встречаешь.",
        hi: overall >= 75 ? "एक चुंबकीय संबंध — पूरक शक्तियाँ।" :
            overall >= 60 ? "विकास के लिए स्थान के साथ पोषक प्रवाह।" :
            overall >= 45 ? "एक शिक्षण संबंध — घर्षण जो निखारता है।" :
            "एक कार्मिक दर्पण — जिसे आप प्रतिरोध करते हैं, आप मिलते हैं।",
      },
      baZiCompatibility,
      westernCompatibility,
    };
  }
}
