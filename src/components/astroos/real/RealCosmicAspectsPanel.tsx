"use client";
/**
 * RealCosmicAspectsPanel — today's live planetary positions + aspect grid.
 *
 * Pulls from `/api/transits` (now returning real signs after the ecliptic
 * longitude fix). Renders two zones:
 *   1. Planet row — 7 planets as color-dot pills (glyph + sign + deg/min).
 *   2. Aspect grid — major aspects (☌ △ ⚹ ☐ ☍) with orb + tone coloring.
 *
 * Visual system: Hades 2 cosmic dark. Gold for conjunctions, jade for
 * flowing aspects (trine/sextile), rose for hard aspects (square/opposite).
 * Hover lifts the card and amplifies the planet glow.
 *
 * Clean Architecture: Interface Adapter (client component consuming a REST
 * endpoint; no domain logic here).
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
}
interface TransitAspect {
  a: string;
  b: string;
  type: string;
  orb: number;
}
interface TransitsResponse {
  timestamp: string;
  transits: TransitPlanet[];
  aspects: TransitAspect[];
  moonPhase: { phase: string; illumination: number };
}

/* ───────── Constants ───────── */

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunct: "☌",
  trine: "△",
  sextile: "⚹",
  square: "☐",
  opposite: "☍",
};

const ASPECT_LABELS_EN: Record<string, string> = {
  conjunct: "Conjunction",
  trine: "Trine",
  sextile: "Sextile",
  square: "Square",
  opposite: "Opposition",
};

const ASPECT_TONE: Record<string, "gold" | "jade" | "rose"> = {
  conjunct: "gold",
  trine: "jade",
  sextile: "jade",
  square: "rose",
  opposite: "rose",
};

const TONE_RING: Record<string, string> = {
  gold: "astro-aspect-gold",
  jade: "astro-aspect-jade",
  rose: "astro-aspect-rose",
};

const TONE_TEXT: Record<string, string> = {
  gold: "text-[#E8B86D]",
  jade: "text-[#5BB89C]",
  rose: "text-[#D98E7A]",
};

const TONE_GLOW: Record<string, string> = {
  gold: "group-hover:shadow-[0_0_22px_-4px_rgba(232,184,109,0.55)]",
  jade: "group-hover:shadow-[0_0_22px_-4px_rgba(91,184,156,0.55)]",
  rose: "group-hover:shadow-[0_0_22px_-4px_rgba(217,142,122,0.55)]",
};

/* ───────── i18n ───────── */

function t(locale: "ru" | "en" | "hi", en: string, ru: string, hi: string) {
  return locale === "ru" ? ru : locale === "hi" ? hi : en;
}

const ASPECT_LABELS = (locale: "ru" | "en" | "hi", type: string) => {
  const map: Record<string, { en: string; ru: string; hi: string }> = {
    conjunct: { en: "Conjunction", ru: "Соединение", hi: "युति" },
    trine: { en: "Trine", ru: "Трин", hi: "त्रिकोण" },
    sextile: { en: "Sextile", ru: "Секстиль", hi: "षट्कोण" },
    square: { en: "Square", ru: "Квадрат", hi: "वर्ग" },
    opposite: { en: "Opposition", ru: "Оппозиция", hi: "वियोग" },
  };
  return map[type]?.[locale] ?? ASPECT_LABELS_EN[type] ?? type;
};

/* ───────── Component ───────── */

