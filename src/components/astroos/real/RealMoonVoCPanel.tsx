"use client";
/**
 * RealMoonVoCPanel — Moon Void of Course indicator.
 *
 * Pulls from `/api/moon-voc`. Shows:
 *   - Current VoC status: if VoC now, a prominent rose-tinted banner with a
 *     countdown to the sign ingress. If not VoC, a jade "clear" badge with a
 *     countdown to the next VoC start.
 *   - VoC period details: start/end times, duration, the last aspect that
 *     preceded it (planet + aspect type), and the sign ingress.
 *   - Following VoC period (collapsed) for planning ahead.
 *
 * Visual system: Hades 2 cosmic dark. Rose for active VoC (caution), jade for
 * Moon-clear (go-ahead). Animated countdown + shimmer on the active banner.
 *
 * Clean Architecture: Interface Adapter (client component consuming REST).
 */
import { useState, useEffect } from "react";
import { GlassCard, SectionHeading, FadeIn } from "../ui";
import { CosmicSkeleton } from "../CosmicSkeleton";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

/* ───────── Types ───────── */

interface MoonAspectEvent {
  time: string;
  planet: string;
  aspect: string;
  orb: number;
}
interface VoCPeriod {
  startTime: string;
  endTime: string;
  durationHours: number;
  sign: string;
  nextSign: string;
  lastAspect: MoonAspectEvent;
}
interface VoCResponse {
  isVoC: boolean;
  currentOrNext: VoCPeriod | null;
  following: VoCPeriod | null;
  currentSign: string;
  moonLonDeg: number;
  generatedAt: string;
}

/* ───────── Constants ───────── */

const ZODIAC_GLYPHS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const ASPECT_GLYPHS: Record<string, string> = {
  conjunction: "☌",
  sextile: "⚹",
  square: "☐",
  trine: "△",
  opposition: "☍",
};

const ASPECT_LABELS_EN: Record<string, string> = {
  conjunction: "Conjunction",
  sextile: "Sextile",
  square: "Square",
  trine: "Trine",
  opposition: "Opposition",
};

/* ───────── i18n ───────── */

function t(locale: "ru" | "en" | "hi", en: string, ru: string, hi: string) {
  return locale === "ru" ? ru : locale === "hi" ? hi : en;
}

function aspectLabel(locale: "ru" | "en" | "hi", aspect: string) {
  const map: Record<string, { en: string; ru: string; hi: string }> = {
    conjunction: { en: "Conjunction", ru: "Соединение", hi: "युति" },
    sextile: { en: "Sextile", ru: "Секстиль", hi: "षट्कोण" },
    square: { en: "Square", ru: "Квадрат", hi: "वर्ग" },
    trine: { en: "Trine", ru: "Трин", hi: "त्रिकोण" },
    opposition: { en: "Opposition", ru: "Оппозиция", hi: "वियोग" },
  };
  return map[aspect]?.[locale] ?? ASPECT_LABELS_EN[aspect] ?? aspect;
}

function fmtCountdown(locale: "ru" | "en" | "hi", ms: number): string {
  if (ms <= 0) return t(locale, "now", "сейчас", "अभी");
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const d = Math.floor(h / 24);
  if (d > 0) {
    const remH = h % 24;
    if (locale === "ru") return `${d}д ${remH}ч`;
    if (locale === "hi") return `${d}दि ${remH}घ`;
    return `${d}d ${remH}h`;
  }
  if (locale === "ru") return `${h}ч ${m}м`;
  if (locale === "hi") return `${h}घ ${m}मि`;
  return `${h}h ${m}m`;
}

