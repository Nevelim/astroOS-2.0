/**
 * affirmation-fallbacks — hand-written first-person affirmations per zodiac sign.
 *
 * Used as the FALLBACK tier (X-Cache: FALLBACK) when:
 *   1. The ZAI LLM call fails (typically 429 rate-limit, also network/500),
 *   AND
 *   2. No stale cache entry is available to serve as a graceful degradation.
 *
 * Each affirmation is one sentence (max two), first person ("I"), empowering
 * but grounded, with a metaphor drawn from nature/cosmos. Mirrors the live
 * LLM prompt so users get a coherent experience even when offline.
 */

export interface AffirmationText {
  en: string;
  ru: string;
  hi: string;
}

export const AFFIRMATION_FALLBACKS: Record<string, AffirmationText> = {
  Aries: {
    en: "I lead with courage, not recklessness. My fire warms, never burns.",
    ru: "Я веду с мужеством, не с безрассудством. Мой огонь греет, не обжигает.",
    hi: "मैं साहस से नेतृत्व करता हूँ, उतावलेपन से नहीं। मेरी आग गर्म करती है, जलाती नहीं।",
  },
  Taurus: {
    en: "I root deeply and bloom slowly. Patience is my superpower.",
    ru: "Я укореняюсь глубоко и расцветаю медленно. Терпение — моя суперсила.",
    hi: "मैं गहराई से जड़ें जमाता हूँ और धीरे खिलता हूँ। धैर्य मेरी सुपरशक्ति है।",
  },
  Gemini: {
    en: "I hold many truths without fragmenting. My mind is a library, not a maze.",
    ru: "Я держу множество истин не дробясь. Мой ум — библиотека, не лабиринт.",
    hi: "मैं कई सत्यों को बिना टूटे थामता हूँ। मेरा मन पुस्तकालय है, भूलभुलैया नहीं।",
  },
  Cancer: {
    en: "I tend the hearth of my own heart first. From fullness, I nurture.",
    ru: "Я сначала забочусь об очаге своего сердца. Из полноты — питаю других.",
    hi: "मैं पहले अपने हृदय की आग सँभालता हूँ। पूर्णता से, मैं पोषण करता हूँ।",
  },
  Leo: {
    en: "I shine without dimming others. My light is generous, not greedy.",
    ru: "Я сияю не затмевая других. Мой свет щедр, не жаден.",
    hi: "मैं दूसरों को मद्धम किए बिना चमकता हूँ। मेरा प्रकाश उदार है, लालची नहीं।",
  },
  Virgo: {
    en: "I refine without punishing. My discernment is a scalpel, not a sword.",
    ru: "Я совершенствую без наказания. Моя проницательность — скальпель, не меч.",
    hi: "मैं दंड दिए बिना परिष्कृत करता हूँ। मेरा भेद ऊँची छुरी है, तलवार नहीं।",
  },
  Libra: {
    en: "I balance without erasing myself. Harmony includes me.",
    ru: "Я балансирую не стирая себя. Гармония включает меня.",
    hi: "मैं खुद को मिटाए बिना संतुलन रखता हूँ। सामंजस्य मुझे शामिल करता है।",
  },
  Scorpio: {
    en: "I do not shrink to fit rooms built without me. I bring my full tide.",
    ru: "Я не уменьшаюсь, чтобы поместиться в комнатах, построенных без меня. Я приношу свой полный прилив.",
    hi: "मैं उन कमरों में छोटा नहीं होता जो मेरे बिना बने। मैं अपना पूरा ज्वार लाता हूँ।",
  },
  Sagittarius: {
    en: "I seek truth without fleeing comfort. My arrow finds meaning, not escape.",
    ru: "Я ищу истину не убегая от уюта. Моя стрела находит смысл, не побег.",
    hi: "मैं आराम से भागे बिना सत्य खोजता हूँ। मेरा तीर अर्थ खोजता है, भागना नहीं।",
  },
  Capricorn: {
    en: "I climb with rest built in. The summit is a view, not a cage.",
    ru: "Я взбираюсь с встроенным отдыхом. Вершина — вид, не клетка.",
    hi: "मैं आराम सहित चढ़ता हूँ। शिखर एक दृश्य है, पिंजरा नहीं।",
  },
  Aquarius: {
    en: "I innovate without isolating. My future includes the present.",
    ru: "Я новаторствую не изолируясь. Моё будущее включает настоящее.",
    hi: "मैं अलग हुए बिना नवाचार करता हूँ। मेरा भविष्य वर्तमान को शामिल करता है।",
  },
  Pisces: {
    en: "I flow without dissolving. My depths have a shore.",
    ru: "Я теку не растворяясь. Мои глубины имеют берег.",
    hi: "मैं बिना घुले बहता हूँ। मेरी गहराई का किनारा है।",
  },
};

/** Returns the fallback affirmation for a sign, defaulting to Scorpio. */
export function getAffirmationFallback(sign: string): AffirmationText {
  return AFFIRMATION_FALLBACKS[sign] ?? AFFIRMATION_FALLBACKS.Scorpio;
}
