"use client";
/**
 * RealHoroscopePanel — ежедневный гороскоп с реальными транзитами + AI.
 * Использует /api/horoscope для real astronomy-engine transits + ZAI narrative.
 * Clean Architecture: Interface Adapter.
 * Hades 2 визуал: moon phase visualization, transit pills, ambient glow.
 */
import { useState, useEffect } from "react";
import { GlassCard, Pill, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Moon, Sun, Wind, Loader2, RefreshCw } from "lucide-react";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";
import type { TransitAspect } from "./TransitDetailDrawer";

interface HoroscopeData {
  sign: string;
  date: string;
  traits: { element: string; ruler: string; qualities: string };
  transits: string;
  moonPhase: string;
  keyAspects: Array<{ a: string; b: string; type: string }>;
  narrative: { en: string; ru: string; hi: string };
  locale: string;
  retrogradePlanets?: string[];
  dignityHighlights?: Array<{
    planet: string;
    sign: string;
    dignity: "Ruler" | "Exalted" | "Detriment" | "Fall" | "Neutral";
    score: number;
  }>;
  moonVoC?: {
    isVoC: boolean;
    nextVoCStart: string | null;
    nextVoCEnd: string | null;
    durationHours: number | null;
    sign: string | null;
    nextSign: string | null;
  } | null;
}

/** X-Cache response header values from /api/horoscope. */
type CacheStatus = "HIT" | "MISS" | "STALE" | "FALLBACK";

/**
 * CacheStatusPill — tiny bottom-right pill indicating the response source.
 * HIT → jade "cached" (hover-only, very subtle).
 * STALE → gold "stale" (always visible — degraded experience).
 * FALLBACK → rose "offline mode" (always visible — LLM unavailable).
 * MISS → no pill (fresh content, default).
 */
function CacheStatusPill({ status, t }: { status: CacheStatus | null; t: (ru: string, en: string, hi: string) => string }) {
  if (!status || status === "MISS") return null;
  const isHit = status === "HIT";
  const tone = isHit ? "jade" : status === "STALE" ? "gold" : "rose";
  const label = isHit
    ? t("кэш", "cached", "कैश")
    : status === "STALE"
      ? t("устаревший", "stale", "पुराना")
      : t("офлайн", "offline mode", "ऑफ़लाइन");
  return (
    <div
      className={`absolute bottom-2 right-2 z-10 ${isHit ? "opacity-0 group-hover:opacity-100" : ""} transition-opacity duration-200`}
      title={t(
        "Контент из кэша (LLM не вызывался)",
        "Served from cache (no LLM call)",
        "कैश से प्राप्त (कोई LLM कॉल नहीं)",
      )}
    >
      <Pill tone={tone} className="text-[9px] px-1.5 py-0 leading-tight">
        {label}
      </Pill>
    </div>
  );
}

const MOON_PHASE_ICONS: Record<string, string> = {
  "New Moon": "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter": "🌓",
  "Waxing Gibbous": "🌔",
  "Full Moon": "🌕",
  "Waning Gibbous": "🌖",
  "Last Quarter": "🌗",
  "Waning Crescent": "🌘",
  "Unknown": "🌙",
};

const ASPECT_TONES: Record<string, "gold" | "jade" | "rose" | "muted"> = {
  conjunct: "gold",
  trine: "jade",
  sextile: "jade",
  square: "rose",
  opposite: "rose",
};

const ASPECT_SYMBOLS: Record<string, string> = {
  conjunct: "☌",
  trine: "△",
  sextile: "⚹",
  square: "☐",
  opposite: "☍",
};

const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function lonToSign(lon: number): string {
  const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
  return ZODIAC_SIGNS[idx] ?? "Unknown";
}

/** Influence descriptions per planet + aspect type */
const INFLUENCE_MAP: Record<string, Record<string, string>> = {
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

function getInfluence(planet: string, aspectType: string): string {
  const map = INFLUENCE_MAP[aspectType] ?? INFLUENCE_MAP.conjunct;
  return map[planet] ?? map["default"] ?? "Energy in motion";
}

const RECOMMENDATION_MAP: Record<string, string> = {
  conjunct: "Channel the intensity. Focus on one key intention during this transit.",
  square: "Breathe through the friction. Journal what's triggering you — the tension is the teacher.",
  trine: "Let it flow. Don't overthink — this is natural talent expressing itself.",
  sextile: "Act on the opening. Sextiles don't push — they invite. Take the first step.",
  opposite: "Hold both sides. The answer isn't either/or — it's integration. Listen to the mirror.",
};

function getRecommendation(aspectType: string): string {
  return RECOMMENDATION_MAP[aspectType] ?? "Observe and reflect.";
}

/** Hook: derive Sun sign from member birth data via /api/calculate */
function useSignFromMember(): { sign: string | null; loading: boolean } {
  const { member } = useMember();
  const [sign, setSign] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const m = member ?? mockMember();
    fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDateTime: m.birth.isoDateTime,
        birthLat: m.birth.lat,
        birthLng: m.birth.lng,
        birthTzOffset: m.birth.tzOffset,
        birthPlaceName: m.birth.placeName,
        gender: m.birth.gender,
      }),
    })
      .then((r) => r.json())
      .then((calc) => {
        const sunPos = calc.planetPositions?.find((p: { planet: string }) => p.planet === "Sun");
        if (sunPos) {
          setSign(lonToSign(sunPos.eclipticLonDeg));
        } else {
          setSign("Scorpio"); // fallback
        }
        setLoading(false);
      })
      .catch(() => {
        setSign("Scorpio"); // fallback on error
        setLoading(false);
      });
  }, [member]);

  return { sign, loading };
}

export function RealHoroscopePanel({ locale, sign: signProp, onAspectClick }: { locale: "ru" | "en" | "hi"; sign?: string; onAspectClick?: (aspect: TransitAspect) => void }) {
  const { sign: detectedSign, loading: signLoading } = useSignFromMember();
  const activeSign = signProp ?? detectedSign ?? "Scorpio";
  const [data, setData] = useState<HoroscopeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  const loadHoroscope = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/horoscope?sign=${activeSign}&locale=${locale}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        // X-Cache header tells us whether content came from LLM, cache, or fallback
        const header = r.headers.get("X-Cache");
        setCacheStatus(header as CacheStatus | null);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { loadHoroscope(); }, [activeSign, locale]);

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative group" ornamental glow>
        <CacheStatusPill status={cacheStatus} t={t} />
        {/* Ambient glow на heading */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(232,184,109,0.15) 0%, transparent 70%)",
        }} />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg flex items-center gap-2" style={{ color: "#F5F0E8" }}>
              <Sun className="w-4 h-4" style={{ color: "#E8B86D" }} />
              {t("Утренний гороскоп", "Daily Horoscope", "दैनिक राशिफल")}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#F5F0E860" }}>
              {t("Реальные транзиты · AI нарратив", "Real transits · AI narrative", "वास्तविक ट्रांज़िट · AI कथा")}
            </p>
          </div>
          <button
            onClick={loadHoroscope}
            disabled={loading}
            className="p-1.5 rounded-lg transition-all hover:scale-105"
            style={{ background: "rgba(11,11,15,0.6)", border: "1px solid rgba(232,184,109,0.3)" }}
            title={t("Обновить", "Refresh", "ताज़ा करें")}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: "#E8B86D" }} />
          </button>
        </div>

        {/* Sign + Date + Moon phase */}
        {data && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{MOON_PHASE_ICONS[data.moonPhase] ?? "🌙"}</span>
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
                  {t("Фаза луны", "Moon phase", "चंद्र कला")}
                </div>
                <div className="text-sm font-medium" style={{ color: "#5BB89C" }}>{data.moonPhase}</div>
              </div>
            </div>
            <div className="h-8 w-px" style={{ background: "#F5F0E820" }} />
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
                {t("Знак", "Sign", "राशि")}
              </div>
              <div className="text-sm font-medium" style={{ color: "#E8B86D" }}>{data.sign}</div>
            </div>
            <div className="h-8 w-px" style={{ background: "#F5F0E820" }} />
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
                {t("Стихия", "Element", "तत्व")}
              </div>
              <div className="text-sm font-medium" style={{ color: "#D98E7A" }}>{data.traits.element}</div>
            </div>
          </div>
        )}

        {/* Loading — cosmic shimmer */}
        {(loading || signLoading) && (
          <div className="space-y-2 py-4">
            <div className="h-3 w-full rounded animate-pulse" style={{ background: "#E8B86D20" }} />
            <div className="h-3 w-5/6 rounded animate-pulse" style={{ background: "#E8B86D15" }} />
            <div className="h-3 w-4/6 rounded animate-pulse" style={{ background: "#E8B86D10" }} />
            <p className="text-[11px] font-serif italic text-center mt-3" style={{ color: "#F5F0E860" }}>
              <Loader2 className="w-3 h-3 inline animate-spin mr-1" style={{ color: "#E8B86D" }} />
              {t("Звёзды шепчутся...", "Stars are whispering...", "तारे फुसफुसा रहे हैं...")}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-2 rounded text-[11px] mb-3" style={{ background: "#D98E7A15", color: "#D98E7A" }}>
            {t("Не удалось получить гороскоп", "Failed to load horoscope", "राशिफल लोड नहीं हुआ")}: {error}
          </div>
        )}

        {/* Narrative */}
        <AnimatePresence mode="wait">
          {data && !loading && (
            <motion.div
              key={data.date + data.sign}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              {/* Transit pills */}
              {data.keyAspects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {data.keyAspects.map((asp, i) => {
                    const tone = ASPECT_TONES[asp.type] ?? "muted";
                    const symbol = ASPECT_SYMBOLS[asp.type] ?? "·";
                    const color = tone === "gold" ? "#E8B86D" : tone === "jade" ? "#5BB89C" : tone === "rose" ? "#D98E7A" : "#9A9AA8";
                    const handleClick = () => {
                      if (!onAspectClick) return;
                      const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
                      const total = data.keyAspects.length;
                      const hour = total <= 1 ? 12 : Math.round((i / (total - 1)) * 20 + 2);
                      const distanceFromNow = Math.abs(hour - currentHour);
                      const orb = Math.min(distanceFromNow * 0.5 + 0.5, 8);
                      const exactDate = new Date();
                      exactDate.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
                      const aspect: TransitAspect = {
                        planetA: asp.a,
                        planetB: asp.b,
                        aspectType: asp.type,
                        orb: Math.round(orb * 10) / 10,
                        exactTime: exactDate.toISOString(),
                        applying: hour > currentHour,
                        influence: getInfluence(asp.a, asp.type),
                        recommendation: getRecommendation(asp.type),
                        duration: asp.type === "conjunct" ? "1-2 days" : asp.type === "trine" ? "3-5 days" : asp.type === "square" ? "2-3 days" : "1-3 days",
                        house: Math.floor(hour / 2) + 1 <= 12 ? Math.floor(hour / 2) + 1 : undefined,
                      };
                      onAspectClick(aspect);
                    };
                    return (
                      <motion.div
                        key={`${asp.a}-${asp.b}-${i}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 * i }}
                        className={onAspectClick ? "cursor-pointer" : undefined}
                        onClick={handleClick}
                        role={onAspectClick ? "button" : undefined}
                        tabIndex={onAspectClick ? 0 : undefined}
                        onKeyDown={onAspectClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } } : undefined}
                      >
                        <Pill tone={tone} className={onAspectClick ? "hover:opacity-80 transition-opacity" : undefined}>
                          {asp.a} {symbol} {asp.b}
                        </Pill>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* AI narrative */}
              <div className="p-3 rounded-lg" style={{
                background: "linear-gradient(135deg, rgba(232,184,109,0.06), rgba(91,184,156,0.04))",
                border: "1px solid rgba(232,184,109,0.15)",
              }}>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#E8B86D" }} />
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-serif" style={{ color: "#F5F0E8" }}>
                    {data.narrative[locale] || data.narrative.en}
                  </p>
                </div>
              </div>

              {/* Astrological context badges (retrograde + dignity + VoC) */}
              {((data.retrogradePlanets && data.retrogradePlanets.length > 0) || (data.dignityHighlights && data.dignityHighlights.length > 0) || data.moonVoC) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.retrogradePlanets?.map((p) => (
                    <span
                      key={`rx-${p}`}
                      className="astro-rx-glyph inline-flex items-center gap-1 rounded-full border border-[#D98E7A]/40 bg-[#D98E7A]/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#D98E7A]"
                      title={`${p} retrograde`}
                    >
                      <span>℞</span>
                      <span>{p}</span>
                    </span>
                  ))}
                  {data.dignityHighlights?.map((d) => {
                    const tone = d.dignity === "Ruler" ? "gold" : d.dignity === "Exalted" ? "jade" : "rose";
                    const cls = tone === "gold"
                      ? "border-[#E8B86D]/40 bg-[#E8B86D]/[0.08] text-[#E8B86D]"
                      : tone === "jade"
                        ? "border-[#5BB89C]/40 bg-[#5BB89C]/[0.08] text-[#5BB89C]"
                        : "border-[#D98E7A]/40 bg-[#D98E7A]/[0.08] text-[#D98E7A]";
                    const icon = d.dignity === "Ruler" ? "♔" : d.dignity === "Exalted" ? "↑" : d.dignity === "Fall" ? "⤓" : "↓";
                    return (
                      <span
                        key={`dignity-${d.planet}`}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}
                        title={`${d.planet} in ${d.sign} — ${d.dignity} (score ${d.score > 0 ? "+" : ""}${d.score})`}
                      >
                        <span>{icon}</span>
                        <span>{d.planet}</span>
                        <span className="opacity-70">{d.dignity}</span>
                      </span>
                    );
                  })}
                  {data.moonVoC && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        data.moonVoC.isVoC
                          ? "border-[#D98E7A]/40 bg-[#D98E7A]/[0.08] text-[#D98E7A]"
                          : "border-[#5BB89C]/40 bg-[#5BB89C]/[0.08] text-[#5BB89C]"
                      }`}
                      title={data.moonVoC.isVoC ? "Moon Void of Course" : "Moon clear (not VoC)"}
                    >
                      <span>☾</span>
                      <span>{data.moonVoC.isVoC ? "VoC" : "clear"}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Transits summary */}
              <div className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: "#F5F0E860" }}>
                <Wind className="w-3 h-3" />
                <span>{t("Текущие транзиты", "Current transits", "वर्तमान ट्रांज़िट")}:</span>
                <span className="font-mono truncate" style={{ color: "#5BB89C" }}>{data.transits}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="text-center py-6">
            <Moon className="w-7 h-7 mx-auto" style={{ color: "#5BB89C" }} />
            <p className="mt-2 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
              {t("Нажмите обновить", "Click refresh", "ताज़ा करें दबाएँ")}
            </p>
          </div>
        )}
      </GlassCard>
    </FadeIn>
  );
}

export default RealHoroscopePanel;
