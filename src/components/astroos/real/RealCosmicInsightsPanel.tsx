"use client";
/**
 * RealCosmicInsightsPanel — cross-system synthesis from real chart data.
 * Combines Western astrology + BaZi + Planetary Strengths into narrative insights.
 * Replaces the hardcoded "cross-system synthesis" section in SelfScreen.
 *
 * Pulls from /api/calculate (planet positions, ascendant) and /api/bazi/calculate
 * to generate dynamic insights based on actual chart data.
 */
import { useState, useEffect, useMemo } from "react";
import { GlassCard, Pill, FadeIn } from "../ui";
import { motion } from "framer-motion";
import { Sparkles, Brain, Zap, Heart, Shield, Star } from "lucide-react";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";

const ZODIAC_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const ZODIAC_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const ZODIAC_ELEMENTS: Record<string, "Fire"|"Earth"|"Air"|"Water"> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};
const ZODIAC_QUALITIES: Record<string, "Cardinal"|"Fixed"|"Mutable"> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

const ELEMENT_COLORS: Record<string, string> = {
  Fire: "#EF4444", Earth: "#D98E7A", Air: "#FBBF24", Water: "#60A5FA",
  Wood: "#5BB89C", Metal: "#94A3B8",
};

const ELEMENT_ARCHETYPES: Record<string, { en: string; ru: string; hi: string }> = {
  Fire: { en: "passion · creativity · leadership", ru: "страсть · творчество · лидерство", hi: "जुनून · रचनात्मकता · नेतृत्व" },
  Earth: { en: "stability · practicality · patience", ru: "стабильность · практичность · терпение", hi: "स्थिरता · व्यावहारिकता · धैर्य" },
  Air: { en: "intellect · communication · freedom", ru: "интеллект · общение · свобода", hi: "बुद्धि · संवाद · स्वतंत्रता" },
  Water: { en: "emotion · intuition · depth", ru: "эмоции · интуиция · глубина", hi: "भावना · अंतर्ज्ञान · गहराई" },
};

interface PlanetPos { planet: string; eclipticLonDeg: number; }

interface BaZiData {
  dayMaster: string;
  dayMasterElement: string;
  dayMasterYinYang: string;
  elementBalance: Record<string, number>;
  luckPillars: Array<{ stem: string; branch: string; startAge: number; endAge: number }>;
}

interface Insight {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "gold" | "jade" | "rose";
}

