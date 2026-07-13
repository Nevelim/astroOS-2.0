"use client";
/**
 * RealMembersPanel — family hub с участниками и совместимостью.
 * Использует /api/members для списка + /api/cosmic-match для совместимости.
 * Clean Architecture: Interface Adapter.
 * Hades 2 визуал: member cards с compatibility rings, relationship badges.
 */
import { useState, useEffect } from "react";
import { GlassCard, FadeIn, CosmicButton } from "../ui";
import { AuthGate } from "../AuthGate";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Loader2, Heart, X } from "lucide-react";
import type { ScreenKey } from "@/lib/astroos/data";

interface Member {
  id: string;
  displayName: string;
  relationship: string;
  sunSign: string;
  moonSign: string;
  dayMasterElement: string;
  compatibility: number;
  tone: string;
  birthDate: string;
}

interface MembersData {
  members: Member[];
  total: number;
  avgCompatibility: number;
}

const TONE_COLORS: Record<string, string> = {
  gold: "#E8B86D",
  jade: "#5BB89C",
  rose: "#D98E7A",
  neutral: "#5E8FA8",
};

const SIGN_GLYPHS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
  Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

export function RealMembersPanel({ locale, onNavigate }: { locale: "ru" | "en" | "hi"; onNavigate?: (k: ScreenKey) => void }) {
  const [data, setData] = useState<MembersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [selected, setSelected] = useState<Member | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  useEffect(() => {
    fetch(`/api/members?locale=${locale}`)
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
    return <AuthGate title={t("Войдите для Family Hub", "Sign in for Family Hub", "Family Hub के लिए साइन इन")} description={t("Добавляйте близких и узнавайте совместимость через Cosmic Match.", "Add loved ones and discover compatibility via Cosmic Match.", "प्रियजनों को जोड़ें और Cosmic Match से संगतता जानें।")} locale={locale} tone="rose" onNavigate={onNavigate} />;
  }

  if (!data) return null;

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative" ornamental glow>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(232,184,109,0.12) 0%, transparent 70%)",
        }} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: "#E8B86D" }} />
              <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
                {t("Family Hub", "Family Hub", "परिवार हब")}
              </h3>
            </div>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="p-1.5 rounded-lg transition-all hover:scale-105"
              style={{ background: "rgba(232,184,109,0.15)", border: "1px solid rgba(232,184,109,0.3)" }}
            >
              <Plus className="w-3.5 h-3.5" style={{ color: "#E8B86D" }} />
            </button>
          </div>

          {/* Avg compatibility */}
          <div className="mb-4 p-2.5 rounded-lg text-center" style={{
            background: "linear-gradient(135deg, rgba(232,184,109,0.08), rgba(217,142,122,0.05))",
            border: "1px solid rgba(232,184,109,0.2)",
          }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
              {t("Средняя совместимость", "Average compatibility", "औसत संगतता")}
            </div>
            <div className="font-mono text-2xl" style={{ color: "#E8B86D" }}>{data.avgCompatibility}</div>
            <div className="text-[10px]" style={{ color: "#F5F0E860" }}>{data.total} {t("участников", "members", "सदस्य")}</div>
          </div>

          {/* Member cards */}
          <div className="space-y-2 mb-4">
            <AnimatePresence>
              {data.members.map((m, i) => {
                const color = TONE_COLORS[m.tone] ?? "#5E8FA8";
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => setSelected(selected?.id === m.id ? null : m)}
                    className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                    style={{
                      background: selected?.id === m.id ? `${color}15` : "rgba(11,11,15,0.4)",
                      border: `1px solid ${selected?.id === m.id ? color : "#F5F0E810"}`,
                    }}
                  >
                    {/* Compatibility ring */}
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="#F5F0E810" strokeWidth="3" />
                        <motion.circle
                          cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - m.compatibility / 100) }}
                          transition={{ delay: i * 0.08 + 0.3, duration: 0.8 }}
                          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-sm font-bold" style={{ color }}>{m.compatibility}</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif text-sm" style={{ color: "#F5F0E8" }}>{m.displayName}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>
                          {m.relationship}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px]" style={{ color: "#F5F0E860" }}>
                        <span style={{ color }}>{SIGN_GLYPHS[m.sunSign] ?? "•"} {m.sunSign}</span>
                        <span>·</span>
                        <span>{SIGN_GLYPHS[m.moonSign] ?? "•"} {m.moonSign}</span>
                        <span>·</span>
                        <span style={{ color: "#5BB89C" }}>{m.dayMasterElement}</span>
                      </div>
                    </div>

                    {/* Expand arrow */}
                    <motion.div animate={{ rotate: selected?.id === m.id ? 90 : 0 }} style={{ color: "#F5F0E860" }}>
                      <Heart className="w-3 h-3" />
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Selected detail */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-lg mb-3" style={{
                  background: `${TONE_COLORS[selected.tone]}10`,
                  border: `1px solid ${TONE_COLORS[selected.tone]}30`,
                }}>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div>
                      <div style={{ color: "#F5F0E860" }}>{t("Солнце", "Sun", "सूर्य")}</div>
                      <div className="font-serif text-sm mt-0.5" style={{ color: "#FBBF24" }}>{SIGN_GLYPHS[selected.sunSign]} {selected.sunSign}</div>
                    </div>
                    <div>
                      <div style={{ color: "#F5F0E860" }}>{t("Луна", "Moon", "चंद्रमा")}</div>
                      <div className="font-serif text-sm mt-0.5" style={{ color: "#94A3B8" }}>{SIGN_GLYPHS[selected.moonSign]} {selected.moonSign}</div>
                    </div>
                    <div>
                      <div style={{ color: "#F5F0E860" }}>{t("Стихия", "Element", "तत्व")}</div>
                      <div className="font-serif text-sm mt-0.5" style={{ color: "#5BB89C" }}>{selected.dayMasterElement}</div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 text-center text-[10px]" style={{ borderTop: `1px solid ${TONE_COLORS[selected.tone]}20`, color: "#F5F0E860" }}>
                    {t("Рождение", "Birth", "जन्म")}: {selected.birthDate}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add form */}
          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-lg" style={{ background: "rgba(11,11,15,0.6)", border: "1px solid #E8B86D20" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: "#E8B86D" }}>
                      {t("Добавить участника", "Add member", "सदस्य जोड़ें")}
                    </span>
                    <button onClick={() => setShowAdd(false)}><X className="w-3 h-3" style={{ color: "#F5F0E860" }} /></button>
                  </div>
                  <p className="text-[10px]" style={{ color: "#F5F0E860" }}>
                    {t("Введите данные рождения — совместимость вычислится автоматически через Cosmic Match.", "Enter birth data — compatibility computed via Cosmic Match.", "जन्म डेटा दर्ज करें — Cosmic Match द्वारा संगतता स्वतः गणना।")}
                  </p>
                  <CosmicButton variant="gold" size="sm" className="w-full mt-2" onClick={() => setShowAdd(false)}>
                    {t("Скоро", "Coming soon", "जल्द ही")}
                  </CosmicButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealMembersPanel;
