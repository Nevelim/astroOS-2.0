"use client";
/**
 * RealRetrogradeSchedulePanel — upcoming retrograde cycles timeline.
 *
 * Pulls from `/api/retrograde-schedule`. Renders two zones:
 *   1. Active Rx banner — if any planet is currently retrograde, highlight it.
 *   2. Upcoming stations timeline — chronological list of Rx/direct stations
 *      across Mercury, Venus, Mars, Jupiter, Saturn, with planet glyph,
 *      station type, date, days-from-now, and zodiac sign.
 *
 * Visual system: Hades 2 cosmic dark. Rose for Rx stations (tension), jade for
 * direct stations (release/flow). Active cycle gets a shimmering border. Each
 * row has a small planet-colored glyph + a vertical timeline connector.
 *
 * Clean Architecture: Interface Adapter (client component consuming REST).
 */
import { useState, useEffect } from "react";
import { GlassCard, SectionHeading, FadeIn } from "../ui";
import { CosmicSkeleton } from "../CosmicSkeleton";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

/* ───────── Types ───────── */

interface RetrogradeCycle {
  planet: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  centerDate: string;
  sign: string;
  isActive: boolean;
  preShadowStart?: string;
  postShadowEnd?: string;
  isShadowActive?: boolean;
}
interface RetrogradeStation {
  planet: string;
  type: "retrograde" | "direct";
  date: string;
  daysFromNow: number;
  sign: string;
}
interface ScheduleResponse {
  generatedAt: string;
  byPlanet: Array<{ planet: string; cycles: RetrogradeCycle[] }>;
  stations: RetrogradeStation[];
}

/* ───────── Constants ───────── */

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☾", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
};

const PLANET_COLORS: Record<string, string> = {
  Sun: "#FBBF24", Moon: "#C4D3E0", Mercury: "#60A5FA", Venus: "#F472B6",
  Mars: "#EF4444", Jupiter: "#A78BFA", Saturn: "#94A3B8",
};

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

/* ───────── i18n ───────── */

function t(locale: "ru" | "en" | "hi", en: string, ru: string, hi: string) {
  return locale === "ru" ? ru : locale === "hi" ? hi : en;
}

function stationLabel(locale: "ru" | "en" | "hi", type: "retrograde" | "direct") {
  if (type === "retrograde") {
    return t(locale, "Turns retrograde", "Входит в ретроград", "पश्चगामी होता है");
  }
  return t(locale, "Turns direct", "Возвращается к прямому движению", "पुनः प्रत्यक्ष होता है");
}

function relativeDays(locale: "ru" | "en" | "hi", days: number) {
  if (days < 0) return t(locale, "now", "сейчас", "अभी");
  if (days === 0) return t(locale, "today", "сегодня", "आज");
  if (days === 1) return t(locale, "tomorrow", "завтра", "कल");
  if (locale === "ru") return `через ${days} дн.`;
  if (locale === "hi") return `${days} दिन में`;
  return `in ${days}d`;
}

/* ───────── Component ───────── */

export function RealRetrogradeSchedulePanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/retrograde-schedule")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as ScheduleResponse;
        if (!cancelled) { setData(json); setError(null); }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "schedule failed");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const heading = t(locale, "Retrograde Schedule", "Расписание ретроградов", "पश्चगामी कार्यक्रम");
  const sub = t(locale, "Upcoming planetary stations · astronomy-engine", "Предстоящие планетарные станции · astronomy-engine", "आगामी ग्रह स्टेशन · astronomy-engine");
  const activeLabel = t(locale, "ACTIVE NOW", "СЕЙЧАС АКТИВНО", "अभी सक्रिय");
  const upcomingLabel = t(locale, "UPCOMING STATIONS", "ПРЕДСТОЯЩИЕ СТАНЦИИ", "आगामी स्टेशन");
  const noActive = t(locale, "No planets retrograde right now", "Сейчас нет ретроградных планет", "अभी कोई ग्रह पश्चगामी नहीं है");
  const durationLabel = t(locale, "days", "дн.", "दिन");

  const activeCycles = data?.byPlanet.flatMap((p) =>
    p.cycles.filter((c) => c.isActive).map((c) => ({ ...c, planet: p.planet }))
  ) ?? [];
  const shadowCycles = data?.byPlanet.flatMap((p) =>
    p.cycles.filter((c) => c.isShadowActive && !c.isActive).map((c) => ({ ...c, planet: p.planet }))
  ) ?? [];
  const upcomingStations = data?.stations.filter((s) => s.daysFromNow > 0).slice(0, 8) ?? [];

  return (
    <FadeIn delay={0.05}>
      <GlassCard variant="rose" hover className="relative overflow-hidden">
        {/* decorative ambient ring */}
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full border border-dashed border-[#D98E7A]/15 astro-wheel-ambient-rotate" />
        <div className="relative flex items-start justify-between gap-3">
          <SectionHeading title={heading} subtitle={sub} variant="rose" />
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetch("/api/retrograde-schedule")
                .then(async (r) => setData((await r.json()) as ScheduleResponse))
                .catch(() => {})
                .finally(() => setLoading(false));
            }}
            disabled={loading}
            className="mt-1 shrink-0 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 p-1.5 transition-all hover:scale-105 hover:border-[#D98E7A]/50 disabled:opacity-50"
            aria-label={t(locale, "refresh schedule", "обновить расписание", "कार्यक्रम ताज़ा करें")}
            title={t(locale, "Refresh", "Обновить", "ताज़ा करें")}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: "#D98E7A" }} />
          </button>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-3">
            <CosmicSkeleton variant="card" className="h-16" />
            <div className="grid gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <CosmicSkeleton key={i} variant="line" />
              ))}
            </div>
          </div>
        ) : error ? (
          <p className="mt-4 text-sm text-[#D98E7A]">
            {t(locale, "Schedule unavailable", "Расписание недоступно", "कार्यक्रम उपलब्ध नहीं")}: {error}
          </p>
        ) : data ? (
          <div className="mt-4 space-y-4">
            {/* ── Active Rx banner ── */}
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#8A8A96]">{activeLabel}</div>
              {activeCycles.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#2A2A35] px-3 py-3 text-xs text-[#8A8A96]">
                  <span className="text-base">✓</span>
                  {noActive}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeCycles.map((c) => {
                    const color = PLANET_COLORS[c.planet] ?? "#E8B86D";
                    const totalMs = new Date(c.endDate).getTime() - new Date(c.startDate).getTime();
                    const elapsedMs = Date.now() - new Date(c.startDate).getTime();
                    const progress = Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
                    return (
                      <motion.div
                        key={c.planet}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="astro-rx-banner relative overflow-hidden rounded-lg border border-[#D98E7A]/45 bg-[#D98E7A]/[0.08] px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
                            style={{ color, boxShadow: `0 0 12px -2px ${color}99`, background: `radial-gradient(circle, ${color}22, transparent 70%)` }}
                          >
                            {PLANET_GLYPHS[c.planet] ?? "·"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-[#F5F0E8]">
                              <span className="astro-rx-glyph">℞</span>
                              <span>{c.planet}</span>
                              <span className="text-[#9A9AA8]">·</span>
                              <span className="text-[#E8B86D]">{ZODIAC_GLYPHS[c.sign] ?? "·"}</span>
                              <span className="text-[11px] text-[#9A9AA8]">{c.sign}</span>
                            </div>
                            <div className="mt-0.5 text-[10px] text-[#9A9AA8]">
                              {t(locale, "Direct", "Прямое", "प्रत्यक्ष")}: {new Date(c.endDate).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric" })}
                              <span className="ml-1.5 text-[#8A8A96]">· {c.durationDays}{durationLabel}</span>
                            </div>
                            {/* progress bar */}
                            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#0B0B0F]/80">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${progress}%`,
                                  background: `linear-gradient(90deg, ${color}, #D98E7A)`,
                                }}
                              />
                            </div>
                            {/* shadow period info */}
                            {c.postShadowEnd && new Date(c.postShadowEnd).getTime() > new Date(c.endDate).getTime() + 86400000 && (
                              <div className="mt-1.5 flex items-center gap-1.5 rounded border border-[#E8B86D]/20 bg-[#E8B86D]/[0.05] px-2 py-1 text-[9px] text-[#E8B86D]/80">
                                <span aria-hidden>◐</span>
                                <span>
                                  {t(locale, "Shadow until", "Тень до", "छाया तक")}:{" "}
                                  <span className="tabular-nums">
                                    {new Date(c.postShadowEnd).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric" })}
                                  </span>
                                </span>
                                <span className="ml-auto text-[#8A8A96]" title={t(locale, "Post-shadow: Rx effects may linger", "Пост-тень: эффекты ℞ могут сохраняться", "पश्च-छाया")}>
                                  {t(locale, "post-shadow", "пост-тень", "पश्च-छाया")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Shadow-active planets (in shadow but not Rx) ── */}
            {shadowCycles.length > 0 && (
              <div>
                <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#E8B86D]/70">
                  {t(locale, "IN SHADOW (pre/post)", "В ТЕНИ (пре/пост)", "छाया में")}
                  <span className="ml-2 text-[#9A9AA8]">({shadowCycles.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {shadowCycles.map((c) => {
                    const color = PLANET_COLORS[c.planet] ?? "#E8B86D";
                    const isPre = new Date(c.startDate).getTime() > Date.now();
                    return (
                      <span
                        key={`shadow-${c.planet}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E8B86D]/30 bg-[#E8B86D]/[0.06] px-2.5 py-1 text-[11px] text-[#E8B86D]/90"
                        title={isPre
                          ? t(locale, "Pre-shadow: entering Rx zone", "Пре-тень: входит в зону Rx", "पूर्व-छाया")
                          : t(locale, "Post-shadow: leaving Rx zone", "Пост-тень: покидает зону Rx", "पश्च-छाया")}
                      >
                        <span style={{ color }}>◐</span>
                        <span style={{ color }}>{PLANET_GLYPHS[c.planet] ?? "·"}</span>
                        <span>{c.planet}</span>
                        <span className="text-[#8A8A96]">·</span>
                        <span className="text-[10px]">
                          {isPre
                            ? t(locale, "pre-shadow", "пре-тень", "पूर्व")
                            : t(locale, "post-shadow", "пост-тень", "पश्च")}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Upcoming stations timeline ── */}
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#8A8A96]">{upcomingLabel}</div>
              {upcomingStations.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#2A2A35] px-3 py-4 text-center text-xs text-[#8A8A96]">
                  {t(locale, "No upcoming stations in range", "Нет предстоящих станций", "कोई आगामी स्टेशन नहीं")}.
                </p>
              ) : (
                <ol className="relative space-y-1.5 border-l border-[#2A2A35] pl-4">
                  {upcomingStations.map((s, idx) => {
                    const isRx = s.type === "retrograde";
                    const color = PLANET_COLORS[s.planet] ?? "#E8B86D";
                    const dotColor = isRx ? "#D98E7A" : "#5BB89C";
                    return (
                      <motion.li
                        key={`${s.planet}-${s.date}-${idx}`}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.4) }}
                        className="relative"
                      >
                        {/* timeline dot */}
                        <span
                          className="absolute -left-[21px] top-2.5 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-[#0B0B0F]"
                          style={{ background: dotColor, boxShadow: `0 0 8px -1px ${dotColor}aa` }}
                          aria-hidden
                        />
                        <div className="flex items-center gap-2.5 rounded-lg border border-[#2A2A35] bg-[#121218]/70 px-3 py-2 transition-colors hover:bg-[#16161D]">
                          <span
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm"
                            style={{ color, background: `radial-gradient(circle, ${color}22, transparent 70%)` }}
                          >
                            {PLANET_GLYPHS[s.planet] ?? "·"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[12px] text-[#F5F0E8]">
                              <span className="font-medium">{s.planet}</span>
                              <span className={isRx ? "text-[#D98E7A]" : "text-[#5BB89C]"}>
                                {isRx ? "℞" : "→"}
                              </span>
                              <span className="truncate text-[11px] text-[#9A9AA8]">
                                {stationLabel(locale, s.type)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#8A8A96]">
                              <span className="tabular-nums">
                                {new Date(s.date).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric" })}
                              </span>
                              <span>·</span>
                              <span className="text-[#E8B86D]">{ZODIAC_GLYPHS[s.sign] ?? "·"}</span>
                              <span>{s.sign}</span>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full border border-[#2A2A35] px-2 py-0.5 text-[10px] tabular-nums text-[#9A9AA8]">
                            {relativeDays(locale, s.daysFromNow)}
                          </span>
                        </div>
                      </motion.li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* footer */}
            <div className="flex items-center justify-between border-t border-[#2A2A35] pt-2 text-[10px] text-[#8A8A96]">
              <span>{t(locale, "℞ retrograde · → direct", "℞ ретроград · → прямое", "℞ पश्चगामी · → प्रत्यक्ष")}</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#D98E7A]" />
                {t(locale, "live", "вживую", "लाइव")}
              </span>
            </div>
          </div>
        ) : null}
      </GlassCard>
    </FadeIn>
  );
}