export function RealCosmicInsightsPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [planets, setPlanets] = useState<PlanetPos[]>([]);
  const [ascendant, setAscendant] = useState(0);
  const [bazi, setBazi] = useState<BaZiData | null>(null);
  const [loading, setLoading] = useState(true);
  const { member } = useMember();

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  useEffect(() => {
    const m = member ?? mockMember();
    const birth = {
      birthDateTime: m.birth.isoDateTime,
      birthLat: m.birth.lat, birthLng: m.birth.lng,
      birthTzOffset: m.birth.tzOffset, birthPlaceName: m.birth.placeName,
      gender: m.birth.gender,
    };
    Promise.all([
      fetch("/api/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(birth) }).then(r => r.json()),
      fetch("/api/bazi/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(birth) }).then(r => r.json()),
    ])
      .then(([calc, bz]) => {
        setPlanets(calc.planetPositions ?? []);
        setAscendant(calc.ascendantLonDeg ?? 0);
        setBazi(bz.bazi ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [member]);

  const insights = useMemo<Insight[]>(() => {
    if (planets.length === 0 || !bazi) return [];
    const out: Insight[] = [];

    const sun = planets.find(p => p.planet === "Sun");
    const moon = planets.find(p => p.planet === "Moon");
    const asc = ascendant;
    if (!sun || !moon) return out;

    const sunSign = ZODIAC_NAMES[Math.floor((((sun.eclipticLonDeg % 360) + 360) % 360) / 30)];
    const moonSign = ZODIAC_NAMES[Math.floor((((moon.eclipticLonDeg % 360) + 360) % 360) / 30)];
    const ascSign = ZODIAC_NAMES[Math.floor((((asc % 360) + 360) % 360) / 30)];
    const sunEl = ZODIAC_ELEMENTS[sunSign];
    const moonEl = ZODIAC_ELEMENTS[moonSign];
    const ascEl = ZODIAC_ELEMENTS[ascSign];

    // Insight 1: Sun-Moon resonance
    const sunMoonResonance = sunEl === moonEl
      ? t("двойное усиление", "double amplification", "दोहरी प्रवर्धन")
      : (sunEl === "Fire" && moonEl === "Air") || (sunEl === "Air" && moonEl === "Fire") ||
        (sunEl === "Earth" && moonEl === "Water") || (sunEl === "Water" && moonEl === "Earth")
      ? t("гармоничное дополнение", "harmonious complement", "सामंजस्यपूर्ण पूरक")
      : t("творческое напряжение", "creative tension", "रचनात्मक तनाव");

    out.push({
      icon: <Star className="w-4 h-4" />,
      title: t("Резонанс Солнце—Луна", "Sun—Moon Resonance", "सूर्य—चंद्र गुंजयमान"),
      body: locale === "ru"
        ? `Ваше Солнце в ${sunSign} (${sunEl}) и Луна в ${moonSign} (${moonEl}) создают ${sunMoonResonance}. ${sunEl === moonEl ? "Ваша воля и эмоции движутся в одном направлении." : "Ваш внутренний мир и внешнее выражение имеют разную природу — это источник глубины."}`
        : locale === "hi"
        ? `आपका सूर्य ${sunSign} (${sunEl}) में और चंद्रमा ${moonSign} (${moonEl}) में ${sunMoonResonance} बनाते हैं। ${sunEl === moonEl ? "आपकी इच्छा और भावनाएँ एक दिशा में चलती हैं।" : "आपका आंतरिक और बाहरी जगत अलग प्रकृति के हैं — यह गहराई का स्रोत है।"}`
        : `Your Sun in ${sunSign} (${sunEl}) and Moon in ${moonSign} (${moonEl}) create ${sunMoonResonance}. ${sunEl === moonEl ? "Your will and emotions move in one direction." : "Your inner world and outer expression have different natures — a source of depth."}`,
      tone: sunEl === moonEl ? "gold" : "jade",
    });

    // Insight 2: Western-BaZi Day Master cross-reference
    const dayMasterEl = bazi.dayMasterElement;
    const westernEl: string = sunEl;
    const crossTone = dayMasterEl === westernEl
      ? "gold"
      : (dayMasterEl === "Wood" && westernEl === "Fire") || (dayMasterEl === "Fire" && westernEl === "Earth") ||
        (dayMasterEl === "Earth" && westernEl === "Metal") || (dayMasterEl === "Metal" && westernEl === "Water") ||
        (dayMasterEl === "Water" && westernEl === "Wood")
      ? "jade"
      : "rose";

    out.push({
      icon: <Brain className="w-4 h-4" />,
      title: t("Запад × Восток", "West × East", "पश्चिम × पूर्व"),
      body: locale === "ru"
        ? `Ваш западный элемент (${westernEl}) через Солнце в ${sunSign} и ваш Day Master ${bazi.dayMaster} (${dayMasterEl} ${bazi.dayMasterYinYang}) в BaZi ${dayMasterEl === westernEl ? "резонируют" : "дополняют друг друга"}. Это уникальное для AstroOS соответствие — обе системы описывают одну и ту же душу разными языками.`
        : locale === "hi"
        ? `आपका पश्चिमी तत्व (${westernEl}) ${sunSign} में सूर्य के माध्यम से और आपका Day Master ${bazi.dayMaster} (${dayMasterEl} ${bazi.dayMasterYinYang}) BaZi में ${dayMasterEl === westernEl ? "गूंजते हैं" : "एक-दूसरे को पूरक हैं"}। यह AstroOS के लिए अद्वितीय है — दोनों प्रणालियाँ एक ही आत्मा का वर्णन अलग भाषाओं में करती हैं।`
        : `Your Western element (${westernEl}) via Sun in ${sunSign} and your Day Master ${bazi.dayMaster} (${dayMasterEl} ${bazi.dayMasterYinYang}) in BaZi ${dayMasterEl === westernEl ? "resonate" : "complement each other"}. Unique to AstroOS — both systems describe the same soul in different languages.`,
      tone: crossTone,
    });

    // Insight 3: Element balance synthesis
    const baziElements = bazi.elementBalance;
    const dominantBaZi = Object.entries(baziElements).sort((a, b) => b[1] - a[1])[0];
    const deficientBaZi = Object.entries(baziElements).sort((a, b) => a[1] - b[1])[0];

    // Western element distribution from Sun, Moon, Mercury, Venus, Mars
    const personalPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars"]
      .map(k => planets.find(p => p.planet === k))
      .filter(Boolean) as PlanetPos[];
    const westernElCount: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    personalPlanets.forEach(p => {
      const sign = ZODIAC_NAMES[Math.floor((((p.eclipticLonDeg % 360) + 360) % 360) / 30)];
      const el = ZODIAC_ELEMENTS[sign];
      if (el) westernElCount[el]++;
    });
    const dominantWestern = Object.entries(westernElCount).sort((a, b) => b[1] - a[1])[0];

    out.push({
      icon: <Zap className="w-4 h-4" />,
      title: t("Баланс стихий", "Element Balance", "तत्व संतुलन"),
      body: locale === "ru"
        ? `Запад: доминирует ${dominantWestern[0]} (${dominantWestern[1]} из 5 личных планет). BaZi: избыток ${dominantBaZi[0]} (${dominantBaZi[1]}), дефицит ${deficientBaZi[0]} (${deficientBaZi[1]}). Ваша стихийная подпись — ${dominantWestern[0]} + ${dominantBaZi[0]}.`
        : locale === "hi"
        ? `पश्चिम: प्रधान ${dominantWestern[0]} (${dominantWestern[1]}/5 व्यक्तिगत ग्रह)। BaZi: अधिक ${dominantBaZi[0]} (${dominantBaZi[1]}), कमी ${deficientBaZi[0]} (${deficientBaZi[1]})। आपका तत्व हस्ताक्षर — ${dominantWestern[0]} + ${dominantBaZi[0]}।`
        : `Western: dominant ${dominantWestern[0]} (${dominantWestern[1]}/5 personal planets). BaZi: excess ${dominantBaZi[0]} (${dominantBaZi[1]}), deficient ${deficientBaZi[0]} (${deficientBaZi[1]}). Your elemental signature — ${dominantWestern[0]} + ${dominantBaZi[0]}.`,
      tone: "jade",
    });

    // Insight 4: Ascendant archetype
    const ascQuality = ZODIAC_QUALITIES[ascSign];
    out.push({
      icon: <Shield className="w-4 h-4" />,
      title: t("Архетип Асцендента", "Ascendant Archetype", "लग्न आदर्श"),
      body: locale === "ru"
        ? `Асцендент в ${ascSign} (${ascEl}, ${ascQuality}) — ваша социальная маска и первый отклик миру. ${ascQuality === "Cardinal" ? "Вы инициируете — начинаете первым." : ascQuality === "Fixed" ? "Вы устойчивы — удерживаете позиции." : "Вы адаптивны — движетесь вместе с изменениями."} В сочетании с ${sunSign} Солнцем это создаёт ваш уникальный первый впечатление.`
        : locale === "hi"
        ? `${ascSign} (${ascEl}, ${ascQuality}) में लग्न — आपका सामाजिक मुखौटा और दुनिया के प्रति पहला प्रतिक्रिया। ${ascQuality === "Cardinal" ? "आप पहल करते हैं।" : ascQuality === "Fixed" ? "आप स्थिर हैं।" : "आप अनुकूल हैं।"} ${sunSign} सूर्य के साथ यह आपकी अनूठी पहली छाप बनाता है।`
        : `Ascendant in ${ascSign} (${ascEl}, ${ascQuality}) — your social mask and first response to the world. ${ascQuality === "Cardinal" ? "You initiate — you start first." : ascQuality === "Fixed" ? "You're stable — you hold your ground." : "You're adaptive — you move with change."} Combined with your ${sunSign} Sun, this creates your unique first impression.`,
      tone: "rose",
    });

    // Insight 5: Current Luck Pillar (if available)
    if (bazi.luckPillars && bazi.luckPillars.length > 0) {
      const age = member?.age ?? 36;
      const currentLp = bazi.luckPillars.find(lp => age >= lp.startAge && age < lp.endAge) ?? bazi.luckPillars[0];
      out.push({
        icon: <Heart className="w-4 h-4" />,
        title: t("Текущий Luck Pillar", "Current Luck Pillar", "वर्तमान भाग्य स्तंभ"),
        body: locale === "ru"
          ? `Сейчас вам ~${age} лет — вы в Luck Pillar ${currentLp.stem}${currentLp.branch} (возраст ${currentLp.startAge}-${currentLp.endAge}). Эта 10-летняя фаза приносит энергию ${currentLp.stem} и ${currentLp.branch}. В сочетании с вашим Day Master ${bazi.dayMaster} она определяет текущие темы роста.`
          : locale === "hi"
          ? `अभी आप ~${age} वर्ष के हैं — आप Luck Pillar ${currentLp.stem}${currentLp.branch} (आयु ${currentLp.startAge}-${currentLp.endAge}) में हैं। यह 10-वर्षीय चरण ${currentLp.stem} और ${currentLp.branch} की ऊर्जा लाता है।`
          : `You're ~${age} years old — in Luck Pillar ${currentLp.stem}${currentLp.branch} (age ${currentLp.startAge}-${currentLp.endAge}). This 10-year phase brings ${currentLp.stem} and ${currentLp.branch} energy. Combined with your Day Master ${bazi.dayMaster}, it defines current growth themes.`,
        tone: "gold",
      });
    }

    return out;
  }, [planets, ascendant, bazi, member, locale, t]);

  if (loading) {
    return (
      <GlassCard variant="gold" className="p-5" ornamental>
        <div className="flex items-center justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "#E8B86D", borderRightColor: "#5BB89C" }}
          >
            <Sparkles className="w-4 h-4 m-auto mt-2.5" style={{ color: "#E8B86D" }} />
          </motion.div>
        </div>
      </GlassCard>
    );
  }

  if (insights.length === 0) return null;

  const toneColors: Record<string, string> = {
    gold: "#E8B86D", jade: "#5BB89C", rose: "#D98E7A",
  };

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative astro-card-sheen" ornamental glow>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(232,184,109,0.08) 0%, transparent 70%)",
        }} />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: "#E8B86D" }} />
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t("Космические инсайты", "Cosmic Insights", "ब्रह्मांडीय अंतर्दृष्टि")}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "#E8B86D20", color: "#E8B86D" }}>
              {t("Кросс-системный синтез", "Cross-system synthesis", "क्रॉस-सिस्टम संश्लेषण")}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((insight, i) => {
              const color = toneColors[insight.tone];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-lg p-3.5 transition-all hover:scale-[1.02]"
                  style={{ background: `${color}08`, border: `1px solid ${color}25` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: `${color}15`, color }}>
                      {insight.icon}
                    </span>
                    <h4 className="font-serif text-[13px] font-medium" style={{ color }}>
                      {insight.title}
                    </h4>
                  </div>
                  <p className="text-[11.5px] leading-relaxed text-[#9A9AA8]">
                    {insight.body}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-4 text-center text-[10px] text-[#8A8A96] italic">
            {t(
              "Сгенерировано из ваших реальных позиций планет + BaZi. Не чат-генерация — чистая астрология.",
              "Generated from your real planet positions + BaZi. Not chat-generated — pure astrology.",
              "आपके वास्तविक ग्रह स्थितियों + BaZi से उत्पन्न। चैट-जनित नहीं — शुद्ध ज्योतिष।"
            )}
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealCosmicInsightsPanel;
