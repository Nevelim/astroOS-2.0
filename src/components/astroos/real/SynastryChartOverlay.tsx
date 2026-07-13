"use client";
/**
 * SynastryChartOverlay — bi-wheel natal chart overlay for couples.
 * Shows Person A's chart (inner) + Person B's chart (outer) with cross-aspects.
 * Uses /api/synastry for real astronomy-engine calculations.
 * Hades 2 visual: dual-color (gold + jade), animated draw-in, aspect lines.
 */
import { useState } from "react";
import { GlassCard, Pill, CosmicButton, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Loader2, Users, RotateCw } from "lucide-react";

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☾", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
};

const ZODIAC_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const ZODIAC_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

interface PlanetPos { planet: string; eclipticLonDeg: number; }

interface CrossAspect {
  planetA: string; planetB: string;
  aspectName: string; aspectSymbol: string;
  exactAngle: number; orb: number; tone: string;
  meaning: { en: string; ru: string; hi: string };
}

interface SynastryData {
  personA: { name: string; planetPositions: PlanetPos[]; ascendantLonDeg: number; midheavenLonDeg: number; };
  personB: { name: string; planetPositions: PlanetPos[]; ascendantLonDeg: number; midheavenLonDeg: number; };
  crossAspects: CrossAspect[];
  compatibility: { overall: number; harmony: number; tension: number; balance: number; };
  tone: string;
  keyThemes: CrossAspect[];
  elementsA: Record<string, number>;
  elementsB: Record<string, number>;
  aspectCount: number;
}

const TONE_COLORS: Record<string, string> = {
  gold: "#E8B86D", jade: "#5BB89C", rose: "#D98E7A",
};

