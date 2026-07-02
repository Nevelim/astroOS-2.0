"use client";
/**
 * RealStreakCalendar — 7-day WARD visualization с reward animation.
 * Использует /api/streak-calendar для реальных данных.
 * Clean Architecture: Interface Adapter.
 * Hades 2 визуал: star fill animation, reward badges, golden week celebration.
 */
import { useState, useEffect } from "react";
import { GlassCard, FadeIn } from "../ui";
import { AuthGate } from "../AuthGate";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Flame, Loader2, Trophy } from "lucide-react";
import type { ScreenKey } from "@/lib/astroos/data";

interface WeekDay {
  day: string;
  date: string;
  completed: boolean;
  isToday: boolean;
  reward: { en: string; ru: string; hi: string; tone: string } | null;
}

interface CalendarData {
  weekDays: WeekDay[];
  wardThisWeek: number;
  wardTarget: number;
  wardMet: boolean;
  streak: number;
  bestStreak: number;
  totalRituals: number;
  locale: string;
}

const TONE_COLORS: Record<string, string> = {
  gold: "#E8B86D",
  jade: "#5BB89C",
  rose: "#D98E7A",
};

export function RealStreakCalendar({ locale, onNavigate }: { locale: "ru" | "en" | "hi"; onNavigate?: (k: ScreenKey) => void }) {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  useEffect(() => {
    fetch(`/api/streak-calendar?locale=${locale}`)
      .then(async (r) => {
        if (r.status === 401) { setAuthed(false); setLoading(false); return null; }
        return r.json();
      })
      .then((d) => { if (d) { setData(d); setLoading(false); } })
      .catch(() => setLoading(false));
  }, [locale]);

  if (loading) {
    return (
      <GlassCard variant="gold" className="p-5" ornamental>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#E8B86D" }} />
        </div>
      </GlassCard>
    );
  }

  if (!authed) {
    return <AuthGate title={t("Войдите для календаря", "Sign in for calendar", "कैलेंडर के लिए साइन इन")} description={t("Отслеживайте ритуалы и достигайте WARD.", "Track rituals and reach WARD.", "अनुष्ठान ट्रैक करें और WARD तक पहुँचें।")} locale={locale} tone="gold" onNavigate={onNavigate} />;
  }

  if (!data) return null;

  const wardPct = Math.min(100, (data.wardThisWeek / data.wardTarget) * 100);

  return (
    <FadeIn>
      <GlassCard variant={data.wardMet ? "gold" : "jade"} className="p-5 relative" ornamental glow>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: data.wardMet ? "#E8B86D" : "#5BB89C" }} />
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t("Недельный ритуал", "Weekly ritual", "साप्ताहिक अनुष्ठान")}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-2xl tabular-nums" style={{ color: data.wardMet ? "#E8B86D" : "#5BB89C" }}>
              {data.wardThisWeek}
            </span>
            <span className="text-sm" style={{ color: "#F5F0E860" }}>/ {data.wardTarget}</span>
          </div>
        </div>

        {/* WARD progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span style={{ color: "#F5F0E860" }}>WARD {t("цель", "target", "लक्ष्य")}</span>
            <span style={{ color: data.wardMet ? "#E8B86D" : "#5BB89C" }}>
              {data.wardMet ? t("достигнут ⭐", "achieved ⭐", "प्राप्त ⭐") : t("в процессе", "in progress", "प्रगति में")}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#F5F0E810" }}>
            <motion.div
              className="h-full rounded-full relative"
              style={{
                background: data.wardMet
                  ? "linear-gradient(90deg, #E8B86D, #D98E7A)"
                  : "linear-gradient(90deg, #5BB89C, #E8B86D)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${wardPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {data.wardMet && (
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                  }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              )}
            </motion.div>
          </div>
        </div>

        {/* 7-day grid */}
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {data.weekDays.map((day, i) => {
            const color = day.reward ? TONE_COLORS[day.reward.tone] ?? "#E8B86D" : "#F5F0E8";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-[10px] font-medium" style={{ color: day.isToday ? "#E8B86D" : "#F5F0E860" }}>
                  {day.day}
                </span>
                <motion.div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center relative ${day.isToday ? "ring-2" : ""}`}
                  style={{
                    background: day.completed ? `${color}20` : "rgba(11,11,15,0.4)",
                    border: `1px solid ${day.completed ? color : "#F5F0E815"}`,
                    boxShadow: day.completed ? `0 0 8px ${color}40` : "none",
                  }}
                  whileHover={{ scale: 1.1 }}
                >
                  {day.completed ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: i * 0.06 + 0.2, type: "spring", stiffness: 200 }}
                    >
                      <Star className="w-4 h-4 fill-current" style={{ color }} />
                    </motion.div>
                  ) : (
                    <div className="w-1 h-1 rounded-full" style={{ background: "#F5F0E830" }} />
                  )}
                </motion.div>
                {/* Reward badge */}
                <AnimatePresence>
                  {day.reward && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 + 0.4 }}
                      className="text-[8px] font-medium text-center leading-tight"
                      style={{ color }}
                    >
                      {day.reward[locale] || day.reward.en}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-3" style={{ borderTop: "1px solid #F5F0E810" }}>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Flame className="w-3 h-3" style={{ color: "#D98E7A" }} />
              <span className="font-mono text-lg tabular-nums" style={{ color: "#F5F0E8" }}>{data.streak}</span>
            </div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
              {t("Серия", "Streak", "श्रृंखला")}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Trophy className="w-3 h-3" style={{ color: "#E8B86D" }} />
              <span className="font-mono text-lg tabular-nums" style={{ color: "#F5F0E8" }}>{data.bestStreak}</span>
            </div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
              {t("Рекорд", "Best", "रिकॉर्ड")}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Star className="w-3 h-3" style={{ color: "#5BB89C" }} />
              <span className="font-mono text-lg tabular-nums" style={{ color: "#F5F0E8" }}>{data.totalRituals}</span>
            </div>
            <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
              {t("Всего", "Total", "कुल")}
            </div>
          </div>
        </div>

        {/* Golden week celebration */}
        <AnimatePresence>
          {data.wardThisWeek >= 7 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 p-2.5 rounded-lg text-center"
              style={{
                background: "linear-gradient(135deg, rgba(232,184,109,0.15), rgba(217,142,122,0.1))",
                border: "1px solid rgba(232,184,109,0.4)",
              }}
            >
              <p className="text-sm font-serif italic" style={{ color: "#E8B86D" }}>
                ✦ {t("Золотая неделя!", "Golden week!", "सुनहरा सप्ताह!")} ✦
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "#F5F0E860" }}>
                {t("7 дней ритуала — вы в потоке космоса", "7 days of ritual — you're in the cosmic flow", "7 दिन अनुष्ठान — आप ब्रह्मांडीय प्रवाह में हैं")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </FadeIn>
  );
}

export default RealStreakCalendar;
