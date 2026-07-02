"use client";
/**
 * RealBaZiPanel — real BaZi (Chinese Four Pillars) chart from /api/bazi/calculate.
 * Replaces mock BAZI data with real calculation from astronomy-engine + BaZi calculator.
 *
 * Features:
 * - Real Day Master, 4 pillars, hidden stems, luck pillars
 * - Element balance visualization with favorable/unfavorable indicators
 * - Ten Gods archetypes
 * - Element recommendations (favorable, dominant, deficient)
 * - Cosmic Hades 2 styling with gold/jade/rose palette
 */
import { useState, useEffect } from "react";
import { GlassCard, Pill, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { useMember } from "@/lib/astroos/real/useMember";
import type { BaZiDTO } from "@/lib/astroos/real/api-client";

const L = (en: string, ru: string, hi: string, locale: string) =>
  locale === "ru" ? ru : locale === "hi" ? hi : en;

const ELEMENT_COLORS: Record<string, string> = {
  Wood: "#5BB89C",
  Fire: "#D98E7A",
  Earth: "#E8B86D",
  Metal: "#9A9AA8",
  Water: "#5E8FA8",
};

const ELEMENT_ICONS: Record<string, string> = {
  Wood: "木",
  Fire: "火",
  Earth: "土",
  Metal: "金",
  Water: "水",
};

const BRANCH_ANIMALS: Record<string, string> = {
  子: "Rat", 丑: "Ox", 寅: "Tiger", 卯: "Rabbit",
  辰: "Dragon", 巳: "Snake", 午: "Horse", 未: "Goat",
  申: "Monkey", 酉: "Rooster", 戌: "Dog", 亥: "Pig",
};

const STEM_NAMES: Record<string, { en: string; ru: string; hi: string }> = {
  甲: { en: "Yang Wood", ru: "Янское Дерево", hi: "यांग वुड" },
  乙: { en: "Yin Wood", ru: "Иньское Дерево", hi: "यिन वुड" },
  丙: { en: "Yang Fire", ru: "Янский Огонь", hi: "यांग फायर" },
  丁: { en: "Yin Fire", ru: "Иньский Огонь", hi: "यिन फायर" },
  戊: { en: "Yang Earth", ru: "Янская Земля", hi: "यांग अर्थ" },
  己: { en: "Yin Earth", ru: "Иньская Земля", hi: "यिन अर्थ" },
  庚: { en: "Yang Metal", ru: "Янский Металл", hi: "यांग मेटल" },
  辛: { en: "Yin Metal", ru: "Иньский Металл", hi: "यिन मेटल" },
  壬: { en: "Yang Water", ru: "Янская Вода", hi: "यांग वाटर" },
  癸: { en: "Yin Water", ru: "Иньская Вода", hi: "यिन वाटर" },
};

interface ElementRecommendation {
  favorable: string[];
  unfavorable: string[];
  dominant: string;
  deficient: string;
}

export function RealBaZiPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [bazi, setBazi] = useState<BaZiDTO | null>(null);
  const [recommendations, setRecommendations] = useState<ElementRecommendation | null>(null);
  const [source, setSource] = useState<string>("");
  const [latency, setLatency] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { member } = useMember();

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

    setLoading(true);
    setError(null);
    fetch("/api/bazi/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(birth),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setBazi(d.bazi);
        setRecommendations(d.recommendations);
        setSource(d.source);
        setLatency(d.latencyMs);
        setLoading(false);
      })
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
  }, [member]);

  if (loading) {
    return (
      <GlassCard variant="jade" className="p-5" glow>
        <div className="flex flex-col items-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-14 h-14 rounded-full border-2 border-transparent flex items-center justify-center"
            style={{ borderTopColor: "#5BB89C", borderRightColor: "#E8B86D" }}
          >
            <span className="text-xl text-[#5BB89C]" style={{ fontFamily: "serif" }}>壬</span>
          </motion.div>
          <p className="mt-3 text-sm font-serif italic text-[#F5F0E8]">
            {L("Calculating your BaZi pillars...", "Вычисляю столпы BaZi...", "आपके BaZi स्तंभ गणना...")}
          </p>
        </div>
      </GlassCard>
    );
  }

  if (error || !bazi) {
    return (
      <GlassCard variant="rose" className="p-5">
        <p className="text-sm text-[#D98E7A]">
          {L("Failed to calculate BaZi", "Не удалось рассчитать BaZi", "BaZi की गणना विफल")}
        </p>
        <p className="mt-1 text-[11px] text-[#6B6B78]">{error}</p>
      </GlassCard>
    );
  }

  const pillars = [
    { position: "Year", ...bazi.yearPillar },
    { position: "Month", ...bazi.monthPillar },
    { position: "Day", ...bazi.dayPillar },
    { position: "Time", ...bazi.timePillar },
  ];

  const currentAge = new Date().getFullYear() - (member ? new Date(member.birth.isoDateTime).getFullYear() : 1989);
  const currentLuck = bazi.luckPillars.find((lp) => currentAge >= lp.startAge && currentAge <= lp.endAge);

  return (
    <FadeIn>
      <GlassCard variant="jade" className="p-5 relative" glow>
        {/* Ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(91,184,156,0.08) 0%, transparent 70%)" }}
        />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: "#5BB89C" }} />
            <h3 className="font-serif text-lg text-[#F5F0E8]">
              {L("BaZi · Four Pillars", "BaZi · Четыре столпа", "BaZi · चार स्तंभ")}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "#5BB89C20", color: "#5BB89C" }}>
              {source === "python" ? "Python engine" : source === "ts-fallback" ? "TS engine" : source}
            </span>
          </div>

          {/* Day Master hero */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-xl border border-[#5E8FA8]/30 bg-gradient-to-br from-[#5E8FA8]/10 to-[#5E8FA8]/5 p-4 text-center mb-4"
          >
            <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">
              {L("Day Master (日主)", "Day Master (日主)", "Day Master (日主)")}
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mt-1 font-display text-6xl"
              style={{
                color: ELEMENT_COLORS[bazi.dayMasterElement] ?? "#5E8FA8",
                textShadow: `0 0 20px ${ELEMENT_COLORS[bazi.dayMasterElement] ?? "#5E8FA8"}40`,
              }}
            >
              {bazi.dayMaster}
            </motion.div>
            <div className="mt-2 text-[13px] text-[#F5F0E8]">
              {STEM_NAMES[bazi.dayMaster]?.[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"] ?? bazi.dayMasterElement}
            </div>
            <div className="mt-1 text-[11px] text-[#9A9AA8]">
              {bazi.dayMasterElement} · {bazi.dayMasterYinYang}
            </div>
          </motion.div>

          {/* Four pillars grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {pillars.map((p, i) => {
              const stemColor = ELEMENT_COLORS[p.stemElement] ?? "#E8B86D";
              const branchElement = ["子", "亥"].includes(p.branch) ? "Water" :
                ["寅", "卯"].includes(p.branch) ? "Wood" :
                ["巳", "午"].includes(p.branch) ? "Fire" :
                ["辰", "戌", "丑", "未"].includes(p.branch) ? "Earth" :
                ["申", "酉"].includes(p.branch) ? "Metal" : "Earth";
              const branchColor = ELEMENT_COLORS[branchElement] ?? "#5BB89C";
              const isDay = p.position === "Day";
              return (
                <motion.div
                  key={p.position}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i + 0.3 }}
                  className={`rounded-lg border p-2 text-center ${
                    isDay
                      ? "border-[#E8B86D]/40 bg-[#E8B86D]/5"
                      : "border-[#2A2A35] bg-[#0B0B0F]/50"
                  }`}
                >
                  <div className="text-[9px] uppercase tracking-wider text-[#6B6B78]">{p.position}</div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 * i + 0.4, type: "spring", stiffness: 200 }}
                    className="mt-1 font-display text-3xl"
                    style={{ color: stemColor, textShadow: `0 0 8px ${stemColor}40` }}
                  >
                    {p.stem}
                  </motion.div>
                  <div className="text-[8px] text-[#9A9AA8]">{p.stemElement}</div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 * i + 0.5, type: "spring", stiffness: 200 }}
                    className="mt-1 font-display text-3xl"
                    style={{ color: branchColor }}
                  >
                    {p.branch}
                  </motion.div>
                  <div className="text-[8px] text-[#9A9AA8]">{BRANCH_ANIMALS[p.branch] ?? ""}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Element balance */}
          {recommendations && (
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">
                {L("Five Elements Balance", "Баланс пяти стихий", "पंच तत्व संतुलन")}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(["Wood", "Fire", "Earth", "Metal", "Water"] as const).map((el) => {
                  const count = bazi.elementBalance[el] ?? 0;
                  const maxCount = Math.max(...Object.values(bazi.elementBalance));
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const color = ELEMENT_COLORS[el];
                  const isDominant = recommendations.dominant === el;
                  const isDeficient = recommendations.deficient === el;
                  const isFavorable = recommendations.favorable.includes(el);
                  return (
                    <div
                      key={el}
                      className={`rounded-lg border p-2 text-center transition ${
                        isDominant
                          ? "border-[#E8B86D]/50 bg-[#E8B86D]/5"
                          : isDeficient
                          ? "border-[#D98E7A]/30 bg-[#D98E7A]/5"
                          : "border-[#2A2A35] bg-[#0B0B0F]/40"
                      }`}
                    >
                      <div className="text-[14px]" style={{ color }}>{ELEMENT_ICONS[el]}</div>
                      <div className="text-[9px] text-[#9A9AA8]">{el}</div>
                      <div className="mt-1 font-mono text-[14px] font-bold" style={{ color }}>{count}</div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#1C1C26]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.6, duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ background: color }}
                        />
                      </div>
                      {isFavorable && (
                        <div className="mt-1 text-[8px] text-[#5BB89C]">★ {L("Fav", "Благ", "अनुकूल")}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                <span className="text-[#E8B86D]">
                  {L("Dominant:", "Доминанта:", "प्रधान:")} {recommendations.dominant} ({ELEMENT_ICONS[recommendations.dominant]})
                </span>
                <span className="text-[#D98E7A]">
                  {L("Deficient:", "Дефицит:", "कमी:")} {recommendations.deficient} ({ELEMENT_ICONS[recommendations.deficient]})
                </span>
              </div>
            </div>
          )}

          {/* Luck Pillars timeline */}
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">
              {L("Luck Pillars (大运)", "Столпы Удачи (大运)", "Luck Pillars (大运)")}
            </div>
            <div className="flex gap-1 overflow-x-auto scrollbar-astro pb-2">
              {bazi.luckPillars.map((lp, i) => {
                const isCurrent = currentLuck?.startAge === lp.startAge;
                const stemColor = ELEMENT_COLORS[lp.stemElement] ?? "#E8B86D";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i + 0.7 }}
                    className={`min-w-[70px] rounded-lg border p-2 text-center ${
                      isCurrent
                        ? "border-[#E8B86D]/60 bg-[#E8B86D]/10"
                        : "border-[#2A2A35] bg-[#0B0B0F]/40"
                    }`}
                  >
                    <div className="text-[8px] text-[#6B6B78]">{lp.startAge}-{lp.endAge}</div>
                    <div className="mt-1 font-display text-xl" style={{ color: stemColor }}>{lp.stem}</div>
                    <div className="font-display text-xl text-[#5BB89C]">{lp.branch}</div>
                    <div className="mt-0.5 text-[7px] text-[#9A9AA8]">{lp.stemElement}</div>
                    {isCurrent && (
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="mt-1 text-[8px] text-[#E8B86D] font-bold"
                      >
                        ▼ NOW
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Ten Gods */}
          {bazi.tenGods.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">
                {L("Ten Gods (十神)", "Десять Богов (十神)", "Ten Gods (十神)")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {bazi.tenGods.map((god, i) => (
                  <motion.span
                    key={god}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i + 0.8 }}
                    className="rounded-full border border-[#5BB89C]/30 bg-[#5BB89C]/8 px-2.5 py-1 text-[11px] text-[#5BB89C]"
                  >
                    {god}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          {/* Footer with metadata */}
          <div className="mt-4 flex items-center justify-between text-[10px] text-[#6B6B78]">
            <span>{L("Calculated in", "Вычислено за", "गणना")} {latency}ms</span>
            <span className="font-mono">{source}</span>
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealBaZiPanel;
