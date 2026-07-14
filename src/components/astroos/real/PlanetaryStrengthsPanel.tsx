"use client";
/**
 * PlanetaryStrengthsPanel — essential dignity and strength for each natal planet.
 * Uses /api/calculate for real planet positions, then computes dignity scores.
 * Clean Architecture: Interface Adapter.
 * Hades 2 visual: horizontal bar chart, gold variant glass card.
 */
import { useState, useEffect, useMemo } from "react";
import { GlassCard, Pill, FadeIn } from "../ui";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☾", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "#FBBF24", Moon: "#C4D3E0", Mercury: "#60A5FA", Venus: "#F472B6",
  Mars: "#EF4444", Jupiter: "#A78BFA", Saturn: "#94A3B8",
  Uranus: "#22D3EE", Neptune: "#2DD4BF", Pluto: "#9333EA",
};

const MAIN_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

const ZODIAC_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const ZODIAC_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

// Rulerships: planet in its own sign = strong (+5)
const RULERSHIPS: Record<string, string[]> = {
  Mars: ["Aries", "Scorpio"],
  Venus: ["Taurus", "Libra"],
  Mercury: ["Gemini", "Virgo"],
  Moon: ["Cancer"],
  Sun: ["Leo"],
  Jupiter: ["Sagittarius", "Pisces"],
  Saturn: ["Capricorn", "Aquarius"],
};

// Exaltation: planet in exaltation sign = very strong (+4)
const EXALTATIONS: Record<string, string> = {
  Sun: "Aries",
  Moon: "Taurus",
  Mercury: "Virgo",
  Venus: "Pisces",
  Mars: "Capricorn",
  Jupiter: "Cancer",
  Saturn: "Libra",
};

// Detriment: planet in opposite sign of rulership = weak (-3)
// Fall: planet in opposite sign of exaltation = very weak (-2)
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

const DIGNITY_LABELS: Record<string, { en: string; ru: string; hi: string }> = {
  Ruler: { en: "Ruler", ru: "Управитель", hi: "स्वामी" },
  Exalted: { en: "Exalted", ru: "Экзальтация", hi: "उच्च" },
  Detriment: { en: "Detriment", ru: "Изгнание", hi: "नीच" },
  Fall: { en: "Fall", ru: "Падение", hi: "पतन" },
  Neutral: { en: "Neutral", ru: "Нейтрально", hi: "तटस्थ" },
};

interface PlanetPos {
  planet: string;
  eclipticLonDeg: number;
  eclipticLatDeg: number;
}

interface PlanetStrength {
  planet: string;
  sign: string;
  signGlyph: string;
  score: number;
  dignity: string; // "Ruler" | "Exalted" | "Detriment" | "Fall" | "Neutral"
  isAngular: boolean;
  degree: number;
}

function computeStrengths(planets: PlanetPos[], ascendant: number): PlanetStrength[] {
  const midheaven = (ascendant + 90) % 360;

  return planets
    .filter((p) => MAIN_PLANETS.includes(p.planet))
    .map((p) => {
      const lon = ((p.eclipticLonDeg % 360) + 360) % 360;
      const signIdx = Math.floor(lon / 30);
      const sign = ZODIAC_NAMES[signIdx];
      const signGlyph = ZODIAC_GLYPHS[signIdx];
      const degree = Math.floor(lon % 30);
      let score = 0;
      let dignity = "Neutral";

      // Check rulership (+5)
      if (RULERSHIPS[p.planet]?.includes(sign)) {
        score += 5;
        dignity = "Ruler";
      }
      // Check exaltation (+4)
      else if (EXALTATIONS[p.planet] === sign) {
        score += 4;
        dignity = "Exalted";
      }
      // Check detriment (-3)
      else if (DETRIMENTS[p.planet]?.includes(sign)) {
        score -= 3;
        dignity = "Detriment";
      }
      // Check fall (-2)
      else if (FALLS[p.planet] === sign) {
        score -= 2;
        dignity = "Fall";
      }

      // Angular check: near ASC/MC/DS/IC (+3)
      const ds = (ascendant + 180) % 360;
      const ic = (midheaven + 180) % 360;
      const isNearAngular =
        angularDist(lon, ascendant) < 10 ||
        angularDist(lon, midheaven) < 10 ||
        angularDist(lon, ds) < 10 ||
        angularDist(lon, ic) < 10;
      if (isNearAngular) {
        score += 3;
      }

      return { planet: p.planet, sign, signGlyph, score, dignity, isAngular: isNearAngular, degree };
    })
    .sort((a, b) => b.score - a.score);
}

function angularDist(a: number, b: number): number {
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d;
}

