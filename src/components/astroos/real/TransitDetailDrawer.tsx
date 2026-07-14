"use client";
/**
 * TransitDetailDrawer — slide-in panel from the right showing detailed transit aspect info.
 * Hades 2 cosmic theme with glass morphism, planet glyphs, aspect color coding.
 * Uses Sheet (shadcn) for accessibility + Framer Motion for spring animations.
 * Clean Architecture: Interface Adapter.
 */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard, Pill, CosmicDivider } from "../ui";

/* ───────── Types ───────── */

export interface TransitAspect {
  planetA: string;
  planetB: string;
  aspectType: string;
  orb: number;
  exactTime?: string;
  applying: boolean;
  influence: string;
  recommendation: string;
  duration: string;
  house?: number;
}

export interface TransitDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  aspect: TransitAspect | null;
  locale: "ru" | "en" | "hi";
}

/* ───────── Constants ───────── */

const PLANET_COLORS: Record<string, string> = {
  Sun: "#FBBF24",
  Moon: "#C4D3E0",
  Mercury: "#60A5FA",
  Venus: "#F472B6",
  Mars: "#EF4444",
  Jupiter: "#A78BFA",
  Saturn: "#94A3B8",
  Uranus: "#22D3EE",
  Neptune: "#2DD4BF",
  Pluto: "#9333EA",
  Chiron: "#D98E7A",
  NorthNode: "#5BB89C",
  SouthNode: "#D98E7A",
};

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉",
  Moon: "☾",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
  Chiron: "⚷",
  NorthNode: "☊",
  SouthNode: "☋",
};

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunct: "☌",
  trine: "△",
  sextile: "⚹",
  square: "☐",
  opposite: "☍",
};

const ASPECT_TONES: Record<string, "gold" | "jade" | "rose"> = {
  conjunct: "gold",
  trine: "jade",
  sextile: "jade",
  square: "rose",
  opposite: "rose",
};

const ASPECT_COLORS: Record<string, string> = {
  conjunct: "#E8B86D",
  trine: "#5BB89C",
  sextile: "#5BB89C",
  square: "#D98E7A",
  opposite: "#D98E7A",
};

const MAX_ORB: Record<string, number> = {
  conjunct: 10,
  trine: 8,
  sextile: 6,
  square: 8,
  opposite: 8,
};

/* ───────── i18n helper ───────── */

function t(locale: "ru" | "en" | "hi", en: string, ru: string, hi: string) {
  return locale === "ru" ? ru : locale === "hi" ? hi : en;
}

/* ───────── Component ───────── */

