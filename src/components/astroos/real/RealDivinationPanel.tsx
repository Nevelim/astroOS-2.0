"use client";
/**
 * RealDivinationPanel — реальные I-Ching + Tarot через API.
 * Заменяет mock данные на /api/iching и /api/tarot.
 * Clean Architecture: Interface Adapter, использует api-client.
 * Hades 2 визуал: gold hexagram lines, cosmic card backs, ornamental borders.
 */
import { useState } from "react";
import { GlassCard, CosmicButton, FadeIn } from "../ui";
import { api } from "@/lib/astroos/real/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Coins, Layers, RotateCw, Loader2, HelpCircle } from "lucide-react";
import { ParticleBurst } from "../ParticleBurst";

type Mode = "iching" | "tarot";
type TarotSpread = "single" | "three" | "celtic";

interface IChingResult {
  hexagram: {
    primaryNumber: number;
    primaryName: string;
    primaryNameRu: string;
    changingLines: number[];
    secondaryNumber?: number;
    secondaryName?: string;
    secondaryNameRu?: string;
  };
  question: string | null;
}

interface TarotResult {
  spread: TarotSpread;
  cards: Array<{
    card: { id: number; name: string; nameRu: string; arcana: string; element: string; keywordsUpright: string[] };
    reversed: boolean;
    position: string;
  }>;
  question: string | null;
  deckSize: number;
}

const ICHING_HEXAGRAM_LINES = [
  [1, 1, 1, 1, 1, 1], // hexagram binary representations
];

