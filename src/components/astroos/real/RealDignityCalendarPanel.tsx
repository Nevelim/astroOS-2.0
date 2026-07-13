"use client";
/**
 * RealDignityCalendarPanel — upcoming essential dignity transitions.
 *
 * Pulls from `/api/dignity-calendar`. Shows:
 *   - Upcoming transitions timeline: chronological list of dignity changes
 *     over the next 30 days, with planet glyph, from→to dignity, date, zodiac sign.
 *   - Month summary: for each planet, how many days it spends in each dignity.
 *
 * Visual system: Hades 2 cosmic dark. Tone-coded transitions: gold for
 * Ruler/Exalted entries, rose for Detriment/Fall, muted for Neutral.
 *
 * Clean Architecture: Interface Adapter (client component consuming REST).
 */
import { useState, useEffect } from "react";
import { GlassCard, SectionHeading, FadeIn } from "../ui";
import { CosmicSkeleton } from "../CosmicSkeleton";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

/* ───────── Types ───────── */

type DignityType = "Ruler" | "Exalted" | "Detriment" | "Fall" | "Neutral";

interface DignityTransition {
  date: string;
  planet: string;
  from: DignityType | null;
  to: DignityType;
  sign: string;
  daysFromNow: number;
}
interface PlanetDignityState {
  planet: string;
  sign: string;
  dignity: DignityType;
  score: number;
}
interface CalendarResponse {
  generatedAt: string;
  current: PlanetDignityState[];
  transitions: DignityTransition[];
  monthSummary: Array<{ planet: string; byDignity: Partial<Record<DignityType, number>> }>;
}

/* ───────── Constants ───────── */

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☾", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄",
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "#FBBF24", Moon: "#C4D3E0", Mercury: "#60A5FA", Venus: "#F472B6",
  Mars: "#EF4444", Jupiter: "#A78BFA", Saturn: "#94A3B8",
};

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const DIGNITY_GLYPHS: Record<DignityType, string> = {
  Ruler: "♔",
  Exalted: "↑",
  Detriment: "↓",
  Fall: "⤓",
  Neutral: "·",
};

const DIGNITY_TONE: Record<DignityType, "gold" | "jade" | "rose" | "neutral"> = {
  Ruler: "gold",
  Exalted: "jade",
  Detriment: "rose",
  Fall: "rose",
  Neutral: "neutral",
};

const TONE_TEXT: Record<string, string> = {
  gold: "text-[#E8B86D]",
  jade: "text-[#5BB89C]",
  rose: "text-[#D98E7A]",
  neutral: "text-[#9A9AA8]",
};

const TONE_DOT: Record<string, string> = {
  gold: "#E8B86D",
  jade: "#5BB89C",
  rose: "#D98E7A",
  neutral: "#6B6B78",
};

/* ───────── i18n ───────── */

function t(locale: "ru" | "en" | "hi", en: string, ru: string, hi: string) {
  return locale === "ru" ? ru : locale === "hi" ? hi : en;
}

function dignityLabel(locale: "ru" | "en" | "hi", dignity: DignityType) {
  const map: Record<DignityType, { en: string; ru: string; hi: string }> = {
    Ruler: { en: "Ruler", ru: "Управитель", hi: "स्वामी" },
    Exalted: { en: "Exalted", ru: "Экзальтация", hi: "उच्च" },
    Detriment: { en: "Detriment", ru: "Изгнание", hi: "नीच" },
    Fall: { en: "Fall", ru: "Падение", hi: "पतन" },
    Neutral: { en: "Neutral", ru: "Нейтрально", hi: "तटस्थ" },
  };
  return map[dignity]?.[locale] ?? dignity;
}

function fmtDate(locale: "ru" | "en" | "hi", iso: string): string {
  return new Date(iso).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric" });
}

/* ───────── Component ───────── */

