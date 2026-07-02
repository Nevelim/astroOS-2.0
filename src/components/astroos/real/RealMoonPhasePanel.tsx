"use client";
/**
 * RealMoonPhasePanel — текущая фаза Луны с реальной астрономией.
 * Fetches /api/moon-phase (astronomy-engine: MoonPhase, EclipticGeoMoon, SearchMoonPhase).
 * Cosmic SVG visualization: dark disc + lit-area path with terminator ellipse,
 * gold glow halo, background sparkles.
 * Clean Architecture: Interface Adapter.
 * Hades 2 visual: gold GlassCard, ornamental corners, ambient glow.
 */
import { useState, useEffect, useMemo } from "react";
import { GlassCard, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sparkles, RefreshCw } from "lucide-react";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";

type PhaseName =
  | "new"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

interface MoonPhaseData {
  phaseAngle: number;
  phaseName: PhaseName;
  illumination: number;
  moonLongitude: number;
  sunLongitude: number;
  zodiacSign: string;
  daysUntilFullMoon: number;
  daysUntilNewMoon: number;
  timestamp: string;
}

/* ---------- i18n tables ---------- */
const PHASE_LABELS: Record<PhaseName, { ru: string; en: string; hi: string }> = {
  "new": { ru: "Новолуние", en: "New Moon", hi: "अमावस्या" },
  "waxing-crescent": { ru: "Растущий серп", en: "Waxing Crescent", hi: "बढ़ता अर्धचंद्र" },
  "first-quarter": { ru: "Первая четверть", en: "First Quarter", hi: "प्रथम चतुर्थांश" },
  "waxing-gibbous": { ru: "Растущая Луна", en: "Waxing Gibbous", hi: "बढ़ता गिब्बस" },
  "full": { ru: "Полнолуние", en: "Full Moon", hi: "पूर्णिमा" },
  "waning-gibbous": { ru: "Убывающая Луна", en: "Waning Gibbous", hi: "घटता गिब्बस" },
  "last-quarter": { ru: "Последняя четверть", en: "Last Quarter", hi: "अंतिम चतुर्थांश" },
  "waning-crescent": { ru: "Убывающий серп", en: "Waning Crescent", hi: "घटता अर्धचंद्र" },
};

const MOON_MOOD: Record<PhaseName, { ru: string; en: string; hi: string }> = {
  "new": {
    ru: "Задайте намерения — семена, посаженные в тишине, прорастут.",
    en: "Set intentions — seeds planted in silence will sprout.",
    hi: "संकल्प स्थापित करें — शांति में बोए बीज अंकुरित होंगे।",
  },
  "waxing-crescent": {
    ru: "Сделайте первые шаги — Луна поддерживает ваше движение.",
    en: "Take the first steps — the Moon supports your motion.",
    hi: "पहले कदम उठाएँ — चंद्रमा आपकी गति का समर्थन करता है।",
  },
  "first-quarter": {
    ru: "Действуйте решительно — преодолейте первое сопротивление.",
    en: "Act decisively — push through the first resistance.",
    hi: "निर्णायक कदम उठाएँ — पहले प्रतिरोध को पार करें।",
  },
  "waxing-gibbous": {
    ru: "Уточняйте и корректируйте — мелочи имеют значение.",
    en: "Refine and adjust — the details matter now.",
    hi: "परिष्कृत करें — विवरण अब मायने रखते हैं।",
  },
  "full": {
    ru: "Празднуйте и отпускайте — пик освещения, кульминация цикла.",
    en: "Celebrate and release — peak illumination, cycle's climax.",
    hi: "उत्सव मनाएँ और छोड़ें — अधिकतम प्रकाश, चक्र का चरम।",
  },
  "waning-gibbous": {
    ru: "Поделитесь урожаем — благодарность открывает новые двери.",
    en: "Share your harvest — gratitude opens new doors.",
    hi: "अपनी कटनी साझा करें — कृतज्ञता नए द्वार खोलती है।",
  },
  "last-quarter": {
    ru: "Простите и интегрируйте — отпустите то, что не работает.",
    en: "Forgive and integrate — release what isn't working.",
    hi: "क्षमा करें और एकीकृत करें — जो काम नहीं करता उसे छोड़ें।",
  },
  "waning-crescent": {
    ru: "Отпустите то, что больше не служит — тишина готовит новое начало.",
    en: "Release what no longer serves — silence prepares a new beginning.",
    hi: "जो अब सेवा नहीं करता उसे छोड़ें — शांति नई शुरुआत तैयार करती है।",
  },
};

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