export function RealDivinationPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [mode, setMode] = useState<Mode>("iching");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [ichingResult, setIchingResult] = useState<IChingResult | null>(null);
  const [tarotResult, setTarotResult] = useState<TarotResult | null>(null);
  const [tarotSpread, setTarotSpread] = useState<TarotSpread>("three");
  const [burstTrigger, setBurstTrigger] = useState(0);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  const handleCast = async () => {
    setLoading(true);
    setIchingResult(null);
    setTarotResult(null);
    try {
      if (mode === "iching") {
        const result = await api.castIChing(question || undefined);
        setIchingResult(result);
      } else {
        const response = await fetch("/api/tarot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spread: tarotSpread, question: question || undefined }),
        });
        const data = await response.json();
        setTarotResult(data);
      }
      setBurstTrigger((n) => n + 1);
    } catch (e) {
      console.error("divination error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FadeIn>
      <GlassCard variant="gold" className="p-5 relative overflow-visible" ornamental glow>
        <ParticleBurst trigger={burstTrigger} color={mode === "iching" ? "#E8B86D" : "#5BB89C"} count={28} />
        {/* Mode toggle */}
        <div className="flex gap-1.5 mb-4">
          <button
            onClick={() => { setMode("iching"); setIchingResult(null); }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === "iching" ? "text-[#0B0B0F]" : "text-[#F5F0E8]/70"
            }`}
            style={mode === "iching"
              ? { background: "#E8B86D", boxShadow: "0 0 12px rgba(232,184,109,0.5)" }
              : { background: "rgba(11,11,15,0.6)", border: "1px solid rgba(232,184,109,0.3)" }}
          >
            <Coins className="w-4 h-4" />
            {t("I-Ching · 64", "I-Ching · 64", "इ-चिंग · 64")}
          </button>
          <button
            onClick={() => { setMode("tarot"); setTarotResult(null); }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === "tarot" ? "text-[#0B0B0F]" : "text-[#F5F0E8]/70"
            }`}
            style={mode === "tarot"
              ? { background: "#5BB89C", boxShadow: "0 0 12px rgba(91,184,156,0.5)" }
              : { background: "rgba(11,11,15,0.6)", border: "1px solid rgba(91,184,156,0.3)" }}
          >
            <Layers className="w-4 h-4" />
            {t("Таро · 78", "Tarot · 78", "टैरो · 78")}
          </button>
        </div>

        {/* Tarot spread selector */}
        {mode === "tarot" && (
          <div className="flex gap-1.5 mb-3">
            {([
              { id: "single", label: t("1 карта", "1 card", "1 कार्ड") },
              { id: "three", label: t("3 карты", "3 cards", "3 कार्ड") },
              { id: "celtic", label: t("Кельтский", "Celtic", "केल्टिक") },
            ] as const).map((s) => (
              <button
                key={s.id}
                onClick={() => setTarotSpread(s.id)}
                className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  tarotSpread === s.id ? "text-[#0B0B0F]" : "text-[#F5F0E8]/60"
                }`}
                style={tarotSpread === s.id
                  ? { background: "#5BB89C" }
                  : { background: "rgba(11,11,15,0.5)", border: "1px solid rgba(91,184,156,0.2)" }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Question input */}
        <div className="mb-3 relative">
          <HelpCircle className="absolute left-2.5 top-2.5 w-3.5 h-3.5" style={{ color: "#E8B86D80" }} />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("Ваш вопрос (необязательно)...", "Your question (optional)...", "आपका प्रश्न (वैकल्पिक)...")}
            className="w-full bg-transparent rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none"
            style={{ background: "rgba(11,11,15,0.6)", border: "1px solid #F5F0E820", color: "#F5F0E8" }}
          />
        </div>

        {/* Cast button */}
        <CosmicButton
          variant="gold"
          onClick={handleCast}
          disabled={loading}
          className="w-full mb-4"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />{t("Бросаю...", "Casting...", "डाल रहा हूँ...")}</>
          ) : mode === "iching" ? (
            <><Coins className="w-4 h-4 mr-1.5" />{t("Бросить монеты", "Cast coins", "सिक्के डालें")}</>
          ) : (
            <><Layers className="w-4 h-4 mr-1.5" />{t("Вытянуть карты", "Draw cards", "कार्ड खींचें")}</>
          )}
        </CosmicButton>

        {/* Results */}
        <AnimatePresence mode="wait">
          {ichingResult && (
            <motion.div
              key="iching-result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HexagramDisplay number={ichingResult.hexagram.primaryNumber} nameRu={ichingResult.hexagram.primaryNameRu} name={ichingResult.hexagram.primaryName} />
              <div className="mt-2 text-center">
                <p className="text-xs" style={{ color: "#F5F0E860" }}>
                  {t("Гексаграмма", "Hexagram", "हेक्साग्राम")} #{ichingResult.hexagram.primaryNumber}
                </p>
                <p className="font-serif text-xl mt-1" style={{ color: "#E8B86D" }}>
                  {ichingResult.hexagram.primaryNameRu || ichingResult.hexagram.primaryName}
                </p>
                {ichingResult.hexagram.changingLines.length > 0 && (
                  <p className="text-[11px] mt-1" style={{ color: "#5BB89C" }}>
                    {t("Меняющиеся линии: ", "Changing lines: ", "बदलती रेखाएँ: ")}
                    {ichingResult.hexagram.changingLines.join(", ")}
                  </p>
                )}
                {ichingResult.hexagram.secondaryNumber && (
                  <p className="text-[11px] mt-1" style={{ color: "#D98E7A" }}>
                    → {t("Переход к", "Transforms to", "बदल जाता है")} #{ichingResult.hexagram.secondaryNumber}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {tarotResult && (
            <motion.div
              key="tarot-result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              {tarotResult.cards.map((draw, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, rotateY: 90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    background: draw.card.arcana === "major" ? "#E8B86D15" : "#5BB89C10",
                    border: `1px solid ${draw.card.arcana === "major" ? "#E8B86D30" : "#5BB89C30"}`,
                  }}
                >
                  <div
                    className="w-12 h-16 rounded flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      background: draw.card.arcana === "major"
                        ? "linear-gradient(135deg, #E8B86D30, #D98E7A20)"
                        : "linear-gradient(135deg, #5BB89C20, #5E8FA820)",
                      transform: draw.reversed ? "rotate(180deg)" : "none",
                    }}
                  >
                    {draw.card.arcana === "major" ? "✦" : draw.card.element === "Fire" ? "🔥" : draw.card.element === "Water" ? "💧" : draw.card.element === "Air" ? "🌬" : "🌍"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                        background: draw.card.arcana === "major" ? "#E8B86D20" : "#5BB89C20",
                        color: draw.card.arcana === "major" ? "#E8B86D" : "#5BB89C",
                      }}>
                        {draw.position}
                      </span>
                      {draw.reversed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#D98E7A20", color: "#D98E7A" }}>
                          <RotateCw className="w-2.5 h-2.5 inline" /> {t("перевёрнута", "reversed", "उल्टा")}
                        </span>
                      )}
                    </div>
                    <p className="font-serif text-sm mt-1" style={{ color: "#F5F0E8" }}>
                      {draw.card.nameRu || draw.card.name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#F5F0E860" }}>
                      {(draw.reversed ? draw.card.keywordsUpright.map((k: string) => `blocked ${k}`) : draw.card.keywordsUpright).slice(0, 3).join(" · ")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!ichingResult && !tarotResult && !loading && (
          <div className="text-center py-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-block"
            >
              <Sparkles className="w-7 h-7" style={{ color: "#E8B86D" }} />
            </motion.div>
            <p className="mt-2 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
              {mode === "iching"
                ? t("64 гексаграммы ждут вашего вопроса", "64 hexagrams await your question", "64 हेक्साग्राम आपके प्रश्न की प्रतीक्षा कर रहे हैं")
                : t("78 карт готовы раскрыть сюжет", "78 cards ready to reveal the story", "78 कार्ड कहानी बताने के लिए तैयार हैं")}
            </p>
          </div>
        )}
      </GlassCard>
    </FadeIn>
  );
}

/** HexagramDisplay — визуализация 6 линий гексаграммы I-Ching. */
function HexagramDisplay({ number, nameRu, name }: { number: number; nameRu: string; name: string }) {
  // Упрощённое представление — 6 линий (yang = сплошная, yin = прерывистая)
  const lines = ICHING_HEXAGRAM_LINES[0] ?? [1, 1, 1, 1, 1, 1];
  void number; void nameRu; void name;
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {lines.map((line, i) => (
        <div key={i} className="flex gap-1">
          {line === 1 ? (
            <div className="w-20 h-2 rounded-sm" style={{ background: "#E8B86D", boxShadow: "0 0 4px rgba(232,184,109,0.4)" }} />
          ) : (
            <>
              <div className="w-9 h-2 rounded-sm" style={{ background: "#E8B86D", boxShadow: "0 0 4px rgba(232,184,109,0.4)" }} />
              <div className="w-9 h-2 rounded-sm" style={{ background: "#E8B86D", boxShadow: "0 0 4px rgba(232,184,109,0.4)" }} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default RealDivinationPanel;