export function RealCosmicAspectsPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
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
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "transits failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const heading = t(locale, "Cosmic Aspects Today", "Космические аспекты сегодня", "आज के ब्रह्मांडीय पहलू");
  const sub = t(locale, "Live planetary geometry · astronomy-engine", "Живая планетарная геометрия · astronomy-engine", "तत्काल ग्रह ज्यामिति · astronomy-engine");
  const planetsLabel = t(locale, "PLANETS NOW", "ПЛАНЕТЫ СЕЙЧАС", "अभी ग्रह");
  const aspectsLabel = t(locale, "MAJOR ASPECTS", "ОСНОВНЫЕ АСПЕКТЫ", "प्रमुख पहलू");
  const orbLabel = t(locale, "orb", "орб", "अरब");

  return (
    <FadeIn delay={0.046}>
      <GlassCard variant="jade" hover className="relative overflow-hidden">
        {/* decorative ambient ring */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border border-dashed border-[#5BB89C]/15 astro-wheel-ambient-rotate" />
        <div className="relative flex items-start justify-between gap-3">
          <SectionHeading
            title={heading}
            subtitle={sub}
            variant="jade"
          />
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
            className="mt-1 shrink-0 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 p-1.5 transition-all hover:scale-105 hover:border-[#5BB89C]/50 disabled:opacity-50"
            aria-label={t(locale, "refresh aspects", "обновить аспекты", "पहलू ताज़ा करें")}
            title={t(locale, "Refresh", "Обновить", "ताज़ा करें")}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: "#5BB89C" }} />
          </button>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-3">
            <CosmicSkeleton variant="line" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <CosmicSkeleton key={i} variant="card" className="h-16" />
              ))}
            </div>
            <CosmicSkeleton variant="line" />
          </div>
        ) : error ? (
          <p className="mt-4 text-sm text-[#D98E7A]">
            {t(locale, "Transits unavailable", "Транзиты недоступны", "पहलू उपलब्ध नहीं")}: {error}
          </p>
        ) : data ? (
          <div className="mt-4 space-y-5">
            {/* ── Planet row ── */}
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#6B6B78]">{planetsLabel}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {data.transits.map((p) => (
                  <motion.div
                    key={p.planet}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="group relative flex flex-col items-center rounded-xl border border-[#2A2A35] bg-[#121218]/70 px-2 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-[color:var(--accent,#5BB89C)]/40"
                    style={{ ["--accent" as string]: p.color }}
                  >
                    <span
                      className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-base"
                      style={{
                        color: p.color,
                        boxShadow: `0 0 14px -3px ${p.color}88`,
                        background: `radial-gradient(circle at 50% 40%, ${p.color}22, transparent 70%)`,
                      }}
                    >
                      {p.symbol}
                    </span>
                    <span className="text-[11px] font-semibold text-[#F5F0E8]">{p.planet}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[#9A9AA8]">
                      <span className="text-[#E8B86D]">{ZODIAC_GLYPHS[p.sign] ?? "·"}</span>
                      <span>{p.sign}</span>
                    </span>
                    <span className="mt-0.5 text-[10px] tabular-nums text-[#6B6B78]">
                      {p.deg}°{p.min.toString().padStart(2, "0")}′
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── Aspect grid ── */}
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#6B6B78]">
                {aspectsLabel}
                <span className="ml-2 text-[#9A9AA8]">({data.aspects.length})</span>
              </div>
              {data.aspects.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#2A2A35] px-3 py-4 text-center text-xs text-[#6B6B78]">
                  {t(locale, "No major aspects within orb today", "Сегодня нет крупных аспектов в орбе", "आज कोई प्रमुख पहलू नहीं")}.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.aspects.map((asp, idx) => {
                    const tone = ASPECT_TONE[asp.type] ?? "gold";
                    const planetA = data.transits.find((p) => p.planet === asp.a);
                    const planetB = data.transits.find((p) => p.planet === asp.b);
                    return (
                      <motion.div
                        key={`${asp.a}-${asp.b}-${asp.type}`}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.4) }}
                        className={`group relative flex items-center gap-2.5 rounded-lg border border-[#2A2A35] bg-[#16161D]/80 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:bg-[#1B1B24] ${TONE_GLOW[tone]}`}
                      >
                        {/* aspect symbol badge */}
                        <span
                          className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-lg ${TONE_RING[tone]}`}
                          aria-hidden
                        >
                          {ASPECT_SYMBOLS[asp.type] ?? "·"}
                        </span>
                        {/* planet pair */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-[#F5F0E8]">
                            <span style={{ color: planetA?.color ?? "#E8B86D" }}>{planetA?.symbol ?? asp.a}</span>
                            <span className="text-[#6B6B78]">·</span>
                            <span style={{ color: planetB?.color ?? "#E8B86D" }}>{planetB?.symbol ?? asp.b}</span>
                            <span className="ml-1 truncate text-[11px] text-[#9A9AA8]">{asp.a}–{asp.b}</span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between">
                            <span className={`text-[11px] font-medium ${TONE_TEXT[tone]}`}>
                              {ASPECT_LABELS(locale, asp.type)}
                            </span>
                            <span className="text-[10px] tabular-nums text-[#6B6B78]">
                              {orbLabel} {asp.orb.toFixed(1)}°
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* timestamp footer */}
            <div className="flex items-center justify-between border-t border-[#2A2A35] pt-2 text-[10px] text-[#6B6B78]">
              <span>
                {t(locale, "Snapshot", "Снимок", "स्नैपशॉट")}:{" "}
                <span className="tabular-nums">{new Date(data.timestamp).toLocaleTimeString(locale === "ru" ? "ru-RU" : locale === "hi" ? "hi-IN" : "en-US")}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#5BB89C]" />
                {t(locale, "live", "вживую", "लाइव")}
              </span>
            </div>
          </div>
        ) : null}
      </GlassCard>
    </FadeIn>
  );
}
