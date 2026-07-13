"use client";
/**
 * RealProfilePanel — агрегированный профиль с реальными данными.
 * Stats + WARD + partner-link (shareable) + power-cards.
 * Clean Architecture: Interface Adapter.
 * Hades 2 визуал: WARD ring, shareable Power Card, ambient glow.
 */
import { useState, useEffect } from "react";
import { GlassCard, Pill, CosmicButton, FadeIn } from "../ui";
import { AuthGate } from "../AuthGate";
import { motion, AnimatePresence } from "framer-motion";
import { User, Link2, Sparkles, Copy, Check, TrendingUp, Award, Loader2 } from "lucide-react";
import type { ScreenKey } from "@/lib/astroos/data";

interface ProfileData {
  displayName: string;
  tier: string;
  isPremium: boolean;
  trialEndsAt?: string;
  stats: {
    streak: number;
    wardThisWeek: number;
    wardTarget: number;
    wardMet: boolean;
    ritualsCompleted: number;
    citiesExplored: number;
    mentorMessages: number;
  };
  partnerLink: { code: string; url: string; clicks: number; signups: number; viralK: number };
  powerCards: Array<{ id: string; cardType: string; title: string; description: string; sharedCount: number }>;
  notifications: { unread: number; total: number };
  bazi?: { dayMaster: string; dayMasterElement: string } | null;
}