function fmtDate(locale: "ru" | "en" | "hi", iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ───────── Component ───────── */

export function RealMoonVoCPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [data, setData] = useState<VoCResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/moon-voc")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as VoCResponse;
        if (!cancelled) { setData(json); setError(null); }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "VoC failed");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Tick every minute for live countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const heading = t(locale, "Moon Void of Course", "Луна без курса", "चंद्रमा बिना दिशा");
  const sub = t(locale, "When the Moon makes no major aspect before changing signs", "Когда Луна не делает аспектов до смены знака", "जब चंद्रमा राशि बदलने से पहले कोई पहलू नहीं बनाता");
  const vocNowLabel = t(locale, "MOON IS VOID OF COURSE", "ЛУНА БЕЗ КУРСА", "चंद्रमा बिना दिशा है");
  const clearNowLabel = t(locale, "MOON IS CLEAR", "ЛУНА НА КУРСЕ", "चंद्रमा सक्रिय है");
  const startsInLabel = t(locale, "Next VoC starts in", "Следующий VoC через", "अगला VoC");
  const endsInLabel = t(locale, "VoC ends in", "VoC закончится через", "VoC समाप्त");
  const lastAspectLabel = t(locale, "Last aspect", "Последний аспект", "अंतिम पहलू");
  const durationLabel = t(locale, "Duration", "Длительность", "अवधि");
  const entersLabel = t(locale, "enters", "входит в", "प्रवेश");
  const followingLabel = t(locale, "FOLLOWING VoC", "СЛЕДУЮЩИЙ VoC", "अगला VoC");
  const vocHint = t(locale,
    "Traditionally: avoid starting new ventures. Rest, reflect, complete existing tasks.",
    "Традиция: не начинать новых дел. Отдыхай, размышляй, завершай начатое.",
    "परंपरा: नए कार्य शुरू न करें। विश्राम करें।",
  );
  const clearHint = t(locale,
    "Good window for initiating new projects, decisions, and commitments.",
    "Хорошее окно для новых проектов, решений и обязательств.",
    "नई परियोजनाओं के लिए अच्छा समय।",
  );

  const current = data?.currentOrNext ?? null;
  const following = data?.following ?? null;
  const isVoC = data?.isVoC ?? false;

  // Countdown target: if VoC now → end time; else → start time of next VoC.
  const countdownMs = (() => {
    if (!current) return null;
    const target = isVoC ? new Date(current.endTime).getTime() : new Date(current.startTime).getTime();
    return target - now;
  })();

  return (
    <FadeIn delay={0.052}>
      <GlassCard variant={isVoC ? "rose" : "jade"} hover className="relative overflow-hidden">
        {/* decorative ambient ring */}
        <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border border-dashed astro-wheel-ambient-rotate ${isVoC ? "border-[#D98E7A]/15" : "border-[#5BB89C]/15"}`} />
        <div className="relative flex items-start justify-between gap-3">
          <SectionHeading title={heading} subtitle={sub} variant={isVoC ? "rose" : "jade"} />
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetch("/api/moon-voc")
                .then(async (r) => setData((await r.json()) as VoCResponse))
                .catch(() => {})
                .finally(() => setLoading(false));
            }}
            disabled={loading}
            className="mt-1 shrink-0 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 p-1.5 transition-all hover:scale-105 hover:border-[#E8B86D]/50 disabled:opacity-50"
            aria-label={t(locale, "refresh VoC", "обновить VoC", "VoC ताज़ा करें")}
            title={t(locale, "Refresh", "Обновить", "ताज़ा करें")}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: isVoC ? "#D98E7A" : "#5BB89C" }} />
          </button>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-3">
            <CosmicSkeleton variant="card" className="h-20" />
            <CosmicSkeleton variant="line" />
            <CosmicSkeleton variant="line" />
          </div>
        ) : error ? (
          <p className="mt-4 text-sm text-[#D98E7A]">
            {t(locale, "VoC unavailable", "VoC недоступен", "VoC उपलब्ध नहीं")}: {error}
          </p>
        ) : data && current ? (
          <div className="mt-4 space-y-4">
            {/* ── Status banner ── */}
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-xl border px-4 py-3 ${
                isVoC
                  ? "astro-rx-banner border-[#D98E7A]/55 bg-[#D98E7A]/[0.10]"
                  : "border-[#5BB89C]/45 bg-[#5BB89C]/[0.08]"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Moon glyph */}
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
                  style={{
                    color: isVoC ? "#D98E7A" : "#5BB89C",
                    background: `radial-gradient(circle at 50% 40%, ${isVoC ? "#D98E7A" : "#5BB89C"}22, transparent 70%)`,
                    boxShadow: `0 0 18px -4px ${isVoC ? "#D98E7A" : "#5BB89C"}aa`,
                  }}
                >
                  ☾
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isVoC ? "text-[#D98E7A]" : "text-[#5BB89C]"}`}>
                    {isVoC ? vocNowLabel : clearNowLabel}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-[10px] text-[#9A9AA8]">
                      {isVoC ? endsInLabel : startsInLabel}
                    </span>
                    {countdownMs !== null && (
                      <span className="font-display text-xl font-semibold tabular-nums text-[#F5F0E8]">
                        {fmtCountdown(locale, countdownMs)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] leading-snug text-[#9A9AA8]">
                    {isVoC ? vocHint : clearHint}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── VoC period details ── */}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-[#2A2A35] bg-[#121218]/70 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B78]">
                  {t(locale, "VoC start", "Начало VoC", "VoC शुरू")}
                </div>
                <div className="mt-0.5 text-[12px] tabular-nums text-[#F5F0E8]">
                  {fmtDate(locale, current.startTime)}
                </div>
              </div>
              <div className="rounded-lg border border-[#2A2A35] bg-[#121218]/70 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B78]">
                  {t(locale, "VoC end", "Конец VoC", "VoC समाप्त")}
                </div>
                <div className="mt-0.5 text-[12px] tabular-nums text-[#F5F0E8]">
                  {fmtDate(locale, current.endTime)}
                </div>
              </div>
              <div className="rounded-lg border border-[#2A2A35] bg-[#121218]/70 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B78]">
                  {durationLabel}
                </div>
                <div className="mt-0.5 text-[12px] tabular-nums text-[#F5F0E8]">
                  {current.durationHours}h
                </div>
              </div>
              <div className="rounded-lg border border-[#2A2A35] bg-[#121218]/70 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B78]">
                  {t(locale, "Sign ingress", "Вход в знак", "राशि प्रवेश")}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[#F5F0E8]">
                  <span className="text-[#E8B86D]">{ZODIAC_GLYPHS[current.sign] ?? "·"}</span>
                  <span className="text-[#9A9AA8]">{current.sign}</span>
                  <span className="text-[#6B6B78]">→</span>
                  <span className="text-[#E8B86D]">{ZODIAC_GLYPHS[current.nextSign] ?? "·"}</span>
                  <span className="text-[#9A9AA8]">{entersLabel} {current.nextSign}</span>
                </div>
              </div>
            </div>

            {/* ── Last aspect ── */}
            <div className="rounded-lg border border-[#2A2A35] bg-[#16161D]/80 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B78]">
                  {lastAspectLabel}
                </div>
                <span className="text-[10px] tabular-nums text-[#6B6B78]">
                  {fmtDate(locale, current.lastAspect.time)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[13px] text-[#F5F0E8]">
                <span className="text-[#C4D3E0]">☾</span>
                <span className="text-[#E8B86D]">{ASPECT_GLYPHS[current.lastAspect.aspect] ?? "·"}</span>
                <span className="text-[#9A9AA8]">{aspectLabel(locale, current.lastAspect.aspect)}</span>
                <span className="text-[#6B6B78]">·</span>
                <span className="text-[#C4D3E0]">{current.lastAspect.planet}</span>
                <span className="ml-auto text-[10px] tabular-nums text-[#6B6B78]">
                  {t(locale, "orb", "орб", "अरब")} {current.lastAspect.orb.toFixed(2)}°
                </span>
              </div>
            </div>

            {/* ── Following VoC ── */}
            {following && (
              <div className="rounded-lg border border-dashed border-[#2A2A35] bg-[#0B0B0F]/40 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B78]">
                  {followingLabel}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[#9A9AA8]">
                  <span className="tabular-nums">{fmtDate(locale, following.startTime)}</span>
                  <span className="text-[#6B6B78]">→</span>
                  <span className="tabular-nums">{fmtDate(locale, following.endTime)}</span>
                  <span className="ml-auto text-[#6B6B78]">{following.durationHours}h</span>
                </div>
              </div>
            )}

            {/* footer */}
            <div className="flex items-center justify-between border-t border-[#2A2A35] pt-2 text-[10px] text-[#6B6B78]">
              <span>
                {t(locale, "Moon in", "Луна в", "चंद्रमा")}:{" "}
                <span className="text-[#E8B86D]">{ZODIAC_GLYPHS[data.currentSign] ?? "·"}</span>{" "}
                <span>{data.currentSign}</span>
                <span className="ml-1 tabular-nums">{data.moonLonDeg.toFixed(1)}°</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`inline-block h-1.5 w-1.5 animate-pulse rounded-full ${isVoC ? "bg-[#D98E7A]" : "bg-[#5BB89C]"}`} />
                {t(locale, "live", "вживую", "लाइव")}
              </span>
            </div>
          </div>
        ) : null}
      </GlassCard>
    </FadeIn>
  );
}