export function PlanetaryStrengthsPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [planets, setPlanets] = useState<PlanetPos[]>([]);
  const [ascendant, setAscendant] = useState(0);
  const [loading, setLoading] = useState(true);
  const { member } = useMember();

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  useEffect(() => {
    const birth = member ? {
      birthDateTime: member.birth.isoDateTime,
      birthLat: member.birth.lat,
      birthLng: member.birth.lng,
      birthTzOffset: member.birth.tzOffset,
      birthPlaceName: member.birth.placeName,
      gender: member.birth.gender,
    } : {
      birthDateTime: "1989-11-07T04:17",
      birthLat: 59.93, birthLng: 30.34, birthTzOffset: 3,
      birthPlaceName: "Saint Petersburg, RU", gender: 0 as const,
    };
    fetch("/api/calculate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(birth),
    })
      .then((r) => r.json())
      .then((d) => {
        setPlanets(d.planetPositions ?? []);
        setAscendant(d.ascendantLonDeg ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [member]);

  const strengths = useMemo(() => computeStrengths(planets, ascendant), [planets, ascendant]);

  if (loading) {
    return (
      <GlassCard variant="gold" className="p-5" shimmer>
        <div className="flex flex-col items-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 rounded-full border-2 border-transparent flex items-center justify-center"
            style={{ borderTopColor: "#E8B86D", borderRightColor: "#5BB89C" }}
          >
            <span className="text-xl" style={{ color: "#E8B86D", fontFamily: "serif" }}>♃</span>
          </motion.div>
          <p className="mt-3 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
            {t("Оцениваю силу планет...", "Assessing planetary strengths...", "ग्रह शक्ति का मूल्यांकन...")}
          </p>
        </div>
      </GlassCard>
    );
  }

  // Score range for bar visualization
  const maxAbsScore = 8;

  const getBarColor = (score: number) => {
    if (score >= 4) return "#E8B86D"; // gold — very strong
    if (score >= 1) return "#5BB89C"; // jade — positive
    if (score === 0) return "#8A8A96"; // gray — neutral
    if (score >= -2) return "#D98E7A"; // rose — weak
    return "#D98E7A"; // rose — very weak
  };

  const getDignityColor = (dignity: string) => {
    switch (dignity) {
      case "Ruler": return "#E8B86D";
      case "Exalted": return "#5BB89C";
      case "Detriment": return "#D98E7A";
      case "Fall": return "#D98E7A";
      default: return "#8A8A96";
    }
  };

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative" glow>
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(232,184,109,0.08) 0%, transparent 70%)",
        }} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: "#E8B86D" }} />
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t("Сила планет", "Planetary Strengths", "ग्रह शक्ति")}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "#E8B86D20", color: "#E8B86D" }}>
              {t("Существенные достоинства", "Essential Dignities", "आवश्यक गरिमा")}
            </span>
          </div>

          {/* Strength bars */}
          <div className="space-y-3">
            {strengths.map((s, i) => {
              const barColor = getBarColor(s.score);
              const dignityColor = getDignityColor(s.dignity);
              const planetColor = PLANET_COLORS[s.planet] ?? "#E8B86D";
              const glyph = PLANET_GLYPHS[s.planet] ?? "•";
              const barWidth = ((s.score + maxAbsScore) / (maxAbsScore * 2)) * 100;
              const dignityLabel = DIGNITY_LABELS[s.dignity];

              return (
                <motion.div
                  key={s.planet}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 + 0.2 }}
                  className="flex items-center gap-3"
                >
                  {/* Planet glyph */}
                  <div className="w-8 text-center shrink-0">
                    <span className="text-lg" style={{ color: planetColor, fontFamily: "serif" }}>
                      {glyph}
                    </span>
                  </div>

                  {/* Planet name + sign */}
                  <div className="w-20 shrink-0">
                    <div className="text-[12px] font-medium" style={{ color: "#F5F0E8" }}>{s.planet}</div>
                    <div className="text-[10px] flex items-center gap-1" style={{ color: "#9A9AA8" }}>
                      <span>{s.signGlyph}</span>
                      <span>{s.sign}</span>
                      <span className="text-[9px]">{s.degree}°</span>
                    </div>
                  </div>

                  {/* Strength bar */}
                  <div className="flex-1 min-w-0">
                    <div className="h-5 rounded-full overflow-hidden relative" style={{ background: "#1C1C26" }}>
                      {/* Center line (0 point) */}
                      <div className="absolute top-0 bottom-0 w-px bg-[#2A2A35]" style={{ left: "50%" }} />
                      {/* Bar from center */}
                      {s.score >= 0 ? (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(s.score / maxAbsScore) * 50}%` }}
                          transition={{ delay: i * 0.05 + 0.4, duration: 0.5 }}
                          className="absolute top-0 bottom-0 right-1/2 rounded-l-full"
                          style={{ background: `linear-gradient(to left, ${barColor}, ${barColor}80)` }}
                        />
                      ) : (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(Math.abs(s.score) / maxAbsScore) * 50}%` }}
                          transition={{ delay: i * 0.05 + 0.4, duration: 0.5 }}
                          className="absolute top-0 bottom-0 left-1/2 rounded-r-full"
                          style={{ background: `linear-gradient(to right, ${barColor}80, ${barColor})` }}
                        />
                      )}
                      {/* Score label */}
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold"
                        style={{ color: s.score >= 0 ? barColor : barColor }}>
                        {s.score > 0 ? "+" : ""}{s.score}
                      </div>
                    </div>
                  </div>

                  {/* Dignity label */}
                  <div className="w-20 shrink-0 text-right">
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: `${dignityColor}20`, color: dignityColor }}>
                      {locale === "ru" ? dignityLabel.ru : locale === "hi" ? dignityLabel.hi : dignityLabel.en}
                    </span>
                    {s.isAngular && (
                      <div className="text-[9px] mt-0.5" style={{ color: "#E8B86D" }}>
                        {t("Угловая", "Angular", "कोणीय")} ✦
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-[#8A8A96]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#E8B86D" }} />
              {t("Управитель (+5)", "Ruler (+5)", "स्वामी (+5)")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#5BB89C" }} />
              {t("Экзальтация (+4)", "Exalted (+4)", "उच्च (+4)")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#D98E7A" }} />
              {t("Изгнание/Падение (−3/−2)", "Detriment/Fall (−3/−2)", "नीच/पतन (−3/−2)")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#8A8A96" }} />
              {t("Нейтрально", "Neutral", "तटस्थ")}
            </span>
            <span className="flex items-center gap-1">
              ✦ {t("Угловая планета (+3)", "Angular planet (+3)", "कोणीय ग्रह (+3)")}
            </span>
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default PlanetaryStrengthsPanel;