export function RealDignityCalendarPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/dignity-calendar")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as CalendarResponse;
        if (!cancelled) { setData(json); setError(null); }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "calendar failed");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const heading = t(locale, "Dignity Calendar", "Календарь достоинств", "गरिमा कैलेंडर");
  const sub = t(locale, "Essential dignity transitions · next 30 days", "Переходы достоинств · 30 дней", "गरिमा संक्रमण · 30 दिन");
  const upcomingLabel = t(locale, "UPCOMING TRANSITIONS", "ПРЕДСТОЯЩИЕ ПЕРЕХОДЫ", "आगामी संक्रमण");
  const monthLabel = t(locale, "MONTH SUMMARY (days)", "МЕСЯЦ (дней)", "मासिक सारांश");
  const refreshLabel = t(locale, "Refresh", "Обновить", "ताज़ा करें");
  const noTransitions = t(locale, "No dignity transitions in the next 30 days", "Нет переходов достоинств в ближайшие 30 дней", "30 दिन में कोई संक्रमण नहीं");

  // Show only non-trivial transitions (exclude Neutral → Neutral, and from null = initial).
  const transitions = data?.transitions ?? [];
  // Group month summary: only planets with non-neutral days.
  const summary = data?.monthSummary.filter((m) => {
    const bd = m.byDignity;
    return (bd.Ruler ?? 0) > 0 || (bd.Exalted ?? 0) > 0 || (bd.Detriment ?? 0) > 0 || (bd.Fall ?? 0) > 0;
  }) ?? [];

  return (
    <FadeIn delay={0.056}>
      <GlassCard variant="gold" hover className="relative overflow-hidden">
        {/* decorative ambient ring */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border border-dashed border-[#E8B86D]/10 astro-wheel-ambient-rotate" />
        <div className="relative flex items-start justify-between gap-3">
          <SectionHeading title={heading} subtitle={sub} variant="gold" />
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetch("/api/dignity-calendar")
                .then(async (r) => setData((await r.json()) as CalendarResponse))
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

        {loading ? (
          <div className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <CosmicSkeleton key={i} variant="line" />
              ))}
            </div>
          </div>
        ) : error ? (
          <p className="mt-4 text-sm text-[#D98E7A]">
            {t(locale, "Calendar unavailable", "Календарь недоступен", "कैलेंडर उपलब्ध नहीं")}: {error}
          </p>
        ) : data ? (
          <div className="mt-4 space-y-4">
            {/* ── Upcoming transitions timeline ── */}
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#6B6B78]">
                {upcomingLabel}
                <span className="ml-2 text-[#9A9AA8]">({transitions.length})</span>
              </div>
              {transitions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#2A2A35] px-3 py-4 text-center text-xs text-[#6B6B78]">
                  {noTransitions}
                </p>
              ) : (
                <ol className="relative space-y-1.5 border-l border-[#2A2A35] pl-4">
                  {transitions.slice(0, 10).map((tr, idx) => {
                    const tone = DIGNITY_TONE[tr.to];
                    const dotColor = TONE_DOT[tone];
                    const planetColor = PLANET_COLORS[tr.planet] ?? "#E8B86D";
                    return (
                      <motion.li
                        key={`${tr.planet}-${tr.date}-${idx}`}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.4) }}
                        className="relative"
                      >
                        <span
                          className="absolute -left-[21px] top-2.5 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-[#0B0B0F]"
                          style={{ background: dotColor, boxShadow: `0 0 8px -1px ${dotColor}aa` }}
                          aria-hidden
                        />
                        <div className="flex items-center gap-2.5 rounded-lg border border-[#2A2A35] bg-[#121218]/70 px-3 py-2 transition-colors hover:bg-[#16161D]">
                          {/* planet glyph */}
                          <span
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm"
                            style={{ color: planetColor, background: `radial-gradient(circle, ${planetColor}22, transparent 70%)` }}
                          >
                            {PLANET_GLYPHS[tr.planet] ?? "·"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[12px] text-[#F5F0E8]">
                              <span className="font-medium">{tr.planet}</span>
                              <span className="text-[#6B6B78]">·</span>
                              <span className="text-[10px] text-[#9A9AA8]">
                                {tr.from ? dignityLabel(locale, tr.from) : "—"}
                              </span>
                              <span className="text-[#6B6B78]">→</span>
                              <span className={`text-[11px] font-medium ${TONE_TEXT[tone]}`}>
                                {DIGNITY_GLYPHS[tr.to]} {dignityLabel(locale, tr.to)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#6B6B78]">
                              <span className="text-[#E8B86D]">{ZODIAC_GLYPHS[tr.sign] ?? "·"}</span>
                              <span>{tr.sign}</span>
                              <span>·</span>
                              <span className="tabular-nums">{fmtDate(locale, tr.date)}</span>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full border border-[#2A2A35] px-2 py-0.5 text-[10px] tabular-nums text-[#9A9AA8]">
                            +{tr.daysFromNow}d
                          </span>
                        </div>
                      </motion.li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* ── Month summary ── */}
            {summary.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#6B6B78]">{monthLabel}</div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {summary.map((m) => {
                    const planetColor = PLANET_COLORS[m.planet] ?? "#E8B86D";
                    const entries = (["Ruler", "Exalted", "Detriment", "Fall"] as DignityType[])
                      .map((d) => ({ dignity: d, days: m.byDignity[d] ?? 0 }))
                      .filter((e) => e.days > 0);
                    return (
                      <div key={m.planet} className="rounded-lg border border-[#2A2A35] bg-[#121218]/70 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#F5F0E8]">
                          <span style={{ color: planetColor }}>{PLANET_GLYPHS[m.planet] ?? "·"}</span>
                          <span>{m.planet}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {entries.map((e) => {
                            const tone = DIGNITY_TONE[e.dignity];
                            return (
                              <span key={e.dignity} className={`inline-flex items-center gap-1 text-[10px] ${TONE_TEXT[tone]}`}>
                                <span>{DIGNITY_GLYPHS[e.dignity]}</span>
                                <span>{e.days}d</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* footer */}
            <div className="flex items-center justify-between border-t border-[#2A2A35] pt-2 text-[10px] text-[#6B6B78]">
              <span>
                <span className="text-[#E8B86D]">♔ Ruler</span>
                <span className="text-[#6B6B78]"> · </span>
                <span className="text-[#5BB89C]">↑ Exalted</span>
                <span className="text-[#6B6B78]"> · </span>
                <span className="text-[#D98E7A]">↓ Detriment · ⤓ Fall</span>
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