export function TransitDetailDrawer({ open, onClose, aspect, locale }: TransitDetailDrawerProps) {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const aspectColor = aspect ? (ASPECT_COLORS[aspect.aspectType] ?? "#9A9AA8") : "#9A9AA8";
  const aspectTone = aspect ? (ASPECT_TONES[aspect.aspectType] ?? "gold") : "gold";
  const planetAColor = aspect ? (PLANET_COLORS[aspect.planetA] ?? "#F5F0E8") : "#F5F0E8";
  const planetBColor = aspect ? (PLANET_COLORS[aspect.planetB] ?? "#F5F0E8") : "#F5F0E8";
  const maxOrb = aspect ? (MAX_ORB[aspect.aspectType] ?? 10) : 10;
  const orbPercent = aspect ? Math.min(100, (aspect.orb / maxOrb) * 100) : 0;

  return (
    <AnimatePresence>
      {open && aspect && (
        <>
          {/* Backdrop */}
          <motion.div
            key="transit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Drawer panel */}
          <motion.aside
            key="transit-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t(
              locale,
              `Transit detail: ${aspect.planetA} ${ASPECT_SYMBOLS[aspect.aspectType] ?? "·"} ${aspect.planetB}`,
              `Детали транзита: ${aspect.planetA} ${ASPECT_SYMBOLS[aspect.aspectType] ?? "·"} ${aspect.planetB}`,
              `ट्रांज़िट विवरण: ${aspect.planetA} ${ASPECT_SYMBOLS[aspect.aspectType] ?? "·"} ${aspect.planetB}`
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 z-[70] w-full sm:max-w-[400px] overflow-y-auto"
            style={{
              background: "rgba(11,11,15,0.95)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderLeft: `2px solid ${aspectColor}40`,
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#2A2A35] bg-[#0B0B0F]/80 text-[#9A9AA8] transition-colors hover:text-[#F5F0E8] hover:border-[#F5F0E840]"
              aria-label={t(locale, "Close", "Закрыть", "बंद करें")}
            >
              ✕
            </button>

            <div className="p-5 pt-6 space-y-5">
              {/* ── Header: Planet glyphs + aspect symbol ── */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="text-center">
                  <div className="text-4xl" style={{ color: planetAColor }}>
                    {PLANET_GLYPHS[aspect.planetA] ?? "●"}
                  </div>
                  <div className="mt-1 text-xs font-medium" style={{ color: planetAColor }}>
                    {aspect.planetA}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl" style={{ color: aspectColor }}>
                    {ASPECT_SYMBOLS[aspect.aspectType] ?? "·"}
                  </div>
                  <div className="mt-1">
                    <Pill tone={aspectTone} className="text-[10px]">
                      {aspect.aspectType}
                    </Pill>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-4xl" style={{ color: planetBColor }}>
                    {PLANET_GLYPHS[aspect.planetB] ?? "●"}
                  </div>
                  <div className="mt-1 text-xs font-medium" style={{ color: planetBColor }}>
                    {aspect.planetB}
                  </div>
                </div>
              </div>

              <CosmicDivider />

              {/* ── Applying / Separating indicator ── */}
              <div className="flex items-center justify-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                  style={{
                    background: aspect.applying ? "rgba(91,184,156,0.1)" : "rgba(217,142,122,0.1)",
                    borderColor: aspect.applying ? "rgba(91,184,156,0.3)" : "rgba(217,142,122,0.3)",
                    color: aspect.applying ? "#5BB89C" : "#D98E7A",
                  }}
                >
                  {aspect.applying ? "→" : "←"}
                  {aspect.applying
                    ? t(locale, "Applying", "Применение", "लागू हो रहा")
                    : t(locale, "Separating", "Разделение", "अलग हो रहा")}
                </span>
              </div>

              {/* ── Orb progress bar ── */}
              <GlassCard variant="neutral" className="!p-3">
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span style={{ color: "#9A9AA8" }}>
                    {t(locale, "Orb", "Орб", "ऑर्ब")}
                  </span>
                  <span className="font-mono" style={{ color: aspectColor }}>
                    {aspect.orb.toFixed(1)}° / {maxOrb}°
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#1C1C26]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: aspectColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${orbPercent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[9px]" style={{ color: "#8A8A96" }}>
                  <span>{t(locale, "Exact", "Точный", "सटीक")}</span>
                  <span>{t(locale, "Max orb", "Макс орб", "अधिकतम ऑर्ब")}</span>
                </div>
              </GlassCard>

              {/* ── Exact time ── */}
              {aspect.exactTime && (
                <div className="rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3 text-center text-xs" style={{ color: "#9A9AA8" }}>
                  {t(locale, "Exact at", "Точно в", "सटीक समय")}:{" "}
                  <span className="font-mono" style={{ color: "#E8B86D" }}>
                    {new Date(aspect.exactTime).toLocaleTimeString(locale === "ru" ? "ru-RU" : locale === "hi" ? "hi-IN" : "en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              {/* ── Influence ── */}
              <GlassCard variant={aspectTone} className="!p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5" style={{ color: aspectColor }}>✦</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#9A9AA8" }}>
                      {t(locale, "Influence", "Влияние", "प्रभाव")}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#F5F0E8" }}>
                      {aspect.influence}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* ── Recommendation ── */}
              <GlassCard variant="jade" className="!p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5" style={{ color: "#5BB89C" }}>☾</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#9A9AA8" }}>
                      {t(locale, "Recommendation", "Рекомендация", "सिफारिश")}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#F5F0E8" }}>
                      {aspect.recommendation}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* ── Duration ── */}
              <div className="flex items-center gap-2 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3">
                <span className="text-sm" style={{ color: aspectColor }}>⏱</span>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#9A9AA8" }}>
                    {t(locale, "Duration", "Продолжительность", "अवधि")}
                  </div>
                  <div className="text-sm font-medium" style={{ color: "#F5F0E8" }}>
                    {aspect.duration}
                  </div>
                </div>
              </div>

              {/* ── House ── */}
              {aspect.house != null && (
                <div className="flex items-center gap-2 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3">
                  <span className="text-sm" style={{ color: "#E8B86D" }}>⌂</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: "#9A9AA8" }}>
                      {t(locale, "House", "Дом", "भाव")}
                    </div>
                    <div className="text-sm font-medium" style={{ color: "#F5F0E8" }}>
                      {t(locale, `House ${aspect.house}`, `Дом ${aspect.house}`, `भाव ${aspect.house}`)}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom spacer for mobile scroll */}
              <div className="h-6" />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default TransitDetailDrawer;
