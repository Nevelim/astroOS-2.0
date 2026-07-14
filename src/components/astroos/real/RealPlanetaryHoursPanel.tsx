"use client";
/**
 * RealPlanetaryHoursPanel — real-time planetary hours widget.
 * Fetches /api/planetary-hours (astronomy-engine: SearchRiseSet for sunrise/sunset).
 * Cosmic visualization: current planet large card + 12-hour timeline + day/night ruler.
 * Clean Architecture: Interface Adapter.
 * Hades 2 visual: gold GlassCard, ornamental, ambient glow, live indicator.
 */
import { useState, useEffect } from "react";
import { GlassCard, Pill, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Clock, RefreshCw, Sunrise, Sunset } from "lucide-react";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";

interface HourSlot {
  hour: number;
  planet: string;
  glyph: string;
  color: string;
  startISO: string;
  endISO: string;
  startTime: string;
  endTime: string;
  keywords: { en: string; ru: string; hi: string };
  period: "day" | "night";
}

interface PlanetaryHoursData {
  current: HourSlot;
  next: HourSlot | null;
  dayHours: HourSlot[];
  nightHours: HourSlot[];
  sunrise: string;
  sunset: string;
  sunriseTime: string;
  sunsetTime: string;
  dayRuler: string;
  timestamp: string;
}

