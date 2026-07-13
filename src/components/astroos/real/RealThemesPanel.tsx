"use client";
/**
 * RealThemesPanel — 8 жизненных сфер с SVG wheel visualization.
 * Использует /api/spheres для реальных данных.
 * Clean Architecture: Interface Adapter.
 * Hades 2 визуал: octagon wheel, sphere cards, weekly theme.
 */
import { useState, useEffect } from "react";
import { GlassCard, FadeIn } from "../ui";
import { AuthGate } from "../AuthGate";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ScreenKey } from "@/lib/astroos/data";

interface Sphere {
  key: string;
  icon: string;
  color: string;
  label: string;
  planet: string;
  score: number;
  trend: string;
  ritualsThisWeek: number;
  topCity: string;
  planetInfluence: string;
}

interface SpheresData {
  spheres: Sphere[];
  overallScore: number;
  weeklyTheme: { en: string; ru: string; hi: string };
  locale: string;
}

const TREND_ICONS: Record<string, React.ReactNode> = {
  up: <TrendingUp className="w-3 h-3" />,
  down: <TrendingDown className="w-3 h-3" />,
  stable: <Minus className="w-3 h-3" />,
};

const TREND_COLORS: Record<string, string> = {
  up: "#5BB89C",
  down: "#D98E7A",
  stable: "#9A9AA8",
};

