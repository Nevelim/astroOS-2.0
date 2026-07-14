"use client";
/**
 * RealPlanetaryDignityPanel — essential dignity of today's transit planets.
 *
 * Pulls from `/api/transits` (now includes `dignity` + `dignityScore` per
 * planet). Renders a compact grid showing each planet's dignity status with
 * tone-colored badges:
 *   - Ruler (gold) — strongest, planet in its home sign
 *   - Exalted (jade) — very strong, planet in its exaltation sign
 *   - Neutral (muted) — average
 *   - Detriment (rose) — weak, opposite of home
 *   - Fall (rose) — very weak, opposite of exaltation
 *
 * Non-neutral planets get a highlighted card; neutral planets collapse into
 * a smaller summary row. A top stat shows the net dignity score.
 *
 * Clean Architecture: Interface Adapter (client component consuming REST).
 */
import { useState, useEffect } from "react";
import { GlassCard, SectionHeading, FadeIn } from "../ui";
import { CosmicSkeleton } from "../CosmicSkeleton";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

/* ───────── Types ───────── */

interface TransitPlanet {
  planet: string;
  symbol: string;
  color: string;
  sign: string;
  deg: number;
  min: number;
  lonDeg: number;
  retrograde?: boolean;
  dignity?: "Ruler" | "Exalted" | "Detriment" | "Fall" | "Neutral";
  dignityScore?: number;
}
interface TransitsResponse {
  timestamp: string;
  transits: TransitPlanet[];
}

/* ───────── Constants ───────── */

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const DIGNITY_LABELS: Record<string, { en: string; ru: string; hi: string }> = {
  Ruler: { en: "Ruler", ru: "Управитель", hi: "स्वामी" },
  Exalted: { en: "Exalted", ru: "Экзальтация", hi: "उच्च" },
  Detriment: { en: "Detriment", ru: "Изгнание", hi: "नीच" },
  Fall: { en: "Fall", ru: "Падение", hi: "पतन" },
  Neutral: { en: "Neutral", ru: "Нейтрально", hi: "तटस्थ" },
};

const DIGNITY_TONE: Record<string, "gold" | "jade" | "rose" | "neutral"> = {
  Ruler: "gold",
  Exalted: "jade",
  Detriment: "rose",
  Fall: "rose",
  Neutral: "neutral",
};

const TONE_CLASSES: Record<string, { border: string; text: string; bg: string; glow: string }> = {
  gold: {
    border: "border-[#E8B86D]/50",
    text: "text-[#E8B86D]",
    bg: "bg-[#E8B86D]/[0.08]",
    glow: "group-hover:shadow-[0_0_18px_-4px_rgba(232,184,109,0.5)]",
  },
  jade: {
    border: "border-[#5BB89C]/50",
    text: "text-[#5BB89C]",
    bg: "bg-[#5BB89C]/[0.08]",
    glow: "group-hover:shadow-[0_0_18px_-4px_rgba(91,184,156,0.5)]",
  },
  rose: {
    border: "border-[#D98E7A]/50",
    text: "text-[#D98E7A]",
    bg: "bg-[#D98E7A]/[0.08]",
    glow: "group-hover:shadow-[0_0_18px_-4px_rgba(217,142,122,0.5)]",
  },
  neutral: {
    border: "border-[#2A2A35]",
    text: "text-[#9A9AA8]",
    bg: "bg-[#121218]/70",
    glow: "",
  },
};

const DIGNITY_ICON: Record<string, string> = {
  Ruler: "♔",
  Exalted: "↑",
  Detriment: "↓",
  Fall: "⤓",
  Neutral: "·",
};

/* ───────── i18n ───────── */

function t(locale: "ru" | "en" | "hi", en: string, ru: string, hi: string) {
  return locale === "ru" ? ru : locale === "hi" ? hi : en;
}

function dignityLabel(locale: "ru" | "en" | "hi", dignity: string) {
  return DIGNITY_LABELS[dignity]?.[locale] ?? dignity;
}

function dignityDesc(locale: "ru" | "en" | "hi", dignity: string) {
  const map: Record<string, { en: string; ru: string; hi: string }> = {
    Ruler: {
      en: "In its home sign — strongest expression",
      ru: "В родном знаке — сильнейшее проявление",
      hi: "घर राशि में — सबसे मजबूत",
    },
    Exalted: {
      en: "In its exaltation sign — elevated energy",
      ru: "В знаке экзальтации — возвышенная энергия",
      hi: "उच्च राशि में — उन्नत ऊर्जा",
    },
    Detriment: {
      en: "Opposite of home — struggles to express",
      ru: "Противоположность родному — трудно проявиться",
      hi: "विपरीत राशि — कठिन अभिव्यक्ति",
    },
    Fall: {
      en: "Opposite of exaltation — energy diminished",
      ru: "Противоположность экзальтации — энергия угаслена",
      hi: "उच्च का विपरीत — क्षीण ऊर्जा",
    },
    Neutral: {
      en: "No special dignity — average expression",
      ru: "Без особого достоинства — среднее проявление",
      hi: "सामान्य अभिव्यक्ति",
    },
  };
  return map[dignity]?.[locale] ?? "";
}

/* ───────── Component ───────── */

export function RealPlanetaryDignityPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [data, setData] = useState<TransitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/transits")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as TransitsResponse;
        if (!cancelled) { setData(json); setError(null); }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "transits failed");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const heading = t(locale, "Planetary Dignity Today", "Достоинство планет сегодня", "आज का ग्रह गरिमा");
  const sub = t(locale, "Essential dignity of current transit positions", "Существенное достоинство текущих транзитов", "वर्तमान ग्रह गरिमा");
  const highlightedLabel = t(locale, "HIGHLIGHTED", "ОСОБЫЕ", "विशेष");
  const neutralLabel = t(locale, "NEUTRAL", "НЕЙТРАЛЬНЫЕ", "तटस्थ");
  const netScoreLabel = t(locale, "Net dignity score", "Суммарный балл достоинства", "कुल गरिमा स्कोर");
  const refreshLabel = t(locale, "Refresh", "Обновить", "ताज़ा करें");

  // Split planets into highlighted (non-neutral) + neutral.
  const all = data?.transits ?? [];
  const highlighted = all.filter((p) => p.dignity && p.dignity !== "Neutral");
  const neutrals = all.filter((p) => !p.dignity || p.dignity === "Neutral");
  const netScore = all.reduce((sum, p) => sum + (p.dignityScore ?? 0), 0);

  const netTone = netScore > 0 ? "gold" : netScore < 0 ? "rose" : "neutral";

  return (
    <FadeIn delay={0.054}>
      <GlassCard variant="neutral" hover className="relative overflow-hidden">
        {/* decorative ambient ring */}
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-40 w-40 rounded-full border border-dashed border-[#E8B86D]/10 astro-wheel-ambient-rotate" />
        <div className="relative flex items-start justify-between gap-3">
          <SectionHeading title={heading} subtitle={sub} variant="gold" />
          <div className="flex items-center gap-2">
            {/* Net score badge */}
            {data && (
              <div
                className={`flex flex-col items-end rounded-lg border px-2.5 py-1 ${
                  netTone === "gold" ? "border-[#E8B86D]/50 bg-[#E8B86D]/[0.08]" :
                  netTone === "rose" ? "border-[#D98E7A]/50 bg-[#D98E7A]/[0.08]" :
                  "border-[#2A2A35] bg-[#121218]/70"
                }`}
                title={netScoreLabel}
              >
                <span className="text-[9px] uppercase tracking-wider text-[#8A8A96]">{netScoreLabel}</span>
                <span className={`font-display text-lg font-semibold tabular-nums ${
                  netTone === "gold" ? "text-[#E8B86D]" : netTone === "rose" ? "text-[#D98E7A]" : "text-[#9A9AA8]"
                }`}>
                  {netScore > 0 ? "+" : ""}{netScore}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetch("/api/transits")
                  .then(async (r) => setData((await r.json()) as TransitsResponse))
                  .catch(() => {})
                  .finally(() => setLoading(false));
              }}
              disabled={loading}
              className="mt-1 shrink-0 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 p-1.5 transition-all hover:scale-105 hover:border-[#E8B86D]/50 disabled:opacity-50"
              aria-label={refreshLabel}
              title={refreshLabel}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: "#E8B86D" }} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CosmicSkeleton key={i} variant="card" className="h-14" />
              ))}
            </div>
          </div>
        ) : error ? (
          <p className="mt-4 text-sm text-[#D98E7A]">
            {t(locale, "Dignity unavailable", "Достоинство недоступно", "गरिमा उपलब्ध नहीं")}: {error}
          </p>
        ) : data ? (
          <div className="mt-4 space-y-4">
            {/* ── Highlighted (non-neutral) planets ── */}
            {highlighted.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#8A8A96]">
                  {highlightedLabel}
                  <span className="ml-2 text-[#9A9AA8]">({highlighted.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {highlighted.map((p, idx) => {
                    const tone = DIGNITY_TONE[p.dignity ?? "Neutral"];
                    const cls = TONE_CLASSES[tone];
                    return (
                      <motion.div
                        key={p.planet}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.3) }}
                        className={`group relative flex items-center gap-3 rounded-lg border ${cls.border} ${cls.bg} px-3 py-2.5 transition-all hover:-translate-y-0.5 ${cls.glow}`}
                        title={dignityDesc(locale, p.dignity ?? "Neutral")}
                      >
                        {/* planet glyph */}
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                          style={{
                            color: p.color,
                            background: `radial-gradient(circle at 50% 40%, ${p.color}22, transparent 70%)`,
                          }}
                        >
                          {p.symbol}
                        </span>
                        {/* details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#F5F0E8]">
                            <span>{p.planet}</span>
                            {p.retrograde && (
                              <span className="astro-rx-glyph text-[10px]" title="Retrograde">℞</span>
                            )}
                            <span className="text-[#8A8A96]">·</span>
                            <span className="text-[#E8B86D]">{ZODIAC_GLYPHS[p.sign] ?? "·"}</span>
                            <span className="text-[11px] text-[#9A9AA8]">{p.sign}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className={`text-[10px] ${cls.text}`}>{DIGNITY_ICON[p.dignity ?? "Neutral"]}</span>
                            <span className={`text-[11px] font-medium ${cls.text}`}>
                              {dignityLabel(locale, p.dignity ?? "Neutral")}
                            </span>
                            <span className="ml-auto text-[10px] tabular-nums text-[#8A8A96]">
                              {p.dignityScore && p.dignityScore > 0 ? "+" : ""}{p.dignityScore}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Neutral planets (compact row) ── */}
            {neutrals.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#8A8A96]">
                  {neutralLabel}
                  <span className="ml-2 text-[#9A9AA8]">({neutrals.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {neutrals.map((p) => (
                    <span
                      key={p.planet}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A35] bg-[#121218]/70 px-2.5 py-1 text-[11px] text-[#9A9AA8]"
                      title={`${p.planet} in ${p.sign} — ${dignityDesc(locale, "Neutral")}`}
                    >
                      <span style={{ color: p.color }}>{p.symbol}</span>
                      <span className="text-[#F5F0E8]">{p.planet}</span>
                      <span className="text-[#8A8A96]">·</span>
                      <span className="text-[#E8B86D]">{ZODIAC_GLYPHS[p.sign] ?? "·"}</span>
                      <span>{p.sign}</span>
                      {p.retrograde && <span className="astro-rx-glyph text-[9px]">℞</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* footer */}
            <div className="flex items-center justify-between border-t border-[#2A2A35] pt-2 text-[10px] text-[#8A8A96]">
              <span>
                {t(locale, "Scoring", "Оценка", "स्कोरिंग")}:{" "}
                <span className="text-[#E8B86D]">Ruler +5</span>
                <span className="text-[#8A8A96]"> · </span>
                <span className="text-[#5BB89C]">Exalted +4</span>
                <span className="text-[#8A8A96]"> · </span>
                <span className="text-[#9A9AA8]">Neutral 0</span>
                <span className="text-[#8A8A96]"> · </span>
                <span className="text-[#D98E7A]">Fall −2 · Detriment −3</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#E8B86D]" />
                {t(locale, "live", "вживую", "लाइव")}
              </span>
            </div>
          </div>
        ) : null}
      </GlassCard>
    </FadeIn>
  );
}