export function RealPlanetaryHoursPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [data, setData] = useState<PlanetaryHoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { member } = useMember();

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  useEffect(() => {
    // Use member's birth location if available, otherwise use mock location
    const lat = member?.birth?.lat ?? mockMember().birth.lat;
    const lng = member?.birth?.lng ?? mockMember().birth.lng;

    fetch(`/api/planetary-hours?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); }
        else { setData(d); }
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [member]);

  const refresh = () => {
    setLoading(true);
    const lat = member?.birth?.lat ?? mockMember().birth.lat;
    const lng = member?.birth?.lng ?? mockMember().birth.lng;
    fetch(`/api/planetary-hours?lat=${lat}&lng=${lng}`)
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
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-transparent flex items-center justify-center"
            style={{ borderTopColor: "#E8B86D", borderRightColor: "#5BB89C" }}
          >
            <Clock className="w-4 h-4" style={{ color: "#E8B86D" }} />
          </motion.div>
          <p className="mt-3 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
            {t("Вычисляю планетарные часы...", "Computing planetary hours...", "ग्रह घंटे की गणना...")}
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
          {t("Повторить", "Retry", "पुनः प्रयास")}
        </button>
      </GlassCard>
    );
  }

  const { current, next, dayHours, nightHours, sunriseTime, sunsetTime, dayRuler } = data;
  const isDay = current.period === "day";
  const currentHourList = isDay ? dayHours : nightHours;
  const currentIdx = currentHourList.findIndex(h => h.hour === current.hour && h.planet === current.planet);

  // Time remaining in current hour
  const now = new Date();
  const endMs = new Date(current.endISO).getTime();
  const startMs = new Date(current.startISO).getTime();
  const totalMs = endMs - startMs;
  const remainingMs = endMs - now.getTime();
  const elapsedPct = Math.max(0, Math.min(100, ((totalMs - remainingMs) / totalMs) * 100));
  const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative astro-card-sheen" ornamental glow>
        {/* Cosmic aura */}
        <div className="astro-aura" />
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none astro-breathing" style={{
          background: `radial-gradient(circle, ${current.color}20 0%, transparent 70%)`,
        }} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            {isDay
              ? <Sun className="w-4 h-4" style={{ color: "#E8B86D" }} />
              : <Moon className="w-4 h-4" style={{ color: "#C4D3E0" }} />
            }
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t("Планетарные часы", "Planetary Hours", "ग्रह घंटे")}
            </h3>
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ml-auto"
              style={{ background: "#5BB89C20", color: "#5BB89C" }}>
              <span className="cosmic-live-dot" />
              {t("в реальном времени", "real-time", "वास्तविक-समय")}
            </span>
            <button onClick={refresh} className="text-[#9A9AA8] hover:text-[#E8B86D] transition" aria-label="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current hour — large display */}
          <div className="rounded-xl p-4 mb-4 relative overflow-hidden" style={{
            background: `linear-gradient(135deg, ${current.color}15, ${current.color}05)`,
            border: `1px solid ${current.color}40`,
          }}>
            <div className="flex items-center gap-4">
              {/* Big planet glyph */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 18 }}
                className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: `${current.color}15`,
                  border: `2px solid ${current.color}`,
                  boxShadow: `0 0 24px ${current.color}40`,
                }}
              >
                <span className="text-4xl" style={{ color: current.color, fontFamily: "serif" }}>
                  {current.glyph}
                </span>
              </motion.div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">
                  {t("Текущий час", "Current hour", "वर्तमान घंटा")} · {current.period === "day" ? t("День", "Day", "दिन") : t("Ночь", "Night", "रात")} {current.hour}/12
                </div>
                <div className="font-serif text-2xl font-semibold" style={{ color: current.color }}>
                  {t(`Час ${current.planet}`, `Hour of ${current.planet}`, `${current.planet} का घंटा`)}
                </div>
                <div className="text-[11px] mt-0.5 font-mono text-[#9A9AA8]">
                  {current.startTime} — {current.endTime}
                </div>
                <div className="text-[10px] mt-1" style={{ color: `${current.color}CC` }}>
                  {locale === "ru" ? current.keywords.ru : locale === "hi" ? current.keywords.hi : current.keywords.en}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-[#8A8A96] mb-1">
                <span>{t("Осталось", "Remaining", "शेष")} {remainingMin}m</span>
                <span>{Math.round(elapsedPct)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1C1C26" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${current.color}, ${current.color}80)` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${elapsedPct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>

          {/* Next hour preview */}
          {next && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg mb-4" style={{
              background: "rgba(11,11,15,0.4)", border: "1px solid rgba(42,42,53,0.6)",
            }}>
              <div className="text-[10px] uppercase tracking-wider text-[#8A8A96] shrink-0">
                {t("Далее", "Next", "अगला")}
              </div>
              <span className="text-lg" style={{ color: next.color, fontFamily: "serif" }}>{next.glyph}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium" style={{ color: next.color }}>{next.planet}</div>
                <div className="text-[10px] text-[#8A8A96] font-mono">{next.startTime} — {next.endTime}</div>
              </div>
              <span className="text-[10px] text-[#8A8A96]">
                {(() => {
                  const ms = new Date(next.startISO).getTime() - now.getTime();
                  const min = Math.floor(ms / 60000);
                  return `${Math.floor(min / 60)}h ${min % 60}m`;
                })()}
              </span>
            </div>
          )}

          {/* 12-hour timeline */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2">
              {isDay ? t("Дневные часы", "Day hours", "दिन के घंटे") : t("Ночные часы", "Night hours", "रात के घंटे")}
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {currentHourList.map((h, i) => {
                const isCurrent = i === currentIdx;
                const isPast = i < currentIdx;
                return (
                  <motion.div
                    key={`${h.hour}-${h.planet}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-lg p-2 text-center transition-all"
                    style={{
                      background: isCurrent ? `${h.color}20` : isPast ? "rgba(11,11,15,0.3)" : `${h.color}08`,
                      border: isCurrent ? `1px solid ${h.color}` : `1px solid ${h.color}20`,
                      opacity: isPast ? 0.5 : 1,
                    }}
                  >
                    <div className="text-[9px] text-[#8A8A96] mb-0.5">{h.hour}</div>
                    <div className="text-base" style={{ color: h.color, fontFamily: "serif" }}>
                      {h.glyph}
                    </div>
                    <div className="text-[8px] font-mono text-[#8A8A96] mt-0.5">{h.startTime}</div>
                    {isCurrent && (
                      <motion.div
                        className="mt-1 h-0.5 rounded-full"
                        style={{ background: h.color }}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Day ruler + sunrise/sunset */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg p-2.5 text-center" style={{ background: "#E8B86D10" }}>
              <div className="text-[9px] uppercase tracking-wider text-[#9A9AA8]">
                {t("Управитель дня", "Day ruler", "दिन स्वामी")}
              </div>
              <div className="font-serif text-base mt-0.5 text-[#E8B86D]">{dayRuler}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: "#5BB89C10" }}>
              <div className="text-[9px] uppercase tracking-wider text-[#9A9AA8] flex items-center justify-center gap-1">
                <Sunrise className="w-3 h-3" /> {t("Восход", "Sunrise", "उदय")}
              </div>
              <div className="font-mono text-base mt-0.5 text-[#5BB89C]">{sunriseTime}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: "#D98E7A10" }}>
              <div className="text-[9px] uppercase tracking-wider text-[#9A9AA8] flex items-center justify-center gap-1">
                <Sunset className="w-3 h-3" /> {t("Закат", "Sunset", "अस्त")}
              </div>
              <div className="font-mono text-base mt-0.5 text-[#D98E7A]">{sunsetTime}</div>
            </div>
          </div>

          {/* All 7 planets legend */}
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#8A8A96]">
            <span className="text-[#9A9AA8]">{t("Планеты:", "Planets:", "ग्रह:")} </span>
            {(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"] as const).map(p => {
              const colors: Record<string, string> = {
                Sun: "#FBBF24", Moon: "#C4D3E0", Mercury: "#60A5FA", Venus: "#F472B6",
                Mars: "#EF4444", Jupiter: "#A78BFA", Saturn: "#94A3B8",
              };
              const glyphs: Record<string, string> = {
                Sun: "☉", Moon: "☾", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄",
              };
              return (
                <span key={p} className="flex items-center gap-1">
                  <span style={{ color: colors[p], fontFamily: "serif" }}>{glyphs[p]}</span>
                  <span>{p}</span>
                </span>
              );
            })}
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealPlanetaryHoursPanel;
