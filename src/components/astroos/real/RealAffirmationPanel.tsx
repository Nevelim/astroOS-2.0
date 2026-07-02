"use client";
/**
 * RealAffirmationPanel — AI-generated affirmation по знаку.
 * Использует /api/affirmation для daily affirmation.
 * Clean Architecture: Interface Adapter.
 * Hades 2 визуал: large serif quote, ambient glow, refresh.
 */
import { useState, useEffect } from "react";
import { GlassCard, Pill, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";

interface AffirmationData {
  sign: string;
  date: string;
  affirmation: { en: string; ru: string; hi: string };
  traits: { element: string; gift: string };
}

/** X-Cache response header values from /api/affirmation. */
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

const ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

function lonToSign(lon: number): string {
  const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
  return ZODIAC_SIGNS[idx] ?? "Unknown";
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

export function RealAffirmationPanel({ locale, sign: signProp }: { locale: "ru" | "en" | "hi"; sign?: string }) {
  const { sign: detectedSign, loading: signLoading } = useSignFromMember();
  const activeSign = signProp ?? detectedSign ?? "Scorpio";
  const [data, setData] = useState<AffirmationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  const load = () => {
    setLoading(true);
    fetch(`/api/affirmation?sign=${activeSign}&locale=${locale}`)
      .then((r) => {
        // X-Cache header tells us whether content came from LLM, cache, or fallback
        const header = r.headers.get("X-Cache");
        setCacheStatus(header as CacheStatus | null);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeSign, locale]);

  return (
    <FadeIn>
      <GlassCard variant="rose" className="p-6 relative group overflow-hidden" ornamental glow>
        <CacheStatusPill status={cacheStatus} t={t} />
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(217,142,122,0.12) 0%, transparent 70%)",
        }} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "#D98E7A" }} />
              <h3 className="font-serif text-sm uppercase tracking-wider" style={{ color: "#D98E7A" }}>
                {t("Утренняя аффирмация", "Morning affirmation", "प्रातः काल का वचन")}
              </h3>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="p-1.5 rounded-lg transition-all hover:scale-105"
              style={{ background: "rgba(11,11,15,0.6)", border: "1px solid rgba(217,142,122,0.3)" }}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} style={{ color: "#D98E7A" }} />
            </button>
          </div>

          {/* Loading */}
          {(loading || signLoading) && (
            <div className="py-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#D98E7A" }} />
              <p className="mt-2 text-[11px] font-serif italic" style={{ color: "#F5F0E860" }}>
                {t("Звёзды шепчут...", "Stars whispering...", "तारे फुसफुसा रहे हैं...")}
              </p>
            </div>
          )}

          {/* Affirmation */}
          <AnimatePresence mode="wait">
            {data && !loading && (
              <motion.div
                key={data.date + data.sign}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                {/* Large decorative quote mark */}
                <div className="text-4xl font-serif leading-none mb-2" style={{ color: "#D98E7A40" }}>"</div>

                {/* Affirmation text */}
                <p className="font-serif text-lg md:text-xl leading-relaxed italic" style={{ color: "#F5F0E8" }}>
                  {data.affirmation[locale] || data.affirmation.en}
                </p>

                {/* Closing quote */}
                <div className="text-4xl font-serif leading-none mt-2" style={{ color: "#D98E7A40" }}>"</div>

                {/* Sign + traits */}
                <div className="mt-3 flex items-center justify-center gap-2 text-[10px]">
                  <span style={{ color: "#D98E7A" }}>{data.sign}</span>
                  <span style={{ color: "#F5F0E830" }}>·</span>
                  <span style={{ color: "#F5F0E860" }}>{data.traits.element}</span>
                  <span style={{ color: "#F5F0E830" }}>·</span>
                  <span style={{ color: "#F5F0E860" }}>{data.traits.gift}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealAffirmationPanel;