/* ---------- SVG path math ---------- */
/**
 * Build the SVG path for the Moon's illuminated area.
 *
 * Phase angle convention (degrees, 0..360):
 *   0 = New, 90 = First Quarter, 180 = Full, 270 = Last Quarter.
 *
 * The lit area is bounded by:
 *   - a half of the outer circle (right half if waxing, left half if waning)
 *   - a half of the terminator ellipse with rx = R * |cos(phaseAngle)|, ry = R
 *
 * SVG sweep-flag: 1 = clockwise in screen coords (y-down), 0 = counter-clockwise.
 *
 * Derived sweep table (verified at all 4 quarter phases):
 *   Waxing crescent  (0   < p < 90):  outer=1, inner=1
 *   Waxing gibbous   (90  < p < 180): outer=1, inner=0
 *   Waning gibbous   (180 < p < 270): outer=0, inner=1
 *   Waning crescent  (270 < p < 360): outer=0, inner=0
 * Formula:  innerSweep = outerSweep XOR (cos < 0).
 */
function buildLitPath(
  cx: number,
  cy: number,
  R: number,
  phaseAngle: number,
): string {
  const waxing = phaseAngle < 180;
  const cosA = Math.cos((phaseAngle * Math.PI) / 180);
  const outerSweep = waxing ? 1 : 0;
  const innerSweep = outerSweep ^ (cosA < 0 ? 1 : 0);
  // |cos| drives the terminator ellipse rx; clamp to avoid degenerate-zero artefacts.
  const rx = Math.max(0.01, Math.abs(cosA) * R);
  return [
    `M ${cx.toFixed(3)} ${(cy - R).toFixed(3)}`,
    `A ${R} ${R} 0 0 ${outerSweep} ${cx.toFixed(3)} ${(cy + R).toFixed(3)}`,
    `A ${rx.toFixed(3)} ${R} 0 0 ${innerSweep} ${cx.toFixed(3)} ${(cy - R).toFixed(3)}`,
    "Z",
  ].join(" ");
}

