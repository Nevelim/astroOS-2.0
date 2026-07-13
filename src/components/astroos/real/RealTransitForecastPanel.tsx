"use client";
/**
 * RealTransitForecastPanel — 7-day planetary transit forecast.
 * Fetches /api/transit-forecast (astronomy-engine for real planet positions).
 * Shows day-by-day planet positions + sign ingresses + moon phase.
 * Hades 2 visual: gold GlassCard, animated planet rows, ingress highlights.
 */
import { useState, useEffect } from "react";
import { GlassCard, Pill, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, RefreshCw, Loader2, TrendingUp } from "lucide-react";

type Locale = "ru" | "en" | "hi";

interface PlanetPosition {
  planet: string;
  glyph: string;
  color: string;
  lon: number;
  sign: string;
  signGlyph: string;
  deg: number;
}

interface Ingress {
  day: number;
  planet: string;
  glyph: string;
  fromSign: string;
  toSign: string;
  fromGlyph: string;
  toGlyph: string;
  dateLabel: string;
}

interface DayForecast {
  date: string;
  dateLabel: string;
  planets: PlanetPosition[];
  ingresses: Ingress[];
  moonPhaseAngle: number;
}

interface ForecastData {
  forecast: DayForecast[];
  upcomingIngresses: Ingress[];
  current: DayForecast;
  timestamp: string;
}

const PLANET_ORDER = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"];

function t(locale: Locale, ru: string, en: string, hi: string) {
  return locale === "ru" ? ru : locale === "hi" ? hi : en;
}

function getMoonPhaseName(angle: number): { name: { ru: string; en: string; hi: string }; emoji: string } {
  const a = ((angle % 360) + 360) % 360;
  if (a < 22.5 || a >= 337.5) return { name: { ru: "Новолуние", en: "New Moon", hi: "अमावस्या" }, emoji: "🌑" };
  if (a < 67.5) return { name: { ru: "Растущий серп", en: "Waxing Crescent", hi: "बढ़ता अर्धचंद्र" }, emoji: "🌒" };
  if (a < 112.5) return { name: { ru: "Первая четверть", en: "First Quarter", hi: "प्रथम चतुर्थांश" }, emoji: "🌓" };
  if (a < 157.5) return { name: { ru: "Растущая Луна", en: "Waxing Gibbous", hi: "बढ़ता गिब्बस" }, emoji: "🌔" };
  if (a < 202.5) return { name: { ru: "Полнолуние", en: "Full Moon", hi: "पूर्णिमा" }, emoji: "🌕" };
  if (a < 247.5) return { name: { ru: "Убывающая Луна", en: "Waning Gibbous", hi: "घटता गिब्बस" }, emoji: "🌖" };
  if (a < 292.5) return { name: { ru: "Последняя четверть", en: "Last Quarter", hi: "अंतिम चतुर्थांश" }, emoji: "🌗" };
  return { name: { ru: "Убывающий серп", en: "Waning Crescent", hi: "घटता अर्धचंद्र" }, emoji: "🌘" };
}

