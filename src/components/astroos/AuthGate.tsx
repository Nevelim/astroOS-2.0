"use client";
/**
 * AuthGate — empty state с login prompt когда API возвращает 401.
 * Hades 2 визуал: rotating cosmic ring, lore text, locale-aware login button.
 */
import { GlassCard } from "./ui";
import { Sparkles, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import type { ScreenKey } from "@/lib/astroos/data";

interface AuthGateProps {
  title: string;
  description: string;
  /** Locale for button text. Default: "ru". */
  locale?: "ru" | "en" | "hi";
  /** Navigate to auth screen. If provided, the login button triggers it. */
  onLogin?: () => void;
  /** Optional navigate handler — when provided, login button uses it. */
  onNavigate?: (k: ScreenKey) => void;
  /** Visual tone: gold (default), jade, rose. */
  tone?: "gold" | "jade" | "rose";
}

const TONE_MAP: Record<string, { color: string; bg: string; ring: string }> = {
  gold: { color: "#E8B86D", bg: "rgba(232,184,109,0.1)", ring: "rgba(232,184,109,0.4)" },
  jade: { color: "#5BB89C", bg: "rgba(91,184,156,0.1)", ring: "rgba(91,184,156,0.4)" },
  rose: { color: "#D98E7A", bg: "rgba(217,142,122,0.1)", ring: "rgba(217,142,122,0.4)" },
};

export function AuthGate({
  title,
  description,
  locale = "ru",
  onLogin,
  onNavigate,
  tone = "gold",
}: AuthGateProps) {
  const t = (ru: string, en: string, hi: string) =>
    locale === "ru" ? ru : locale === "hi" ? hi : en;
  const c = TONE_MAP[tone];

  const handleClick = () => {
    if (onLogin) onLogin();
    else if (onNavigate) onNavigate("auth");
  };

  return (
    <GlassCard variant={tone} className="p-6 relative overflow-hidden" ornamental glow>
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.bg} 0%, transparent 70%)` }}
      />

      {/* Rotating conic-gradient ring */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none opacity-30"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${c.color} 90deg, transparent 180deg)`,
          animation: "spin 8s linear infinite",
        }}
      />

      <div className="relative flex flex-col items-center text-center py-6">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="relative"
        >
          {/* Pulsing ring around the icon */}
          <div
            className="absolute inset-0 -m-3 rounded-full pointer-events-none"
            style={{
              border: `1px solid ${c.ring}`,
              animation: "ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite",
            }}
          />
          <Sparkles className="w-9 h-9 relative" style={{ color: c.color }} />
        </motion.div>
        <h3 className="font-serif text-lg mt-4" style={{ color: "#F5F0E8" }}>{title}</h3>
        <p className="text-xs mt-1.5 max-w-xs leading-relaxed" style={{ color: "rgba(245,240,232,0.6)" }}>
          {description}
        </p>
        <motion.button
          onClick={handleClick}
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all"
          style={{
            background: `linear-gradient(135deg, ${c.color}, ${tone === "gold" ? "#D98E7A" : tone === "jade" ? "#E8B86D" : "#E8B86D"})`,
            color: "#0B0B0F",
            boxShadow: `0 0 20px ${c.ring}`,
          }}
        >
          <LogIn className="w-4 h-4" />
          {t("Войти", "Sign in", "साइन इन")}
          <span aria-hidden>→</span>
        </motion.button>
        <p className="mt-3 text-[10px]" style={{ color: "rgba(245,240,232,0.4)" }}>
          {t(
            "90 секунд — и ваша карта готова",
            "90 seconds — and your chart is ready",
            "90 सेकंड — और आपकी चार्ट तैयार है"
          )}
        </p>
      </div>
    </GlassCard>
  );
}

export default AuthGate;
