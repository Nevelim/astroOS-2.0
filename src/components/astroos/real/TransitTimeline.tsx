"use client";
/**
 * TransitTimeline — horizontal 24-hour timeline strip showing today's transit events.
 * Hades 2 cosmic theme with glass morphism, jade tint.
 * Clicking a transit pill opens the TransitDetailDrawer.
 * Clean Architecture: Interface Adapter.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { GlassCard, Pill, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import type { TransitAspect } from "./TransitDetailDrawer";

/* ───────── Types ───────── */

interface TransitTimelineProps {
  locale: "ru" | "en" | "hi";
  onAspectClick: (aspect: TransitAspect) => void;
}

interface HoroscopeData {
  sign: string;
  date: string;
  keyAspects: Array<{ a: string; b: string; type: string }>;
  transits: string;
}

/* ───────── Constants ───────── */

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunct: "☌",
  trine: "△",
  sextile: "⚹",
  square: "☐",
  opposite: "☍",
};

const ASPECT_TONES: Record<string, "gold" | "jade" | "rose" | "muted"> = {
  conjunct: "gold",
  trine: "jade",
  sextile: "jade",
  square: "rose",
  opposite: "rose",
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
};

/* ───────── i18n helper ───────── */
function t(locale: "ru" | "en" | "hi", en: string, ru: string, hi: string) {
  return locale === "ru" ? ru : locale === "hi" ? hi : en;
}

/* ───────── Influences/recommendations per aspect type ───────── */

const ASPECT_INFLUENCES: Record<string, Record<string, string>> = {
  conjunct: {
    Sun: "Identity surge, vital energy peaks",
    Moon: "Emotional intensity, inner needs surface",
    Mercury: "Mental clarity or overload, communication focus",
    Venus: "Relationship emphasis, aesthetic sensitivity",
    Mars: "Action impulse, assertiveness, potential friction",
    Jupiter: "Expansion, optimism, growth opportunity",
    Saturn: "Structure, discipline, limitation awareness",
    default: "Intensified energy, fusion of forces",
  },
  square: {
    Sun: "Tension between will and circumstance",
    Moon: "Emotional challenge, inner conflict",
    Mercury: "Mental stress, communication breakdowns",
    Venus: "Relationship tension, value conflicts",
    Mars: "Frustration, blocked action, potential for breakthrough",
    Jupiter: "Overextension, unrealistic expectations",
    Saturn: "Restriction, authority clashes, pressure",
    default: "Creative tension, growth through friction",
  },
  trine: {
    Sun: "Flow of vitality, effortless expression",
    Moon: "Emotional harmony, intuitive flow",
    Mercury: "Clear thinking, eloquent communication",
    Venus: "Harmonious relationships, creative flow",
    Mars: "Productive energy, confident action",
    Jupiter: "Grace, luck, natural expansion",
    Saturn: "Stable discipline, productive structure",
    default: "Harmonious flow, natural talent",
  },
  sextile: {
    Sun: "Opportunity for expression, gentle support",
    Moon: "Emotional opportunity, intuitive nudge",
    Mercury: "Communication opportunity, learning opening",
    Venus: "Social opportunity, creative spark",
    Mars: "Action opportunity, enterprising energy",
    Jupiter: "Growth opening, chance for progress",
    Saturn: "Constructive discipline, grounding chance",
    default: "Opportunity, gentle activation",
  },
  opposite: {
    Sun: "Polarity, relationship mirror, awareness through other",
    Moon: "Emotional polarization, needs vs. wants",
    Mercury: "Dialectic tension, opposing viewpoints",
    Venus: "Relational tension, projection and mirroring",
    Mars: "Conflict, opposition, confrontation",
    Jupiter: "Overreach vs. contraction, belief tension",
    Saturn: "Authority tension, responsibility vs. freedom",
    default: "Polarity awareness, integration needed",
  },
};