export function RealThemesPanel({ locale, onNavigate }: { locale: "ru" | "en" | "hi"; onNavigate?: (k: ScreenKey) => void }) {
  const [data, setData] = useState<SpheresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [selected, setSelected] = useState<Sphere | null>(null);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  useEffect(() => {
    fetch(`/api/spheres?locale=${locale}`)
      .then(async (r) => {
        if (r.status === 401) { setAuthed(false); setLoading(false); return null; }
        return r.json();
      })
      .then((d) => { if (d) { setData(d); setLoading(false); } })
      .catch(() => setLoading(false));
  }, [locale]);

  if (loading) {
    return (
      <GlassCard variant="gold" className="p-5" ornamental glow>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#E8B86D" }} />
        </div>
      </GlassCard>
    );
  }

  if (!authed) {
    return <AuthGate title={t("Войдите для сфер", "Sign in for spheres", "क्षेत्रों के लिए साइन इन")} description={t("Отслеживайте баланс 8 жизненных сфер.", "Track balance across 8 life spheres.", "8 जीवन क्षेत्रों में संतुलन ट्रैक करें।")} locale={locale} tone="jade" onNavigate={onNavigate} />;
  }

  if (!data) return null;

  const SIZE = 280;
  const CENTER = SIZE / 2;
  const OUTER_R = 130;
  const INNER_R = 50;

  // Octagon positions for 8 spheres
  const spherePositions = data.spheres.map((s, i) => {
    const angle = (i * 45 - 90) * Math.PI / 180;
    return {
      ...s,
      x: CENTER + OUTER_R * Math.cos(angle),
      y: CENTER + OUTER_R * Math.sin(angle),
    };
  });

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative" ornamental glow>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(232,184,109,0.12) 0%, transparent 70%)",
        }} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: "#E8B86D" }} />
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t("Сферы жизни", "Life spheres", "जीवन क्षेत्र")}
            </h3>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#E8B86D20", color: "#E8B86D" }}>
              {t("Общий", "Overall", "कुल")}: {data.overallScore}
            </span>
          </div>

          {/* Weekly theme */}
          <div className="mb-4 p-2.5 rounded-lg text-center" style={{
            background: "linear-gradient(135deg, rgba(232,184,109,0.08), rgba(91,184,156,0.05))",
            border: "1px solid rgba(232,184,109,0.2)",
          }}>
            <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#F5F0E860" }}>
              {t("Тема недели", "Weekly theme", "साप्ताहिक विषय")}
            </div>
            <p className="text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
              {data.weeklyTheme[locale] || data.weeklyTheme.en}
            </p>
          </div>

          {/* SVG sphere wheel */}
          <div className="flex justify-center mb-4">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              {/* Outer ring */}
              <circle cx={CENTER} cy={CENTER} r={OUTER_R + 8} fill="none" stroke="rgba(232,184,109,0.15)" strokeWidth="1" />
              <circle cx={CENTER} cy={CENTER} r={INNER_R} fill="none" stroke="rgba(232,184,109,0.2)" strokeWidth="0.5" />

              {/* Connecting lines */}
              {spherePositions.map((s, i) => (
                <line key={i} x1={CENTER} y1={CENTER} x2={s.x} y2={s.y}
                  stroke="rgba(232,184,109,0.1)" strokeWidth="0.5" />
              ))}

              {/* Center overall score */}
              <circle cx={CENTER} cy={CENTER} r={INNER_R - 5} fill="rgba(11,11,15,0.6)" stroke="#E8B86D" strokeWidth="1" />
              <text x={CENTER} y={CENTER - 8} fontSize="8" fill="#F5F0E860" textAnchor="middle" style={{ fontFamily: "monospace" }}>
                {t("БАЛАНС", "BALANCE", "संतुलन")}
              </text>
              <text x={CENTER} y={CENTER + 8} fontSize="24" fontWeight="bold" fill="#E8B86D" textAnchor="middle" style={{ fontFamily: "monospace" }}>
                {data.overallScore}
              </text>

              {/* Sphere nodes */}
              {spherePositions.map((s, i) => {
                const isSelected = selected?.key === s.key;
                return (
                  <motion.g
                    key={s.key}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                    onClick={() => setSelected(isSelected ? null : s)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Score ring */}
                    <circle cx={s.x} cy={s.y} r="22" fill="rgba(11,11,15,0.8)" stroke={s.color} strokeWidth={isSelected ? 2 : 1}
                      style={{ filter: `drop-shadow(0 0 ${isSelected ? 8 : 4}px ${s.color})` }} />
                    {/* Score arc */}
                    <circle cx={s.x} cy={s.y} r="22" fill="none" stroke={s.color} strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 22 * s.score / 100} ${2 * Math.PI * 22}`}
                      strokeLinecap="round"
                      transform={`rotate(-90 ${s.x} ${s.y})`}
                      opacity="0.6"
                    />
                    {/* Icon */}
                    <text x={s.x} y={s.y - 2} fontSize="14" fill={s.color} textAnchor="middle" style={{ fontFamily: "serif" }}>
                      {s.icon}
                    </text>
                    {/* Score */}
                    <text x={s.x} y={s.y + 10} fontSize="9" fill={s.color} textAnchor="middle" style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                      {s.score}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </div>

          {/* Selected sphere detail */}
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                key={selected.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-lg mb-3"
                style={{ background: `${selected.color}10`, border: `1px solid ${selected.color}30` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" style={{ color: selected.color }}>{selected.icon}</span>
                    <span className="font-serif text-base" style={{ color: "#F5F0E8" }}>{selected.label}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: TREND_COLORS[selected.trend] }}>
                    {TREND_ICONS[selected.trend]}
                    <span className="font-mono">{selected.score}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div style={{ color: "#F5F0E860" }}>{t("Ритуалы", "Rituals", "अनुष्ठान")}</div>
                    <div className="font-mono" style={{ color: selected.color }}>{selected.ritualsThisWeek}</div>
                  </div>
                  <div>
                    <div style={{ color: "#F5F0E860" }}>{t("Город", "City", "शहर")}</div>
                    <div style={{ color: "#F5F0E8" }}>{selected.topCity}</div>
                  </div>
                  <div>
                    <div style={{ color: "#F5F0E860" }}>{t("Планета", "Planet", "ग्रह")}</div>
                    <div style={{ color: selected.color }}>{selected.planetInfluence}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sphere list */}
          <div className="grid grid-cols-4 gap-1.5">
            {data.spheres.map((s) => (
              <motion.button
                key={s.key}
                onClick={() => setSelected(selected?.key === s.key ? null : s)}
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all"
                style={{
                  background: selected?.key === s.key ? `${s.color}20` : "rgba(11,11,15,0.4)",
                  border: `1px solid ${selected?.key === s.key ? s.color : "#F5F0E810"}`,
                }}
              >
                <span className="text-base" style={{ color: s.color }}>{s.icon}</span>
                <span className="text-[9px] font-medium" style={{ color: "#F5F0E8" }}>{s.label}</span>
                <span className="text-[10px] font-mono" style={{ color: s.color }}>{s.score}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealThemesPanel;
