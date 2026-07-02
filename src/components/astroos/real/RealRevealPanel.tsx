"use client";
/**
 * RealRevealPanel — 90-секундный Reveal с реальными данными.
 * /api/calculate (44 линии + планеты) + /api/bazi (Day Master + Luck Pillars).
 * Clean Architecture: Interface Adapter.
 * Hades 2 визуал: staggered planet cards, BaZi pillars, ornamental borders.
 */
import { useState, useEffect } from "react";
import { GlassCard, Pill, CosmicButton, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Sun, Moon, Star, Loader2, Zap, Heart } from "lucide-react";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";

const PLANET_ICONS: Record<string, React.ReactNode> = {
  Sun: <Sun className="w-3.5 h-3.5" />,
  Moon: <Moon className="w-3.5 h-3.5" />,
  Mercury: <Star className="w-3.5 h-3.5" />,
  Venus: <Heart className="w-3.5 h-3.5" />,
  Mars: <Zap className="w-3.5 h-3.5" />,
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "#FBBF24", Moon: "#94A3B8", Mercury: "#60A5FA", Venus: "#F472B6",
  Mars: "#EF4444", Jupiter: "#A78BFA", Saturn: "#94A3B8",
  Uranus: "#22D3EE", Neptune: "#2DD4BF", Pluto: "#9333EA",
};

const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

interface CalculateData {
  lines: Array<{ planet: string; type: string; weight: number; tone: string }>;
  planetPositions: Array<{ planet: string; eclipticLonDeg: number; eclipticLatDeg: number }>;
  ascendantLonDeg: number;
  midheavenLonDeg: number;
  cached: boolean;
}

interface BaZiData {
  yearPillar: { stem: string; branch: string; stemElement: string; stemYinYang: string };
  monthPillar: { stem: string; branch: string; stemElement: string; stemYinYang: string };
  dayPillar: { stem: string; branch: string; stemElement: string; stemYinYang: string };
  timePillar: { stem: string; branch: string; stemElement: string; stemYinYang: string };
  dayMaster: string;
  dayMasterElement: string;
  dayMasterYinYang: string;
  luckPillars: Array<{ stem: string; branch: string; startAge: number; endAge: number }>;
  elementBalance: Record<string, number>;
}

function lonToSign(lon: number): string {
  const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
  return ZODIAC_SIGNS[idx] ?? "Unknown";
}

export interface RevealPanelData {
  sunSign: string;
  moonSign: string;
  risingSign: string;
  dayMaster: string;
}

export function RealRevealPanel({ locale, onDataLoaded }: { locale: "ru" | "en" | "hi"; onDataLoaded?: (data: RevealPanelData) => void }) {
  const { member } = useMember();
  const [calculateData, setCalculateData] = useState<CalculateData | null>(null);
  const [baziData, setBaziData] = useState<BaZiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  useEffect(() => {
    const m = member ?? mockMember();
    const birth = {
      birthDateTime: m.birth.isoDateTime,
      birthLat: m.birth.lat,
      birthLng: m.birth.lng,
      birthTzOffset: m.birth.tzOffset,
      birthPlaceName: m.birth.placeName,
      gender: m.birth.gender,
    };
    Promise.all([
      fetch("/api/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(birth) }).then((r) => r.json()),
      fetch("/api/bazi/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(birth) }).then((r) => r.json()),
    ])
      .then(([calc, bazi]) => {
        setCalculateData(calc);
        setBaziData(bazi.bazi);
        setLoading(false);

        // Notify parent of computed signs
        if (onDataLoaded) {
          const sunPos = calc.planetPositions?.find((p: { planet: string }) => p.planet === "Sun");
          const moonPos = calc.planetPositions?.find((p: { planet: string }) => p.planet === "Moon");
          const sunSign = sunPos ? lonToSign(sunPos.eclipticLonDeg) : "Unknown";
          const moonSign = moonPos ? lonToSign(moonPos.eclipticLonDeg) : "Unknown";
          const risingSign = calc.ascendantLonDeg != null ? lonToSign(calc.ascendantLonDeg) : "Unknown";
          const dayMaster = bazi.bazi?.dayMaster ?? "";
          onDataLoaded({ sunSign, moonSign, risingSign, dayMaster });
        }
      })
      .catch(() => setLoading(false));
  }, [member, onDataLoaded]);

  const sunPos = calculateData?.planetPositions.find((p) => p.planet === "Sun");
  const moonPos = calculateData?.planetPositions.find((p) => p.planet === "Moon");
  const mercuryPos = calculateData?.planetPositions.find((p) => p.planet === "Mercury");
  const venusPos = calculateData?.planetPositions.find((p) => p.planet === "Venus");
  const marsPos = calculateData?.planetPositions.find((p) => p.planet === "Mars");

  const ascendantSign = calculateData ? lonToSign(calculateData.ascendantLonDeg) : "Unknown";
  const midheavenSign = calculateData ? lonToSign(calculateData.midheavenLonDeg) : "Unknown";

  if (loading) {
    return (
      <GlassCard variant="gold" className="p-5" ornamental glow>
        <div className="flex flex-col items-center py-8">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-transparent" style={{ borderTopColor: "#E8B86D", borderRightColor: "#5BB89C" }}>
            <Sparkles className="w-5 h-5 m-auto mt-3" style={{ color: "#E8B86D" }} />
          </motion.div>
          <p className="mt-3 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
            {t("Раскрываю вашу карту...", "Revealing your chart...", "आपका चार्ट प्रकट कर रहा हूँ...")}
          </p>
          <p className="text-[11px] mt-1 font-mono" style={{ color: "#E8B86D" }}>
            {t("astronomy-engine + BaZi калькулятор", "astronomy-engine + BaZi calculator", "astronomy-engine + BaZi कैलकुलेटर")}
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative" ornamental glow>
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(232,184,109,0.15) 0%, transparent 70%)",
        }} />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4" style={{ color: "#E8B86D" }} />
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t("Ваша натальная карта", "Your natal chart", "आपकी जन्म कुंडली")}
            </h3>
            {calculateData?.cached && <Pill tone="jade">cached</Pill>}
          </div>
          <p className="text-xs mb-4" style={{ color: "#F5F0E860" }}>
            {t("Real astronomy-engine · 44 планетарные линии", "Real astronomy-engine · 44 planetary lines", "वास्तविक astronomy-engine · 44 ग्रह रेखाएँ")}
          </p>

          {/* Staggered planet cards — Hades 2 reveal */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {[
              { name: "Sun", pos: sunPos, label: t("Солнце", "Sun", "सूर्य"), desc: t("ядро · воля", "core · will", "मूल · इच्छा") },
              { name: "Moon", pos: moonPos, label: t("Луна", "Moon", "चंद्रमा"), desc: t("эмоции · интуиция", "emotions · intuition", "भावनाएँ · अंतर्ज्ञान") },
              { name: "Mercury", pos: mercuryPos, label: t("Меркурий", "Mercury", "बुध"), desc: t("мышление · речь", "mind · speech", "मन · वाक्") },
              { name: "Venus", pos: venusPos, label: t("Венера", "Venus", "शुक्र"), desc: t("любовь · красота", "love · beauty", "प्रेम · सौंदर्य") },
              { name: "Mars", pos: marsPos, label: t("Марс", "Mars", "मंगल"), desc: t("действие · сила", "action · force", "कर्म · शक्ति") },
            ].map((p, i) => {
              const sign = p.pos ? lonToSign(p.pos.eclipticLonDeg) : "—";
              const deg = p.pos ? Math.floor(p.pos.eclipticLonDeg % 30) : 0;
              const color = PLANET_COLORS[p.name] ?? "#E8B86D";
              return (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 20, rotateX: -30 }}
                  animate={revealed ? { opacity: 1, y: 0, rotateX: 0 } : {}}
                  transition={{ delay: i * 0.15, type: "spring", stiffness: 200, damping: 20 }}
                  className="p-2.5 rounded-lg"
                  style={{ background: `${color}10`, border: `1px solid ${color}30` }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ color }}>{PLANET_ICONS[p.name] ?? <Star className="w-3.5 h-3.5" />}</span>
                    <span className="text-[11px] font-medium" style={{ color: "#F5F0E8" }}>{p.label}</span>
                  </div>
                  <div className="font-serif text-sm" style={{ color }}>{sign}</div>
                  <div className="text-[9px] font-mono" style={{ color: "#F5F0E860" }}>{deg}° · {p.desc}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Ascendant + MC */}
          {calculateData && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 rounded-lg flex items-center gap-2" style={{ background: "#D98E7A10", border: "1px solid #D98E7A30" }}>
                <span className="text-lg">↗</span>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>Ascendant</div>
                  <div className="text-sm font-serif" style={{ color: "#D98E7A" }}>{ascendantSign}</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg flex items-center gap-2" style={{ background: "#5BB89C10", border: "1px solid #5BB89C30" }}>
                <span className="text-lg">↑</span>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>Midheaven</div>
                  <div className="text-sm font-serif" style={{ color: "#5BB89C" }}>{midheavenSign}</div>
                </div>
              </div>
            </div>
          )}

          {/* BaZi section */}
          {baziData && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">太</span>
                <h4 className="font-serif text-sm" style={{ color: "#F5F0E8" }}>
                  {t("BaZi · 4 столпа", "BaZi · 4 Pillars", "बाज़ी · 4 स्तंभ")}
                </h4>
              </div>

              {/* Day Master highlight */}
              <div className="p-3 rounded-lg mb-3 text-center" style={{
                background: "linear-gradient(135deg, rgba(232,184,109,0.1), rgba(91,184,156,0.06))",
                border: "1px solid rgba(232,184,109,0.25)",
              }}>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>{t("Day Master", "Day Master", "दिन स्वामी")}</div>
                <div className="font-serif text-3xl my-1" style={{ color: "#E8B86D" }}>{baziData.dayMaster}</div>
                <div className="text-xs" style={{ color: "#5BB89C" }}>
                  {baziData.dayMasterYinYang} {baziData.dayMasterElement}
                </div>
              </div>

              {/* 4 Pillars */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[
                  { label: t("Год", "Year", "वर्ष"), pillar: baziData.yearPillar },
                  { label: t("Месяц", "Month", "माह"), pillar: baziData.monthPillar },
                  { label: t("День", "Day", "दिन"), pillar: baziData.dayPillar },
                  { label: t("Час", "Hour", "घंटा"), pillar: baziData.timePillar },
                ].map((p, i) => (
                  <motion.div
                    key={p.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={revealed ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="p-2 rounded-lg text-center"
                    style={{ background: "rgba(11,11,15,0.6)", border: "1px solid #F5F0E815" }}
                  >
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "#F5F0E860" }}>{p.label}</div>
                    <div className="font-serif text-lg" style={{ color: "#E8B86D" }}>{p.pillar.stem}</div>
                    <div className="font-serif text-base" style={{ color: "#5BB89C" }}>{p.pillar.branch}</div>
                    <div className="text-[8px] mt-0.5" style={{ color: "#F5F0E860" }}>{p.pillar.stemElement}</div>
                  </motion.div>
                ))}
              </div>

              {/* Element balance */}
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#F5F0E860" }}>
                  {t("Баланс стихий", "Element balance", "तत्व संतुलन")}
                </div>
                <div className="space-y-1">
                  {Object.entries(baziData.elementBalance).map(([el, count]) => {
                    const max = Math.max(...Object.values(baziData.elementBalance));
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    const colors: Record<string, string> = { Wood: "#5BB89C", Fire: "#EF4444", Earth: "#D98E7A", Metal: "#94A3B8", Water: "#60A5FA" };
                    return (
                      <div key={el} className="flex items-center gap-2 text-[10px]">
                        <span className="w-10" style={{ color: colors[el] }}>{el}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#F5F0E810" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: colors[el] }}
                            initial={{ width: 0 }}
                            animate={revealed ? { width: `${pct}%` } : {}}
                            transition={{ delay: 1, duration: 0.6 }}
                          />
                        </div>
                        <span className="font-mono w-3 text-right" style={{ color: "#F5F0E8" }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Luck Pillars (first 3) */}
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#F5F0E860" }}>
                  {t("Столпы Удачи", "Luck Pillars", "भाग्य स्तंभ")}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {baziData.luckPillars.slice(0, 5).map((lp, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={revealed ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 1.2 + i * 0.08 }}
                      className="flex-shrink-0 p-1.5 rounded text-center min-w-[52px]"
                      style={{ background: "rgba(232,184,109,0.06)", border: "1px solid rgba(232,184,109,0.2)" }}
                    >
                      <div className="text-[8px]" style={{ color: "#F5F0E860" }}>{lp.startAge}-{lp.endAge}</div>
                      <div className="font-serif text-sm" style={{ color: "#E8B86D" }}>{lp.stem}</div>
                      <div className="font-serif text-xs" style={{ color: "#5BB89C" }}>{lp.branch}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reveal button */}
          <AnimatePresence>
            {!revealed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
                <CosmicButton variant="gold" onClick={() => setRevealed(true)} className="w-full">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  {t("Раскрыть карту", "Reveal chart", "चार्ट प्रकट करें")}
                </CosmicButton>
              </motion.div>
            )}
          </AnimatePresence>

          {revealed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-center text-[11px] font-serif italic mt-3"
              style={{ color: "#F5F0E860" }}
            >
              {t("Это ваша космическая подпись. Уникальная, как отпечаток.", "This is your cosmic signature. Unique as a fingerprint.", "यह आपकी खगोलीय हस्ताक्षर है। अद्वितीय, उंगली की छाप की तरह।")}
            </motion.p>
          )}
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealRevealPanel;
