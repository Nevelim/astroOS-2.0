"use client";
/**
 * RealAspectsPanel — natal chart aspects (angular relationships between planets).
 * Uses /api/calculate for real planet positions, then computes aspects.
 * Clean Architecture: Interface Adapter.
 * Hades 2 visual: SVG aspect grid, color-coded lines, aspect cards.
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

const ASPECT_ANGLES = [
  { name: "conjunct", angle: 0, orb: 8, symbol: "☌", tone: "gold" as const },
  { name: "sextile", angle: 60, orb: 6, symbol: "⚹", tone: "jade" as const },
  { name: "square", angle: 90, orb: 7, symbol: "☐", tone: "rose" as const },
  { name: "trine", angle: 120, orb: 8, symbol: "△", tone: "jade" as const },
  { name: "opposite", angle: 180, orb: 8, symbol: "☍", tone: "rose" as const },
];

const TONE_COLORS: Record<string, string> = {
  gold: "#E8B86D",
  jade: "#5BB89C",
  rose: "#D98E7A",
};

const ASPECT_MEANINGS: Record<string, { en: string; ru: string; hi: string }> = {
  conjunct: { en: "fusion, intensity, unity", ru: "слияние, интенсивность, единство", hi: "विलय, तीव्रता, एकता" },
  sextile: { en: "opportunity, harmony, flow", ru: "возможность, гармония, поток", hi: "अवसर, सामंजस्य, प्रवाह" },
  square: { en: "tension, challenge, growth", ru: "напряжение, вызов, рост", hi: "तनाव, चुनौती, विकास" },
  trine: { en: "ease, talent, flow", ru: "лёгкость, талант, поток", hi: "सहज, प्रतिभा, प्रवाह" },
  opposite: { en: "polarity, awareness, balance", ru: "полярность, осознанность, баланс", hi: "ध्रुवीकरण, जागरूकता, संतुलन" },
};

interface PlanetPos {
  planet: string;
  eclipticLonDeg: number;
  eclipticLatDeg: number;
}

interface ComputedAspect {
  planet1: string;
  planet2: string;
  aspectName: string;
  aspectSymbol: string;
  angleDiff: number;
  exactAngle: number;
  orb: number;
  tone: "gold" | "jade" | "rose";
  isApplying: boolean;
}

function computeAspects(planets: PlanetPos[]): ComputedAspect[] {
  const aspects: ComputedAspect[] = [];
  const mainPlanets = planets.filter((p) => MAIN_PLANETS.includes(p.planet));

  for (let i = 0; i < mainPlanets.length; i++) {
    for (let j = i + 1; j < mainPlanets.length; j++) {
      const p1 = mainPlanets[i];
      const p2 = mainPlanets[j];
      let diff = Math.abs(p1.eclipticLonDeg - p2.eclipticLonDeg);
      if (diff > 180) diff = 360 - diff;

      for (const asp of ASPECT_ANGLES) {
        const orbDiff = Math.abs(diff - asp.angle);
        if (orbDiff <= asp.orb) {
          // Determine if applying (faster planet approaching exact)
          const speed1 = getRelativeSpeed(p1.planet);
          const speed2 = getRelativeSpeed(p2.planet);
          const isApplying = speed1 > speed2 ? orbDiff > 0 : orbDiff > 0;
          // Simplified: if the difference is decreasing it's applying
          // For natal chart, we use a simple heuristic: closer to exact = applying
          const isApplyingAspect = orbDiff > 0.5;

          aspects.push({
            planet1: p1.planet,
            planet2: p2.planet,
            aspectName: asp.name,
            aspectSymbol: asp.symbol,
            angleDiff: diff,
            exactAngle: asp.angle,
            orb: orbDiff,
            tone: asp.tone,
            isApplying: isApplyingAspect,
          });
          break; // Only take the closest aspect type
        }
      }
    }
  }

  return aspects;
}

function getRelativeSpeed(planet: string): number {
  const speeds: Record<string, number> = {
    Moon: 13, Mercury: 1.2, Venus: 1.1, Sun: 1, Mars: 0.5,
    Jupiter: 0.08, Saturn: 0.03, Uranus: 0.01, Neptune: 0.006, Pluto: 0.004,
  };
  return speeds[planet] ?? 0;
}

export function RealAspectsPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
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

  const aspects = useMemo(() => computeAspects(planets), [planets]);

  // SVG params
  const SIZE = 320;
  const CENTER = SIZE / 2;
  const PLANET_R = 135;

  const lonToXY = (lon: number, radius: number) => {
    const angle = ((lon - ascendant) * Math.PI) / 180;
    return {
      x: CENTER + radius * Math.cos(angle),
      y: CENTER - radius * Math.sin(angle),
    };
  };

  if (loading) {
    return (
      <GlassCard variant="jade" className="p-5" ornamental glow>
        <div className="flex flex-col items-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 rounded-full border-2 border-transparent flex items-center justify-center"
            style={{ borderTopColor: "#5BB89C", borderRightColor: "#E8B86D" }}
          >
            <span className="text-xl" style={{ color: "#E8B86D", fontFamily: "serif" }}>☉</span>
          </motion.div>
          <p className="mt-3 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
            {t("Вычисляю аспекты натальной карты...", "Computing natal aspects...", "जन्म पहलू की गणना कर रहा हूँ...")}
          </p>
        </div>
      </GlassCard>
    );
  }

  const mainPlanets = planets.filter((p) => MAIN_PLANETS.includes(p.planet));

  return (
    <FadeIn>
      <GlassCard variant="jade" className="p-5 relative" ornamental glow>
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(91,184,156,0.1) 0%, transparent 70%)",
        }} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: "#5BB89C" }} />
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t("Аспекты натальной карты", "Natal Aspects", "जन्म पहलू")}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "#5BB89C20", color: "#5BB89C" }}>
              {aspects.length} {t("аспектов", "aspects computed", "पहलू गणित")}
            </span>
          </div>

          {/* SVG aspect grid */}
          <div className="flex justify-center mb-4">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full">
              {/* Outer circle */}
              <circle cx={CENTER} cy={CENTER} r={PLANET_R + 10} fill="none" stroke="rgba(91,184,156,0.2)" strokeWidth="1" />
              <circle cx={CENTER} cy={CENTER} r={PLANET_R} fill="none" stroke="rgba(91,184,156,0.15)" strokeWidth="0.5" strokeDasharray="3 3" />

              {/* Aspect lines */}
              {aspects.map((asp, i) => {
                const p1 = mainPlanets.find((p) => p.planet === asp.planet1);
                const p2 = mainPlanets.find((p) => p.planet === asp.planet2);
                if (!p1 || !p2) return null;
                const pos1 = lonToXY(p1.eclipticLonDeg, PLANET_R);
                const pos2 = lonToXY(p2.eclipticLonDeg, PLANET_R);
                const color = TONE_COLORS[asp.tone];
                return (
                  <motion.line
                    key={`${asp.planet1}-${asp.planet2}-${asp.aspectName}`}
                    x1={pos1.x} y1={pos1.y}
                    x2={pos2.x} y2={pos2.y}
                    stroke={color}
                    strokeWidth={asp.aspectName === "conjunct" ? 2.5 : 1.2}
                    opacity={0.5}
                    strokeDasharray={asp.isApplying ? "none" : "4 3"}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.5 }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                  />
                );
              })}

              {/* Planets on the circle */}
              {mainPlanets.map((p, i) => {
                const pos = lonToXY(p.eclipticLonDeg, PLANET_R);
                const color = PLANET_COLORS[p.planet] ?? "#E8B86D";
                const glyph = PLANET_GLYPHS[p.planet] ?? "•";
                return (
                  <motion.g
                    key={p.planet}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.06, type: "spring", stiffness: 200 }}
                  >
                    <circle cx={pos.x} cy={pos.y} r="10" fill="#0B0B0F" stroke={color} strokeWidth="1"
                      style={{ filter: `drop-shadow(0 0 3px ${color}80)` }} />
                    <text x={pos.x} y={pos.y} fontSize="12" fill={color} textAnchor="middle" dominantBaseline="central"
                      style={{ fontFamily: "serif" }}>
                      {glyph}
                    </text>
                  </motion.g>
                );
              })}

              {/* Center */}
              <circle cx={CENTER} cy={CENTER} r="3" fill="#5BB89C" style={{ filter: "drop-shadow(0 0 4px #5BB89C)" }} />
            </svg>
          </div>

          {/* Aspect list */}
          <div className="max-h-96 overflow-y-auto scrollbar-astro space-y-2">
            {aspects.map((asp, i) => {
              const color = TONE_COLORS[asp.tone];
              const meaning = ASPECT_MEANINGS[asp.aspectName];
              const p1Color = PLANET_COLORS[asp.planet1] ?? "#E8B86D";
              const p2Color = PLANET_COLORS[asp.planet2] ?? "#E8B86D";
              return (
                <motion.div
                  key={`${asp.planet1}-${asp.planet2}-${asp.aspectName}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 + 0.5 }}
                  className="rounded-lg border p-2.5 flex items-center gap-2 text-[12px]"
                  style={{
                    background: `${color}08`,
                    borderColor: `${color}25`,
                  }}
                >
                  {/* Planet glyphs + aspect symbol */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span style={{ color: p1Color, fontFamily: "serif" }} className="text-base">
                      {PLANET_GLYPHS[asp.planet1]}
                    </span>
                    <span style={{ color }} className="text-sm font-bold">
                      {asp.aspectSymbol}
                    </span>
                    <span style={{ color: p2Color, fontFamily: "serif" }} className="text-base">
                      {PLANET_GLYPHS[asp.planet2]}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "#F5F0E8" }} className="font-medium truncate">
                        {asp.planet1} – {asp.planet2}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded capitalize shrink-0"
                        style={{ background: `${color}20`, color }}>
                        {asp.aspectName}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#9A9AA8] mt-0.5">
                      {asp.exactAngle}° · orb {asp.orb.toFixed(1)}°
                      {!asp.isApplying && (
                        <span className="ml-1 text-[#6B6B78]">({t("разделяющий", "separating", "अलग होने वाला")})</span>
                      )}
                    </div>
                    {meaning && (
                      <div className="text-[10px] mt-0.5" style={{ color: `${color}CC` }}>
                        {locale === "ru" ? meaning.ru : locale === "hi" ? meaning.hi : meaning.en}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#6B6B78]">
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 rounded" style={{ background: "#E8B86D" }} /> {t("Соединение", "Conjunct", "युक्त")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 rounded" style={{ background: "#5BB89C" }} /> {t("Трин / Секстиль", "Trine / Sextile", "त्रिकोण / षष्ठांश")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 rounded" style={{ background: "#D98E7A" }} /> {t("Квадрат / Оппозиция", "Square / Opposite", "वर्ग / विपरीत")}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 rounded border-t border-dashed" style={{ borderColor: "#6B6B78" }} /> {t("Разделяющий", "Separating", "अलग होने वाला")}
            </span>
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealAspectsPanel;