const ASPECT_RECOMMENDATIONS: Record<string, string> = {
  conjunct: "Channel the intensity. Focus on one key intention during this transit.",
  square: "Breathe through the friction. Journal what's triggering you — the tension is the teacher.",
  trine: "Let it flow. Don't overthink — this is natural talent expressing itself.",
  sextile: "Act on the opening. Sextiles don't push — they invite. Take the first step.",
  opposite: "Hold both sides. The answer isn't either/or — it's integration. Listen to the mirror.",
};

/* ───────── Component ───────── */

export function TransitTimeline({ locale, onAspectClick }: TransitTimelineProps) {
  const [aspects, setAspects] = useState<HoroscopeData["keyAspects"]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentHour = useMemo(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  }, []);

  const loadTransits = useCallback(() => {
    setLoading(true);
    fetch(`/api/horoscope?sign=Scorpio&locale=${locale}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: HoroscopeData) => {
        setAspects(d.keyAspects ?? []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback mock aspects
        setAspects([
          { a: "Moon", b: "Saturn", type: "square" },
          { a: "Venus", b: "Jupiter", type: "trine" },
          { a: "Mercury", b: "Mars", type: "sextile" },
        ]);
        setLoading(false);
      });
  }, [locale]);

  useEffect(() => { loadTransits(); }, [loadTransits]);

  // Scroll to current time indicator on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const scrollEl = scrollRef.current;
    const currentPos = (currentHour / 24) * scrollEl.scrollWidth;
    scrollEl.scrollLeft = Math.max(0, currentPos - scrollEl.clientWidth / 2);
  }, [aspects, currentHour]);

  /** Assign approximate hour to each aspect based on its index */
  function getAspectHour(index: number, total: number): number {
    if (total <= 1) return 12;
    return Math.round((index / (total - 1)) * 20 + 2); // spread between 02:00 and 22:00
  }

  /** Build a TransitAspect from a keyAspect + approximate hour */
  function buildTransitAspect(
    ka: { a: string; b: string; type: string },
    hour: number
  ): TransitAspect {
    const influences = ASPECT_INFLUENCES[ka.type] ?? ASPECT_INFLUENCES.conjunct;
    const influence = influences[ka.a] ?? influences["default"] ?? "Energy in motion";
    const recommendation = ASPECT_RECOMMENDATIONS[ka.type] ?? "Observe and reflect.";

    // Compute a mock orb based on how far from exact the hour is
    const distanceFromNow = Math.abs(hour - currentHour);
    const orb = Math.min(distanceFromNow * 0.5 + 0.5, 8);
    const applying = hour > currentHour;

    // Construct approximate exact time
    const exactDate = new Date();
    exactDate.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);

    return {
      planetA: ka.a,
      planetB: ka.b,
      aspectType: ka.type,
      orb: Math.round(orb * 10) / 10,
      exactTime: exactDate.toISOString(),
      applying,
      influence,
      recommendation,
      duration: ka.type === "conjunct" ? "1-2 days" : ka.type === "trine" ? "3-5 days" : ka.type === "square" ? "2-3 days" : "1-3 days",
      house: Math.floor(hour / 2) + 1 <= 12 ? Math.floor(hour / 2) + 1 : undefined,
    };
  }

  /** Format hour for display */
  function formatHour(h: number): string {
    const hr = Math.floor(h);
    return `${hr.toString().padStart(2, "0")}:00`;
  }

  // Hour markers: 0, 3, 6, 9, 12, 15, 18, 21
  const hourMarkers = Array.from({ length: 9 }, (_, i) => i * 3);

  return (
    <FadeIn>
      <GlassCard variant="jade" className="!p-4" ornamental>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "#5BB89C80" }}>
            {t(locale, "Today's Transit Timeline", "Хронология транзитов", "आज का ट्रांज़िट समयरेखा")}
          </div>
          <div className="font-mono text-[10px]" style={{ color: "#9A9AA8" }}>
            {formatHour(currentHour)}
          </div>
        </div>

        {/* Timeline container */}
        <div className="relative">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center h-16">
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: "#5BB89C" }} />
              <div className="h-2 w-2 rounded-full animate-pulse ml-1" style={{ background: "#5BB89C", animationDelay: "0.2s" }} />
              <div className="h-2 w-2 rounded-full animate-pulse ml-1" style={{ background: "#5BB89C", animationDelay: "0.4s" }} />
            </div>
          )}

          {/* Timeline strip */}
          {!loading && aspects.length > 0 && (
            <div
              ref={scrollRef}
              className="relative overflow-x-auto overflow-y-hidden scrollbar-thin"
              style={{ scrollbarWidth: "thin" }}
            >
              <div className="relative" style={{ minWidth: "600px", height: "80px" }}>
                {/* Hour markers line */}
                <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "#2A2A35" }} />

                {/* Hour labels */}
                {hourMarkers.map((h) => {
                  const left = `${(h / 24) * 100}%`;
                  const isPast = h <= currentHour;
                  return (
                    <div
                      key={h}
                      className="absolute"
                      style={{ left, bottom: 0 }}
                    >
                      <div
                        className="h-2 w-px"
                        style={{ background: isPast ? "#5BB89C60" : "#2A2A35" }}
                      />
                      <div
                        className="text-[8px] font-mono mt-0.5 -translate-x-1/2"
                        style={{ color: isPast ? "#5BB89C80" : "#2A2A35" }}
                      >
                        {formatHour(h)}
                      </div>
                    </div>
                  );
                })}

                {/* Current time indicator */}
                <div
                  className="absolute top-0 bottom-4 w-px z-10"
                  style={{
                    left: `${(currentHour / 24) * 100}%`,
                    background: "linear-gradient(to bottom, #E8B86D00, #E8B86D, #E8B86D00)",
                  }}
                >
                  <div
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ background: "#E8B86D" }}
                  />
                </div>

                {/* Aspect pills on timeline */}
                <AnimatePresence>
                  {aspects.map((ka, i) => {
                    const hour = getAspectHour(i, aspects.length);
                    const left = `${(hour / 24) * 100}%`;
                    const isPast = hour <= currentHour;
                    const tone = ASPECT_TONES[ka.type] ?? "muted";
                    const symbol = ASPECT_SYMBOLS[ka.type] ?? "·";
                    const glyphA = PLANET_GLYPHS[ka.a] ?? "●";
                    const glyphB = PLANET_GLYPHS[ka.b] ?? "●";
                    const aspect = buildTransitAspect(ka, hour);

                    return (
                      <motion.button
                        key={`${ka.a}-${ka.b}-${ka.type}-${i}`}
                        initial={{ opacity: 0, y: 8, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.08 * i, duration: 0.3 }}
                        onClick={() => onAspectClick(aspect)}
                        className="absolute -translate-x-1/2 cursor-pointer transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-[#5BB89C]/50 rounded-full"
                        style={{
                          left,
                          top: `${4 + (i % 2) * 24}px`,
                          opacity: isPast ? 0.5 : 1,
                        }}
                        aria-label={`${ka.a} ${symbol} ${ka.b}`}
                      >
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                          style={{
                            background: tone === "gold" ? "rgba(232,184,109,0.12)" :
                              tone === "jade" ? "rgba(91,184,156,0.12)" :
                              tone === "rose" ? "rgba(217,142,122,0.12)" :
                              "rgba(26,26,38,0.8)",
                            borderColor: tone === "gold" ? "rgba(232,184,109,0.3)" :
                              tone === "jade" ? "rgba(91,184,156,0.3)" :
                              tone === "rose" ? "rgba(217,142,122,0.3)" :
                              "rgba(42,42,53,0.8)",
                            color: tone === "gold" ? "#E8B86D" :
                              tone === "jade" ? "#5BB89C" :
                              tone === "rose" ? "#D98E7A" :
                              "#9A9AA8",
                          }}
                        >
                          {glyphA} {symbol} {glyphB}
                        </span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && aspects.length === 0 && (
            <div className="text-center py-4 text-xs" style={{ color: "#9A9AA8" }}>
              {t(locale, "No major transits today", "Сегодня нет крупных транзитов", "आज कोई प्रमुख ट्रांज़िट नहीं")}
            </div>
          )}
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default TransitTimeline;