export function RealTransitForecastPanel({ locale }: { locale: Locale }) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    fetch("/api/transit-forecast")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const refresh = () => {
    setLoading(true);
    fetch("/api/transit-forecast")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  if (loading) {
    return (
      <GlassCard variant="gold" className="p-5" ornamental>
        <div className="flex flex-col items-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "#E8B86D", borderRightColor: "#5BB89C" }}
          >
            <Calendar className="w-4 h-4 m-auto mt-4" style={{ color: "#E8B86D" }} />
          </motion.div>
          <p className="mt-3 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
            {t(locale, "Вычисляю транзиты на 7 дней...", "Computing 7-day transits...", "7-दिन ट्रांज़िट की गणना...")}
          </p>
        </div>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard variant="rose" className="p-5">
        <p className="text-sm text-[#D98E7A]">{error ?? "Unknown error"}</p>
        <button onClick={refresh} className="mt-2 text-xs text-[#9A9AA8] hover:text-[#E8B86D]">
          {t(locale, "Повторить", "Retry", "पुनः प्रयास")}
        </button>
      </GlassCard>
    );
  }

  const currentDay = data.forecast[selectedDay];
  const moonPhase = getMoonPhaseName(currentDay.moonPhaseAngle);
  const isToday = selectedDay === 0;

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative astro-card-sheen" ornamental glow>
        {/* Cosmic aura */}
        <div className="astro-aura" />
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none astro-breathing" style={{
          background: "radial-gradient(circle, rgba(232,184,109,0.1) 0%, transparent 70%)",
        }} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: "#E8B86D" }} />
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t(locale, "Транзиты · 7 дней", "Transits · 7 Days", "ट्रांज़िट · 7 दिन")}
            </h3>
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "#5BB89C20", color: "#5BB89C" }}>
              <span className="cosmic-live-dot" />
              {t(locale, "реальные позиции", "real positions", "वास्तविक स्थिति")}
            </span>
            <button onClick={refresh} className="text-[#9A9AA8] hover:text-[#E8B86D] transition" aria-label="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Day selector */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-astro pb-1">
            {data.forecast.map((day, i) => {
              const active = selectedDay === i;
              const hasIngress = data.upcomingIngresses.some(ing => ing.day === i);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={`relative shrink-0 rounded-lg border px-3 py-2 text-center transition-all ${
                    active
                      ? "border-[#E8B86D]/60 bg-[#E8B86D]/10"
                      : "border-[#2A2A35] bg-[#0B0B0F]/60 hover:border-[#9A9AA8]/40"
                  }`}
                >
                  <div className="text-[9px] uppercase tracking-wider" style={{ color: active ? "#E8B86D" : "#6B6B78" }}>
                    {i === 0 ? t(locale, "Сегодня", "Today", "आज") : i === 1 ? t(locale, "Завтра", "Tomorrow", "कल") : day.dateLabel.split(" ")[0]}
                  </div>
                  <div className="text-[10px] font-medium" style={{ color: active ? "#F5F0E8" : "#9A9AA8" }}>
                    {day.dateLabel.split(" ").slice(1).join(" ")}
                  </div>
                  {hasIngress && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#D98E7A]" title="Sign ingress" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Moon phase for selected day */}
          <div className="flex items-center gap-3 p-3 rounded-lg mb-4" style={{ background: "rgba(91,184,156,0.06)", border: "1px solid rgba(91,184,156,0.2)" }}>
            <span className="text-2xl">{moonPhase.emoji}</span>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">
                {t(locale, "Лунная фаза", "Moon phase", "चंद्र चरण")}
              </div>
              <div className="text-sm font-serif text-[#5BB89C]">
                {t(locale, moonPhase.name.ru, moonPhase.name.en, moonPhase.name.hi)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#6B6B78]">{Math.round(currentDay.moonPhaseAngle)}°</div>
              <div className="text-[9px] text-[#6B6B78]">phase angle</div>
            </div>
          </div>

          {/* Planet positions for selected day */}
          <div className="space-y-1.5 mb-4">
            <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">
              {t(locale, "Позиции планет", "Planet positions", "ग्रह स्थिति")} · {currentDay.dateLabel}
            </div>
            {currentDay.planets
              .sort((a, b) => PLANET_ORDER.indexOf(a.planet) - PLANET_ORDER.indexOf(b.planet))
              .map((p, i) => {
                // Compare with today's position to show movement
                const todayPos = data.current.planets.find(tp => tp.planet === p.planet);
                const movement = todayPos ? p.lon - todayPos.lon : 0;
                const normMove = ((movement + 180) % 360) - 180;
                return (
                  <motion.div
                    key={p.planet}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ background: `${p.color}08`, border: `1px solid ${p.color}20` }}
                  >
                    <span className="text-base" style={{ color: p.color, fontFamily: "serif" }}>{p.glyph}</span>
                    <span className="text-[11px] font-medium w-16" style={{ color: "#F5F0E8" }}>{p.planet}</span>
                    <span className="text-[11px] font-mono" style={{ color: p.color }}>{p.deg}°</span>
                    <span className="text-[11px]" style={{ color: "#5BB89C" }}>{p.signGlyph} {p.sign}</span>
                    {/* Movement indicator */}
                    {!isToday && (
                      <span className="ml-auto text-[10px] font-mono" style={{ color: normMove > 0 ? "#5BB89C" : "#D98E7A" }}>
                        {normMove > 0 ? "+" : ""}{normMove.toFixed(2)}°
                      </span>
                    )}
                    {isToday && (
                      <span className="ml-auto text-[9px] text-[#6B6B78]">
                        {t(locale, "сегодня", "today", "आज")}
                      </span>
                    )}
                  </motion.div>
                );
              })}
          </div>

          {/* Upcoming ingresses for the week */}
          {data.upcomingIngresses.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">
                {t(locale, "Входы в знаки", "Sign ingresses", "चिह्न प्रवेश")}
              </div>
              <div className="space-y-1.5">
                {data.upcomingIngresses.map((ing, i) => (
                  <motion.div
                    key={`${ing.day}-${ing.planet}-${i}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="astro-ingress-flash flex items-center gap-2 p-2 rounded-lg"
                    style={{ background: "rgba(217,142,122,0.06)", border: "1px solid rgba(217,142,122,0.2)" }}
                  >
                    <span className="text-base" style={{ color: "#D98E7A", fontFamily: "serif" }}>{ing.glyph}</span>
                    <span className="text-[11px] font-medium" style={{ color: "#F5F0E8" }}>{ing.planet}</span>
                    <span className="text-[11px]" style={{ color: "#9A9AA8" }}>
                      {ing.fromGlyph} {ing.fromSign}
                    </span>
                    <span className="text-[11px]" style={{ color: "#D98E7A" }}>→</span>
                    <span className="text-[11px] font-medium" style={{ color: "#D98E7A" }}>
                      {ing.toGlyph} {ing.toSign}
                    </span>
                    <span className="ml-auto text-[9px] text-[#6B6B78]">{ing.dateLabel}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {data.upcomingIngresses.length === 0 && (
            <div className="text-center py-3 text-[11px] text-[#6B6B78]">
              {t(locale, "На этой неделе планеты не меняют знак", "No sign ingresses this week", "इस सप्ताह कोई प्रवेश नहीं")}
            </div>
          )}

          {/* Footer note */}
          <div className="mt-3 text-center text-[10px] text-[#6B6B78] italic">
            {t(locale,
              "Реальные позиции через astronomy-engine. Обновляется каждый запрос.",
              "Real positions via astronomy-engine. Refreshes on each request.",
              "astronomy-engine द्वारा वास्तविक स्थिति। प्रत्येक अनुरोध पर ताज़ा।"
            )}
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealTransitForecastPanel;
