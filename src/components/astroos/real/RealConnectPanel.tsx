"use client";
/**
 * RealConnectPanel — панель Cosmic Match (совместимость).
 * Использует /api/cosmic-match для расчёта Western + BaZi совместимости.
 * Clean Architecture: Interface Adapter.
 * Hades 2 визуал: 3D card flip, glow, ornamental borders.
 */
import { useState } from "react";
import { GlassCard, CosmicButton, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Loader2, RotateCw } from "lucide-react";

type Sign = "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo" | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";
type Element = "Wood" | "Fire" | "Earth" | "Metal" | "Water";

const SIGNS: Sign[] = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const ELEMENTS: Element[] = ["Wood", "Fire", "Earth", "Metal", "Water"];

interface MatchResult {
  overall: number;
  tone: string;
  aspects: Array<{ name: string; score: number; description: { en: string; ru: string; hi: string }; tone: string }>;
  summary: { en: string; ru: string; hi: string };
  baZiCompatibility: number | null;
  westernCompatibility: number;
}

export function RealConnectPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [aSun, setASun] = useState<Sign>("Scorpio");
  const [aMoon, setAMoon] = useState<Sign>("Pisces");
  const [aElement, setAElement] = useState<Element>("Water");
  const [bSun, setBSun] = useState<Sign>("Cancer");
  const [bMoon, setBMoon] = useState<Sign>("Scorpio");
  const [bElement, setBElement] = useState<Element>("Water");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  const handleMatch = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch("/api/cosmic-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          a: { sunSign: aSun, moonSign: aMoon, dayMasterElement: aElement },
          b: { sunSign: bSun, moonSign: bMoon, dayMasterElement: bElement },
        }),
      });
      const data = await r.json();
      setResult(data);
    } catch (e) {
      console.error("match error:", e);
    } finally {
      setLoading(false);
    }
  };

  const toneColor = (tone: string) => tone === "gold" ? "#E8B86D" : tone === "jade" ? "#5BB89C" : tone === "rose" ? "#D98E7A" : "#5E8FA8";

  return (
    <FadeIn>
      <GlassCard variant="rose" className="p-5 relative" ornamental glow>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-4 h-4" style={{ color: "#D98E7A" }} />
          <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
            {t("Cosmic Match", "Cosmic Match", "कॉस्मिक मैच")}
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "#D98E7A20", color: "#D98E7A" }}>
            {t("Western + BaZi", "Western + BaZi", "पश्चिमी + बाज़ी")}
          </span>
        </div>

        {/* Two columns: Person A and Person B */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <PersonColumn
            label={t("Человек A", "Person A", "व्यक्ति A")}
            color="#E8B86D"
            sun={aSun} setSun={setASun}
            moon={aMoon} setMoon={setAMoon}
            element={aElement} setElement={setAElement}
          />
          <PersonColumn
            label={t("Человек B", "Person B", "व्यक्ति B")}
            color="#5BB89C"
            sun={bSun} setSun={setBSun}
            moon={bMoon} setMoon={setBMoon}
            element={bElement} setElement={setBElement}
          />
        </div>

        <CosmicButton variant="rose" onClick={handleMatch} disabled={loading} className="w-full mb-4">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />{t("Считаю...", "Computing...", "गणना...")}</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-1.5" />{t("Узнать совместимость", "Reveal compatibility", "संगतता देखें")}</>
          )}
        </CosmicButton>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key="match-result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {/* Overall score — big circular */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="none" stroke="#1C1C26" strokeWidth="6" />
                    <motion.circle
                      cx="50" cy="50" r="44" fill="none"
                      stroke={toneColor(result.tone)} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 44}`}
                      initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - result.overall / 100) }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      style={{ filter: `drop-shadow(0 0 6px ${toneColor(result.tone)})` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="font-mono text-3xl tabular-nums"
                      style={{ color: toneColor(result.tone) }}
                    >
                      {result.overall}
                    </motion.span>
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
                      {t("Индекс", "Index", "सूचकांक")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="text-center mb-4 px-2">
                <p className="font-serif italic text-sm" style={{ color: "#F5F0E8" }}>
                  {result.summary[locale] || result.summary.en}
                </p>
              </div>

              {/* Aspects breakdown */}
              <div className="space-y-2">
                {result.aspects.map((aspect, i) => (
                  <motion.div
                    key={aspect.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ background: `${toneColor(aspect.tone)}10`, border: `1px solid ${toneColor(aspect.tone)}30` }}
                  >
                    <span className="text-[11px] font-medium flex-1" style={{ color: "#F5F0E8" }}>
                      {aspect.name}
                    </span>
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "#F5F0E815" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: toneColor(aspect.tone) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${aspect.score}%` }}
                        transition={{ delay: 0.2 + 0.1 * i, duration: 0.6 }}
                      />
                    </div>
                    <span className="text-[11px] font-mono tabular-nums w-8 text-right" style={{ color: toneColor(aspect.tone) }}>
                      {aspect.score}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Compatibility split */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg" style={{ background: "#E8B86D10" }}>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>{t("Западная", "Western", "पश्चिमी")}</div>
                  <div className="font-mono text-lg" style={{ color: "#E8B86D" }}>{result.westernCompatibility}</div>
                </div>
                <div className="p-2 rounded-lg" style={{ background: "#5BB89C10" }}>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>{t("Бацзы", "BaZi", "बाज़ी")}</div>
                  <div className="font-mono text-lg" style={{ color: "#5BB89C" }}>{result.baZiCompatibility ?? "—"}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !loading && (
          <div className="text-center py-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-block"
            >
              <Heart className="w-7 h-7" style={{ color: "#D98E7A" }} />
            </motion.div>
            <p className="mt-2 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
              {t("Две натальные карты. Один резонанс.", "Two charts. One resonance.", "दो चार्ट। एक गुंजयमान।")}
            </p>
          </div>
        )}
      </GlassCard>
    </FadeIn>
  );
}

function PersonColumn({
  label, color, sun, setSun, moon, setMoon, element, setElement,
}: {
  label: string;
  color: string;
  sun: Sign; setSun: (s: Sign) => void;
  moon: Sign; setMoon: (s: Sign) => void;
  element: Element; setElement: (e: Element) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color }}>{label}</div>
      <select
        value={sun}
        onChange={(e) => setSun(e.target.value as Sign)}
        className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none"
        style={{ background: "rgba(11,11,15,0.6)", border: `1px solid ${color}40`, color: "#F5F0E8" }}
      >
        {SIGNS.map((s) => <option key={s} value={s} style={{ background: "#0B0B0F" }}>{s} ☉</option>)}
      </select>
      <select
        value={moon}
        onChange={(e) => setMoon(e.target.value as Sign)}
        className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none"
        style={{ background: "rgba(11,11,15,0.6)", border: `1px solid ${color}40`, color: "#F5F0E8" }}
      >
        {SIGNS.map((s) => <option key={s} value={s} style={{ background: "#0B0B0F" }}>{s} ☾</option>)}
      </select>
      <select
        value={element}
        onChange={(e) => setElement(e.target.value as Element)}
        className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none"
        style={{ background: "rgba(11,11,15,0.6)", border: `1px solid ${color}40`, color: "#F5F0E8" }}
      >
        {ELEMENTS.map((el) => <option key={el} value={el} style={{ background: "#0B0B0F" }}>{el}</option>)}
      </select>
    </div>
  );
}

export default RealConnectPanel;