export function SynastryChartOverlay({ locale }: { locale: "ru" | "en" | "hi" }) {
  // Default demo data (two people)
  const [personAName, setPersonAName] = useState("Aeliana");
  const [personABirth, setPersonABirth] = useState({
    birthDateTime: "1989-11-07T04:17",
    birthLat: 59.93, birthLng: 30.34, birthTzOffset: 3,
    birthPlaceName: "Saint Petersburg, RU", gender: 0 as const,
  });
  const [personBName, setPersonBName] = useState("Orion");
  const [personBBirth, setPersonBBirth] = useState({
    birthDateTime: "1985-06-15T19:30",
    birthLat: 48.85, birthLng: 2.35, birthTzOffset: 2,
    birthPlaceName: "Paris, FR", gender: 1 as const,
  });

  const [data, setData] = useState<SynastryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredAspect, setHoveredAspect] = useState<CrossAspect | null>(null);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  const handleCompute = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const r = await fetch("/api/synastry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personA: { name: personAName, birth: personABirth },
          personB: { name: personBName, birth: personBBirth },
        }),
      });
      const d = await r.json();
      if (d.error) { setError(d.error); }
      else { setData(d); }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // SVG geometry
  const SIZE = 420;
  const C = SIZE / 2;
  const OUTER_R = SIZE * 0.45;
  const ZODIAC_R = SIZE * 0.40;
  const INNER_R = SIZE * 0.32;
  const PERSON_B_R = SIZE * 0.30;
  const PERSON_A_R = SIZE * 0.20;

  const lonToXY = (lon: number, r: number, asc: number) => {
    const angle = ((lon - asc) * Math.PI) / 180;
    return { x: C + r * Math.cos(angle), y: C - r * Math.sin(angle) };
  };

  return (
    <FadeIn>
      <GlassCard variant="rose" className="p-5 relative astro-card-sheen" ornamental glow>
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(217,142,122,0.08) 0%, transparent 70%)",
        }} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: "#D98E7A" }} />
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t("Синастрия · карта пары", "Synastry · Couple Chart", "सिनास्ट्री · युगल चार्ट")}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "#D98E7A20", color: "#D98E7A" }}>
              astronomy-engine
            </span>
          </div>

          {/* Two-column inputs */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Person A */}
            <div className="rounded-lg p-3" style={{ background: "rgba(232,184,109,0.06)", border: "1px solid rgba(232,184,109,0.25)" }}>
              <div className="text-[10px] uppercase tracking-wider text-[#E8B86D] mb-2">
                {t("Человек A", "Person A", "व्यक्ति A")}
              </div>
              <input
                value={personAName}
                onChange={e => setPersonAName(e.target.value)}
                className="w-full px-2 py-1 rounded text-[12px] mb-2 focus:outline-none"
                style={{ background: "rgba(11,11,15,0.6)", border: "1px solid rgba(232,184,109,0.3)", color: "#F5F0E8" }}
                placeholder="Name"
              />
              <input
                type="datetime-local"
                value={personABirth.birthDateTime}
                onChange={e => setPersonABirth(p => ({ ...p, birthDateTime: e.target.value }))}
                className="w-full px-2 py-1 rounded text-[11px] mb-2 focus:outline-none [color-scheme:dark]"
                style={{ background: "rgba(11,11,15,0.6)", border: "1px solid rgba(232,184,109,0.3)", color: "#F5F0E8" }}
              />
              <input
                type="number" step="0.01" value={personABirth.birthLat}
                onChange={e => setPersonABirth(p => ({ ...p, birthLat: parseFloat(e.target.value) }))}
                className="w-full px-2 py-1 rounded text-[11px] mb-1 focus:outline-none"
                style={{ background: "rgba(11,11,15,0.6)", border: "1px solid rgba(232,184,109,0.3)", color: "#F5F0E8" }}
                placeholder="Lat"
              />
              <input
                type="number" step="0.01" value={personABirth.birthLng}
                onChange={e => setPersonABirth(p => ({ ...p, birthLng: parseFloat(e.target.value) }))}
                className="w-full px-2 py-1 rounded text-[11px] focus:outline-none"
                style={{ background: "rgba(11,11,15,0.6)", border: "1px solid rgba(232,184,109,0.3)", color: "#F5F0E8" }}
                placeholder="Lng"
              />
            </div>

            {/* Person B */}
            <div className="rounded-lg p-3" style={{ background: "rgba(91,184,156,0.06)", border: "1px solid rgba(91,184,156,0.25)" }}>
              <div className="text-[10px] uppercase tracking-wider text-[#5BB89C] mb-2">
                {t("Человек B", "Person B", "व्यक्ति B")}
              </div>
              <input
                value={personBName}
                onChange={e => setPersonBName(e.target.value)}
                className="w-full px-2 py-1 rounded text-[12px] mb-2 focus:outline-none"
                style={{ background: "rgba(11,11,15,0.6)", border: "1px solid rgba(91,184,156,0.3)", color: "#F5F0E8" }}
                placeholder="Name"
              />
              <input
                type="datetime-local"
                value={personBBirth.birthDateTime}
                onChange={e => setPersonBBirth(p => ({ ...p, birthDateTime: e.target.value }))}
                className="w-full px-2 py-1 rounded text-[11px] mb-2 focus:outline-none [color-scheme:dark]"
                style={{ background: "rgba(11,11,15,0.6)", border: "1px solid rgba(91,184,156,0.3)", color: "#F5F0E8" }}
              />
              <input
                type="number" step="0.01" value={personBBirth.birthLat}
                onChange={e => setPersonBBirth(p => ({ ...p, birthLat: parseFloat(e.target.value) }))}
                className="w-full px-2 py-1 rounded text-[11px] mb-1 focus:outline-none"
                style={{ background: "rgba(11,11,15,0.6)", border: "1px solid rgba(91,184,156,0.3)", color: "#F5F0E8" }}
                placeholder="Lat"
              />
              <input
                type="number" step="0.01" value={personBBirth.birthLng}
                onChange={e => setPersonBBirth(p => ({ ...p, birthLng: parseFloat(e.target.value) }))}
                className="w-full px-2 py-1 rounded text-[11px] focus:outline-none"
                style={{ background: "rgba(11,11,15,0.6)", border: "1px solid rgba(91,184,156,0.3)", color: "#F5F0E8" }}
                placeholder="Lng"
              />
            </div>
          </div>

          {/* Compute button */}
          <CosmicButton variant="rose" onClick={handleCompute} disabled={loading} className="w-full mb-4">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />{t("Считаю синастрию...", "Computing synastry...", "सिनास्ट्री की गणना...")}</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1.5" />{t("Построить синастрию", "Compute synastry", "सिनास्ट्री बनाएं")}</>
            )}
          </CosmicButton>

          {error && (
            <div className="mb-4 p-2.5 rounded-lg text-[12px]" style={{ background: "#D98E7A10", border: "1px solid #D98E7A30", color: "#D98E7A" }}>
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {data && (
              <motion.div
                key="synastry-result"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                {/* Compatibility score + bi-wheel */}
                <div className="grid md:grid-cols-[auto_1fr] gap-4 mb-4">
                  {/* Score circle */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="44" fill="none" stroke="#1C1C26" strokeWidth="6" />
                        <motion.circle
                          cx="50" cy="50" r="44" fill="none"
                          stroke={TONE_COLORS[data.tone]} strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 44}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - data.compatibility.overall / 100) }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          style={{ filter: `drop-shadow(0 0 6px ${TONE_COLORS[data.tone]})` }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="font-mono text-3xl tabular-nums"
                          style={{ color: TONE_COLORS[data.tone] }}
                        >
                          {data.compatibility.overall}
                        </motion.span>
                        <span className="text-[9px] uppercase tracking-wider text-[#9A9AA8]">
                          {t("Индекс", "Index", "सूचकांक")}
                        </span>
                      </div>
                    </div>
                    {/* Harmony / Tension */}
                    <div className="mt-2 grid grid-cols-2 gap-2 w-full">
                      <div className="text-center p-1.5 rounded" style={{ background: "#5BB89C10" }}>
                        <div className="text-[9px] text-[#5BB89C]">{t("Гармония", "Harmony", "सामंजस्य")}</div>
                        <div className="font-mono text-sm text-[#5BB89C]">+{data.compatibility.harmony}</div>
                      </div>
                      <div className="text-center p-1.5 rounded" style={{ background: "#D98E7A10" }}>
                        <div className="text-[9px] text-[#D98E7A]">{t("Напряжение", "Tension", "तनाव")}</div>
                        <div className="font-mono text-sm text-[#D98E7A]">{data.compatibility.tension}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bi-wheel chart */}
                  <div className="flex justify-center items-center">
                    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="max-w-full">
                      {/* Outer zodiac ring (Person B ascendant) */}
                      <circle cx={C} cy={C} r={OUTER_R} fill="none" stroke="rgba(91,184,156,0.3)" strokeWidth="1" />
                      <circle cx={C} cy={C} r={ZODIAC_R} fill="none" stroke="rgba(232,184,109,0.2)" strokeWidth="0.5" />

                      {/* Zodiac glyphs (around outer ring) */}
                      {ZODIAC_GLYPHS.map((glyph, i) => {
                        const lon = i * 30 + 15;
                        // Use Person A's ascendant for zodiac orientation
                        const pos = lonToXY(lon, (OUTER_R + ZODIAC_R) / 2, data.personA.ascendantLonDeg);
                        return (
                          <text key={i} x={pos.x} y={pos.y} fontSize="12" fill="#E8B86D"
                            textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "serif" }}>
                            {glyph}
                          </text>
                        );
                      })}

                      {/* Person B planets (outer ring, jade) */}
                      {data.personB.planetPositions.filter(p => PLANET_GLYPHS[p.planet]).map((p, i) => {
                        const pos = lonToXY(p.eclipticLonDeg, PERSON_B_R, data.personA.ascendantLonDeg);
                        return (
                          <motion.g key={`b-${p.planet}`}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 200 }}
                          >
                            <circle cx={pos.x} cy={pos.y} r="8" fill="#0B0B0F" stroke="#5BB89C" strokeWidth="1"
                              style={{ filter: "drop-shadow(0 0 3px rgba(91,184,156,0.5))" }} />
                            <text x={pos.x} y={pos.y} fontSize="10" fill="#5BB89C"
                              textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "serif" }}>
                              {PLANET_GLYPHS[p.planet]}
                            </text>
                          </motion.g>
                        );
                      })}

                      {/* Inner circle */}
                      <circle cx={C} cy={C} r={INNER_R} fill="none" stroke="rgba(245,240,232,0.1)" strokeWidth="0.5" strokeDasharray="2 3" />

                      {/* Person A planets (inner ring, gold) */}
                      {data.personA.planetPositions.filter(p => PLANET_GLYPHS[p.planet]).map((p, i) => {
                        const pos = lonToXY(p.eclipticLonDeg, PERSON_A_R, data.personA.ascendantLonDeg);
                        return (
                          <motion.g key={`a-${p.planet}`}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + i * 0.05, type: "spring", stiffness: 200 }}
                          >
                            <circle cx={pos.x} cy={pos.y} r="7" fill="#0B0B0F" stroke="#E8B86D" strokeWidth="1"
                              style={{ filter: "drop-shadow(0 0 3px rgba(232,184,109,0.5))" }} />
                            <text x={pos.x} y={pos.y} fontSize="9" fill="#E8B86D"
                              textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "serif" }}>
                              {PLANET_GLYPHS[p.planet]}
                            </text>
                          </motion.g>
                        );
                      })}

                      {/* Cross-aspect lines (only major aspects) */}
                      {(hoveredAspect ? [hoveredAspect] : data.crossAspects.slice(0, 12)).map((asp, i) => {
                        const pA = data.personA.planetPositions.find(p => p.planet === asp.planetA);
                        const pB = data.personB.planetPositions.find(p => p.planet === asp.planetB);
                        if (!pA || !pB) return null;
                        const posA = lonToXY(pA.eclipticLonDeg, PERSON_A_R, data.personA.ascendantLonDeg);
                        const posB = lonToXY(pB.eclipticLonDeg, PERSON_B_R, data.personA.ascendantLonDeg);
                        const color = TONE_COLORS[asp.tone];
                        return (
                          <motion.line key={`asp-${asp.planetA}-${asp.planetB}-${asp.aspectName}`}
                            x1={posA.x} y1={posA.y} x2={posB.x} y2={posB.y}
                            stroke={color} strokeWidth={hoveredAspect ? 2 : 0.8}
                            opacity={hoveredAspect ? 0.9 : 0.3}
                            strokeDasharray={asp.tone === "jade" ? "4 3" : "none"}
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.8 + i * 0.03, duration: 0.4 }}
                          />
                        );
                      })}

                      {/* Center */}
                      <circle cx={C} cy={C} r="3" fill="#D98E7A" style={{ filter: "drop-shadow(0 0 4px #D98E7A)" }} />
                    </svg>
                  </div>
                </div>

                {/* Legend for bi-wheel */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-[#9A9AA8] mb-4">
                  <span className="flex items-center gap-1">
                    <span style={{ color: "#E8B86D", fontFamily: "serif" }}>☉</span>
                    <span>{personAName} {t("(внутри)", "(inner)", "(आंतरिक)")}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span style={{ color: "#5BB89C", fontFamily: "serif" }}>☉</span>
                    <span>{personBName} {t("(снаружи)", "(outer)", "(बाहरी)")}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 rounded" style={{ background: "#5BB89C" }} />
                    {t("мягкие аспекты", "soft aspects", "कोमल पहलू")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 rounded" style={{ background: "#D98E7A" }} />
                    {t("напряжённые", "hard aspects", "कठोर पहलू")}
                  </span>
                </div>

                {/* Key themes */}
                {data.keyThemes.length > 0 && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">
                      {t("Ключевые темы", "Key themes", "मुख्य विषय")}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {data.keyThemes.map((asp, i) => {
                        const color = TONE_COLORS[asp.tone];
                        return (
                          <motion.div
                            key={`theme-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                            style={{ background: `${color}10`, border: `1px solid ${color}30` }}
                            onMouseEnter={() => setHoveredAspect(asp)}
                            onMouseLeave={() => setHoveredAspect(null)}
                          >
                            <div className="flex items-center gap-1 shrink-0">
                              <span style={{ color: "#E8B86D", fontFamily: "serif" }} className="text-base">{PLANET_GLYPHS[asp.planetA]}</span>
                              <span style={{ color }} className="text-sm font-bold">{asp.aspectSymbol}</span>
                              <span style={{ color: "#5BB89C", fontFamily: "serif" }} className="text-base">{PLANET_GLYPHS[asp.planetB]}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium" style={{ color }}>
                                {asp.planetA} {t("—", "—", "—")} {asp.planetB}
                              </div>
                              <div className="text-[10px] text-[#9A9AA8]">
                                {asp.exactAngle}° · orb {asp.orb.toFixed(1)}°
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All aspects list */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">
                    {t("Все аспекты", "All aspects", "सभी पहलू")} ({data.aspectCount})
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-astro space-y-1">
                    {data.crossAspects.map((asp, i) => {
                      const color = TONE_COLORS[asp.tone];
                      return (
                        <div key={`all-${i}`}
                          className="flex items-center gap-2 p-1.5 rounded text-[11px] cursor-pointer hover:bg-[#1C1C26]/50"
                          onMouseEnter={() => setHoveredAspect(asp)}
                          onMouseLeave={() => setHoveredAspect(null)}
                        >
                          <span style={{ color: "#E8B86D", fontFamily: "serif" }} className="text-sm">{PLANET_GLYPHS[asp.planetA]}</span>
                          <span style={{ color }} className="font-bold">{asp.aspectSymbol}</span>
                          <span style={{ color: "#5BB89C", fontFamily: "serif" }} className="text-sm">{PLANET_GLYPHS[asp.planetB]}</span>
                          <span className="text-[#9A9AA8] flex-1 truncate">{asp.planetA} — {asp.planetB}</span>
                          <span className="text-[10px] text-[#6B6B78]">{asp.exactAngle}°</span>
                          <span className="text-[10px] font-mono" style={{ color }}>{asp.orb.toFixed(1)}°</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Element distribution */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(232,184,109,0.06)" }}>
                    <div className="text-[10px] uppercase tracking-wider text-[#E8B86D] mb-1.5">{personAName}</div>
                    <div className="space-y-1">
                      {Object.entries(data.elementsA).map(([el, count]) => {
                        const max = Math.max(...Object.values(data.elementsA));
                        const pct = max > 0 ? (count / max) * 100 : 0;
                        const colors: Record<string, string> = { Fire: "#EF4444", Earth: "#D98E7A", Air: "#FBBF24", Water: "#60A5FA" };
                        return (
                          <div key={el} className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-10" style={{ color: colors[el] }}>{el}</span>
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[#1C1C26]">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[el] }} />
                            </div>
                            <span className="font-mono w-3 text-right" style={{ color: "#F5F0E8" }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(91,184,156,0.06)" }}>
                    <div className="text-[10px] uppercase tracking-wider text-[#5BB89C] mb-1.5">{personBName}</div>
                    <div className="space-y-1">
                      {Object.entries(data.elementsB).map(([el, count]) => {
                        const max = Math.max(...Object.values(data.elementsB));
                        const pct = max > 0 ? (count / max) * 100 : 0;
                        const colors: Record<string, string> = { Fire: "#EF4444", Earth: "#D98E7A", Air: "#FBBF24", Water: "#60A5FA" };
                        return (
                          <div key={el} className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-10" style={{ color: colors[el] }}>{el}</span>
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-[#1C1C26]">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[el] }} />
                            </div>
                            <span className="font-mono w-3 text-right" style={{ color: "#F5F0E8" }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!data && !loading && (
            <div className="text-center py-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-block"
              >
                <Heart className="w-7 h-7" style={{ color: "#D98E7A" }} />
              </motion.div>
              <p className="mt-2 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
                {t("Две натальные карты. Один резонанс.", "Two charts. One resonance.", "दो चार्ट। एक गुंजयमान।")}
              </p>
              <p className="mt-1 text-[11px] text-[#6B6B78]">
                {t("Введите данные обоих — мы построим bi-wheel и кросс-аспекты", "Enter both birth data — we'll build a bi-wheel and cross-aspects", "दोनों जन्म डेटा दर्ज करें — हम bi-wheel और क्रॉस-पहलू बनाएंगे")}
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default SynastryChartOverlay;