export function RealProfilePanel({ locale, onNavigate }: { locale: "ru" | "en" | "hi"; onNavigate?: (k: ScreenKey) => void }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [copied, setCopied] = useState(false);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  useEffect(() => {
    fetch("/api/profile")
      .then(async (r) => {
        if (r.status === 401) { setAuthed(false); setLoading(false); return null; }
        return r.json();
      })
      .then((d) => { if (d?.profile) { setProfile(d.profile); } setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const copyLink = () => {
    if (!profile) return;
    navigator.clipboard?.writeText(profile.partnerLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <GlassCard variant="gold" className="p-5" ornamental>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#E8B86D" }} />
        </div>
      </GlassCard>
    );
  }

  if (!authed) {
    return <AuthGate title={t("Войдите для профиля", "Sign in for profile", "प्रोफ़ाइल के लिए साइन इन")} description={t("Статистика, партнёрская ссылка, карты силы — всё здесь.", "Stats, partner link, power cards — all here.", "आँकड़े, साझेदारी लिंक, शक्ति कार्ड — सब यहाँ।")} locale={locale} tone="gold" onNavigate={onNavigate} />;
  }

  if (!profile) return null;

  const wardPct = Math.min(100, (profile.stats.wardThisWeek / profile.stats.wardTarget) * 100);

  return (
    <FadeIn>
      <div className="space-y-4">
        {/* Profile header + WARD ring */}
        <GlassCard variant="gold" className="p-5 relative" ornamental glow>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none" style={{
            background: "radial-gradient(circle, rgba(232,184,109,0.12) 0%, transparent 70%)",
          }} />
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#1C1C26" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke={profile.stats.wardMet ? "#E8B86D" : "#5BB89C"} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - wardPct / 100) }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{ filter: `drop-shadow(0 0 4px ${profile.stats.wardMet ? "#E8B86D" : "#5BB89C"})` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-lg tabular-nums" style={{ color: profile.stats.wardMet ? "#E8B86D" : "#5BB89C" }}>
                  {profile.stats.wardThisWeek}
                </span>
                <span className="text-[8px] uppercase" style={{ color: "#F5F0E860" }}>WARD</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-xl truncate" style={{ color: "#F5F0E8" }}>{profile.displayName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Pill tone={profile.isPremium ? "gold" : "muted"}>
                  {profile.tier === "trial" ? t("Trial", "Trial", "परीक्षण") :
                   profile.isPremium ? "Pro" : t("Free", "Free", "मुक्त")}
                </Pill>
                {profile.bazi && (
                  <span className="text-[11px]" style={{ color: "#5BB89C" }}>
                    Day Master: {profile.bazi.dayMaster}
                  </span>
                )}
              </div>
              {profile.trialEndsAt && (
                <p className="text-[10px] mt-1" style={{ color: "#D98E7A" }}>
                  {t("Trial до", "Trial until", "परीक्षण तक")}: {new Date(profile.trialEndsAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <StatBox icon={<TrendingUp className="w-3 h-3" />} label={t("Streak", "Streak", "श्रृंखला")} value={profile.stats.streak} color="#E8B86D" />
            <StatBox icon={<Sparkles className="w-3 h-3" />} label={t("Ритуалы", "Rituals", "अनुष्ठान")} value={profile.stats.ritualsCompleted} color="#5BB89C" />
            <StatBox icon={<Award className="w-3 h-3" />} label={t("Города", "Cities", "शहर")} value={profile.stats.citiesExplored} color="#D98E7A" />
            <StatBox icon={<User className="w-3 h-3" />} label={t("Mentor", "Mentor", "गुरु")} value={profile.stats.mentorMessages} color="#5E8FA8" />
          </div>
        </GlassCard>

        {/* Partner link — shareable, never gated */}
        <GlassCard variant="jade" className="p-4" ornamental>
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4" style={{ color: "#5BB89C" }} />
            <h4 className="font-serif text-sm" style={{ color: "#F5F0E8" }}>
              {t("Партнёрская ссылка", "Partner link", "साझेदारी लिंक")}
            </h4>
            <span className="text-[9px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "#5BB89C20", color: "#5BB89C" }}>
              {t("всегда бесплатно", "always free", "हमेशा मुफ्त")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={profile.partnerLink.url}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-mono focus:outline-none"
              style={{ background: "rgba(11,11,15,0.6)", border: "1px solid #5BB89C30", color: "#F5F0E8" }}
            />
            <button
              onClick={copyLink}
              className="px-2.5 py-1.5 rounded-lg transition-all hover:scale-105"
              style={{ background: copied ? "#5BB89C" : "rgba(91,184,156,0.2)", border: "1px solid #5BB89C" }}
            >
              {copied ? <Check className="w-3.5 h-3.5" style={{ color: "#0B0B0F" }} /> : <Copy className="w-3.5 h-3.5" style={{ color: "#5BB89C" }} />}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <div>
              <div className="font-mono text-sm" style={{ color: "#F5F0E8" }}>{profile.partnerLink.clicks}</div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>{t("Клики", "Clicks", "क्लिक")}</div>
            </div>
            <div>
              <div className="font-mono text-sm" style={{ color: "#5BB89C" }}>{profile.partnerLink.signups}</div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>{t("Регистрации", "Signups", "साइनअप")}</div>
            </div>
            <div>
              <div className="font-mono text-sm" style={{ color: "#E8B86D" }}>{profile.partnerLink.viralK}</div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>{t("Вирус K", "Viral K", "वायरल K")}</div>
            </div>
          </div>
        </GlassCard>

        {/* Power Cards */}
        {profile.powerCards.length > 0 && (
          <GlassCard variant="rose" className="p-4" ornamental>
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4" style={{ color: "#D98E7A" }} />
              <h4 className="font-serif text-sm" style={{ color: "#F5F0E8" }}>
                {t("Карты силы", "Power Cards", "शक्ति कार्ड")}
              </h4>
            </div>
            <div className="space-y-2">
              {profile.powerCards.map((card) => (
                <div key={card.id} className="p-2.5 rounded-lg" style={{ background: "#D98E7A10", border: "1px solid #D98E7A30" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-serif" style={{ color: "#F5F0E8" }}>{card.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#D98E7A20", color: "#D98E7A" }}>
                      {card.sharedCount} {t("шер", "shares", "शेयर")}
                    </span>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "#F5F0E860" }}>{card.description}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </FadeIn>
  );
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="text-center p-2 rounded-lg" style={{ background: `${color}10` }}>
      <div className="flex items-center justify-center mb-1" style={{ color }}>{icon}</div>
      <div className="font-mono text-lg tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>{label}</div>
    </div>
  );
}

export default RealProfilePanel;