/* ---------- Component ---------- */
export function RealMoonPhasePanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [data, setData] = useState<MoonPhaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pattern parity with RealHoroscopePanel / RealAspectsPanel — re-fetch on member change.
  const { member } = useMember();

  const t = (ru: string, en: string, hi: string) =>
    locale === "ru" ? ru : locale === "hi" ? hi : en;

  const loadMoonPhase = () => {
    setLoading(true);
    setError(null);
    fetch("/api/moon-phase")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: MoonPhaseData) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMoonPhase();
  }, [member]);

  /* ---------- SVG layout ---------- */
  const SIZE = 220;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 78;

  const litPath = useMemo(() => {
    if (!data) return "";
    return buildLitPath(cx, cy, R, data.phaseAngle);
  }, [data, cx, cy, R]);

  // Deterministic background sparkles (no randomness on re-render).
  const sparkles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => {
        const seed = (i + 1) * 7919;
        const x = ((seed * 2654435761) % 1000) / 1000;
        const y = ((seed * 40503) % 1000) / 1000;
        const r = 0.6 + ((seed % 7) / 7) * 1.0;
        const delay = (i % 7) * 0.4;
        return {
          x: x * SIZE,
          y: y * SIZE,
          r,
          delay,
          tone: i % 3 === 0 ? "#E8B86D" : i % 3 === 1 ? "#F5F0E8" : "#5BB89C",
        };
      }),
    [SIZE],
  );

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative overflow-hidden" ornamental glow>
        {/* Ambient gold glow at the top */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(232,184,109,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-3">
          <div>
            <h3 className="font-serif text-lg flex items-center gap-2" style={{ color: "#F5F0E8" }}>
              <Moon className="w-4 h-4" style={{ color: "#E8B86D" }} />
              {t("Лунная фаза", "Moon Phase", "चंद्र कला")}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#F5F0E860" }}>
              {t(
                "Реальная астрономия · astronomy-engine",
                "Real astronomy · astronomy-engine",
                "वास्तविक खगोल · astronomy-engine",
              )}
            </p>
          </div>
          <button
            onClick={loadMoonPhase}
            disabled={loading}
            className="p-1.5 rounded-lg transition-all hover:scale-105 disabled:opacity-50"
            style={{
              background: "rgba(11,11,15,0.6)",
              border: "1px solid rgba(232,184,109,0.3)",
            }}
            title={t("Обновить", "Refresh", "ताज़ा करें")}
            aria-label={t("Обновить", "Refresh", "ताज़ा करें")}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              style={{ color: "#E8B86D" }}
            />
          </button>
        </div>

        {/* Loading — spinning ☾ glyph */}
        {loading && (
          <div className="flex flex-col items-center py-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border-2 border-transparent flex items-center justify-center"
              style={{ borderTopColor: "#E8B86D", borderRightColor: "#5BB89C" }}
            >
              <span
                className="text-2xl cosmic-float"
                style={{ color: "#E8B86D", fontFamily: "serif" }}
              >
                ☾
              </span>
            </motion.div>
            <p className="mt-3 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
              {t(
                "Вычисляю лунную фазу...",
                "Computing moon phase...",
                "चंद्र कला की गणना...",
              )}
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            className="p-2 rounded text-[11px] mb-3"
            style={{ background: "#D98E7A15", color: "#D98E7A" }}
          >
            {t(
              "Не удалось получить фазу Луны",
              "Failed to load moon phase",
              "चंद्र कला लोड नहीं हुई",
            )}
            : {error}
          </div>
        )}

        {/* Main content — SVG + stats */}
        <AnimatePresence mode="wait">
          {data && !loading && (
            <motion.div
              key={data.phaseName + data.phaseAngle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45 }}
              className="relative"
            >
              <div className="flex flex-col md:flex-row items-center gap-5">
                {/* SVG Moon visualization */}
                <div className="relative shrink-0">
                  <svg
                    width={SIZE}
                    height={SIZE}
                    viewBox={`0 0 ${SIZE} ${SIZE}`}
                    className="max-w-full"
                    aria-hidden
                  >
                    <defs>
                      {/* Lit-side gradient — cream to gold */}
                      <radialGradient id="moonLit" cx="35%" cy="35%" r="75%">
                        <stop offset="0%" stopColor="#F8F2E6" />
                        <stop offset="55%" stopColor="#E8B86D" />
                        <stop offset="100%" stopColor="#B58E4D" />
                      </radialGradient>
                      {/* Dark-side subtle gradient — near-black with faint warmth */}
                      <radialGradient id="moonDark" cx="60%" cy="60%" r="75%">
                        <stop offset="0%" stopColor="#1A1A22" />
                        <stop offset="100%" stopColor="#0B0B0F" />
                      </radialGradient>
                      {/* Gold outer glow */}
                      <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(232,184,109,0.35)" />
                        <stop offset="55%" stopColor="rgba(232,184,109,0.10)" />
                        <stop offset="100%" stopColor="rgba(232,184,109,0)" />
                      </radialGradient>
                    </defs>

                    {/* Background sparkles */}
                    {sparkles.map((s, i) => (
                      <motion.circle
                        key={`spark-${i}`}
                        cx={s.x}
                        cy={s.y}
                        r={s.r}
                        fill={s.tone}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.2, 0.9, 0.2] }}
                        transition={{
                          duration: 3 + (i % 3),
                          delay: s.delay,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    ))}

                    {/* Outer glow halo */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={R + 22}
                      fill="url(#moonGlow)"
                      className="moon-glow-pulse"
                    />

                    {/* Dark side disc (full circle) */}
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      r={R}
                      fill="url(#moonDark)"
                      stroke="rgba(232,184,109,0.30)"
                      strokeWidth="0.8"
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{ transformOrigin: "center" }}
                    />

                    {/* Lit area path */}
                    <motion.path
                      d={litPath}
                      fill="url(#moonLit)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.25 }}
                      style={{
                        filter: "drop-shadow(0 0 6px rgba(232,184,109,0.45))",
                      }}
                    />

                    {/* Subtle craters on the lit side for texture */}
                    <motion.g
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.18 }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                      style={{ pointerEvents: "none" }}
                    >
                      <circle cx={cx - 18} cy={cy - 22} r="6" fill="#0B0B0F" />
                      <circle cx={cx + 22} cy={cy + 10} r="4" fill="#0B0B0F" />
                      <circle cx={cx - 5} cy={cy + 28} r="3.5" fill="#0B0B0F" />
                      <circle cx={cx + 28} cy={cy - 30} r="2.5" fill="#0B0B0F" />
                    </motion.g>

                    {/* Outer ornamental ring */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={R + 8}
                      fill="none"
                      stroke="rgba(232,184,109,0.18)"
                      strokeWidth="0.6"
                      strokeDasharray="2 4"
                    />
                  </svg>
                </div>

                {/* Stats column */}
                <div className="flex-1 w-full space-y-3 min-w-0">
                  {/* Phase name + illumination */}
                  <div>
                    <div
                      className="text-[10px] uppercase tracking-[0.18em]"
                      style={{ color: "#F5F0E860" }}
                    >
                      {t("Текущая фаза", "Current phase", "वर्तमान कला")}
                    </div>
                    <div
                      className="font-display text-2xl font-semibold mt-0.5"
                      style={{ color: "#E8B86D" }}
                    >
                      {PHASE_LABELS[data.phaseName][locale]}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-[#1C1C26] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round(data.illumination * 100)}%` }}
                          transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
                          className="h-full rounded-full"
                          style={{
                            background:
                              "linear-gradient(90deg, #B58E4D, #E8B86D, #F8F2E6)",
                          }}
                        />
                      </div>
                      <span
                        className="text-[12px] font-mono tabular-nums shrink-0"
                        style={{ color: "#F5F0E8" }}
                      >
                        {Math.round(data.illumination * 100)}%
                      </span>
                    </div>
                    <div
                      className="text-[10px] mt-1"
                      style={{ color: "#F5F0E860" }}
                    >
                      {t("Освещённость", "Illumination", "प्रकाशित")}
                    </div>
                  </div>

                  {/* Zodiac + next milestones */}
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className="rounded-lg p-2.5"
                      style={{
                        background: "rgba(91,184,156,0.07)",
                        border: "1px solid rgba(91,184,156,0.22)",
                      }}
                    >
                      <div
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "#F5F0E860" }}
                      >
                        {t("Луна в знаке", "Moon in", "चंद्रमा")}
                      </div>
                      <div
                        className="font-serif text-base flex items-center gap-1.5 mt-0.5"
                        style={{ color: "#5BB89C" }}
                      >
                        <span className="text-lg leading-none">
                          {ZODIAC_GLYPHS[data.zodiacSign] ?? "·"}
                        </span>
                        <span className="truncate">{data.zodiacSign}</span>
                      </div>
                    </div>
                    <div
                      className="rounded-lg p-2.5"
                      style={{
                        background: "rgba(232,184,109,0.07)",
                        border: "1px solid rgba(232,184,109,0.22)",
                      }}
                    >
                      <div
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "#F5F0E860" }}
                      >
                        {t("Дней до полнолуния", "Days to full", "पूर्णिमा तक")}
                      </div>
                      <div
                        className="font-display text-xl mt-0.5 tabular-nums"
                        style={{ color: "#E8B86D" }}
                      >
                        {data.daysUntilFullMoon.toFixed(1)}
                        <span className="text-[10px] ml-1 font-sans" style={{ color: "#F5F0E860" }}>
                          {t("дн", "d", "दि")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Moon mood lore */}
                  <div
                    className="rounded-lg p-2.5 flex items-start gap-2"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(232,184,109,0.06), rgba(91,184,156,0.04))",
                      border: "1px solid rgba(232,184,109,0.16)",
                    }}
                  >
                    <Sparkles
                      className="w-3.5 h-3.5 mt-0.5 shrink-0"
                      style={{ color: "#E8B86D" }}
                    />
                    <p
                      className="text-[12px] leading-relaxed font-serif italic"
                      style={{ color: "#F5F0E8" }}
                    >
                      {MOON_MOOD[data.phaseName][locale]}
                    </p>
                  </div>

                  {/* Phase angle technical readout */}
                  <div
                    className="flex items-center justify-between text-[10px] font-mono"
                    style={{ color: "#6B6B78" }}
                  >
                    <span>
                      ☾ {data.moonLongitude.toFixed(1)}° · ☉ {data.sunLongitude.toFixed(1)}°
                    </span>
                    <span>Δ {data.phaseAngle.toFixed(1)}°</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="text-center py-6">
            <Moon className="w-7 h-7 mx-auto" style={{ color: "#5BB89C" }} />
            <p className="mt-2 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
              {t("Нажмите обновить", "Click refresh", "ताज़ा करें दबाएँ")}
            </p>
          </div>
        )}
      </GlassCard>
    </FadeIn>
  );
}

export default RealMoonPhasePanel;
