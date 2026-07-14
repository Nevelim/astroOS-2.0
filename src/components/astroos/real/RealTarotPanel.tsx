"use client";
/**
 * RealTarotPanel — real tarot card draw with cosmic SVG card imagery.
 * Uses /api/tarot (crypto-random Fisher-Yates shuffle, 78-card RWS deck).
 * Hades 2 visual: animated card flip, ornate borders, suit-coded colors.
 */
import { useState, useCallback } from "react";
import { GlassCard, Pill, CosmicButton, FadeIn } from "../ui";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RotateCw, Eye, EyeOff } from "lucide-react";

type Locale = "ru" | "en" | "hi";

interface TarotCardData {
  id: number;
  name: string;
  nameRu: string;
  arcana: "major" | "minor";
  suit: "wands" | "cups" | "swords" | "pentacles" | null;
  rank: number | string;
  keywordsUpright: string[];
  keywordsReversed: string[];
  element: "Fire" | "Water" | "Air" | "Earth" | "Spirit";
}

interface DrawnCard {
  card: TarotCardData;
  reversed: boolean;
  position: string;
}

interface TarotResult {
  spread: string;
  cards: DrawnCard[];
  question: string | null;
  deckSize: number;
}

const SUIT_SYMBOLS: Record<string, string> = {
  wands: "🜂", // Fire triangle
  cups: "🜄",  // Water triangle (inverted)
  swords: "🜁", // Air triangle (up, with line)
  pentacles: "🜃", // Earth triangle (down, with line)
};

const SUIT_COLORS: Record<string, string> = {
  wands: "#EF4444",     // Fire — red
  cups: "#60A5FA",      // Water — blue
  swords: "#FBBF24",    // Air — yellow
  pentacles: "#5BB89C", // Earth — green
  Spirit: "#E8B86D",    // Major arcana — gold
};

const ELEMENT_GLYPHS: Record<string, string> = {
  Fire: "🜂", Water: "🜄", Air: "🜁", Earth: "🜃", Spirit: "✦",
};

const MAJOR_ARCANA_GLYPHS: Record<string, string> = {
  "The Fool": "0", "The Magician": "I", "The High Priestess": "II",
  "The Empress": "III", "The Emperor": "IV", "The Hierophant": "V",
  "The Lovers": "VI", "The Chariot": "VII", "Strength": "VIII",
  "The Hermit": "IX", "Wheel of Fortune": "X", "Justice": "XI",
  "The Hanged Man": "XII", "Death": "XIII", "Temperance": "XIV",
  "The Devil": "XV", "The Tower": "XVI", "The Star": "XVII",
  "The Moon": "XVIII", "The Sun": "XIX", "Judgement": "XX", "The World": "XXI",
};

const RANK_DISPLAY: Record<string, string> = {
  page: "P", knight: "N", queen: "Q", king: "K",
};

const SPREADS = [
  { key: "single", label: { en: "Single Card", ru: "Одна карта", hi: "एक कार्ड" }, count: 1, desc: { en: "Quick guidance", ru: "Быстрый совет", hi: "त्वरित मार्गदर्शन" } },
  { key: "three", label: { en: "Past · Present · Future", ru: "Прошлое · Настоящее · Будущее", hi: "अतीत · वर्तमान · भविष्य" }, count: 3, desc: { en: "Timeline spread", ru: "Линия времени", hi: "समय रेखा" } },
  { key: "celtic", label: { en: "Celtic Cross · 10 cards", ru: "Кельтский крест · 10 карт", hi: "केल्टिक क्रॉस · 10 कार्ड" }, count: 10, desc: { en: "Deep analysis", ru: "Глубокий анализ", hi: "गहन विश्लेषण" } },
];

const SPREAD_POSITION_LABELS: Record<string, { en: string; ru: string; hi: string }[]> = {
  single: [{ en: "Present", ru: "Настоящее", hi: "वर्तमान" }],
  three: [
    { en: "Past", ru: "Прошлое", hi: "अतीत" },
    { en: "Present", ru: "Настоящее", hi: "वर्तमान" },
    { en: "Future", ru: "Будущее", hi: "भविष्य" },
  ],
  celtic: [
    { en: "Heart of matter", ru: "Суть вопроса", hi: "मामले का मूल" },
    { en: "Challenge", ru: "Вызов", hi: "चुनौती" },
    { en: "Foundation", ru: "Фундамент", hi: "नींव" },
    { en: "Recent past", ru: "Недавнее прошлое", hi: "हाल का अतीत" },
    { en: "Possible outcome", ru: "Возможный итог", hi: "संभावित परिणाम" },
    { en: "Near future", ru: "Ближайшее будущее", hi: "निकट भविष्य" },
    { en: "Self", ru: "Вы", hi: "स्वयं" },
    { en: "Environment", ru: "Окружение", hi: "परिवेश" },
    { en: "Hopes & Fears", ru: "Надежды и страхи", hi: "आशा और डर" },
    { en: "Final outcome", ru: "Итог", hi: "अंतिम परिणाम" },
  ],
};

function t(locale: Locale, ru: string, en: string, hi: string) {
  return locale === "ru" ? ru : locale === "hi" ? hi : en;
}

/* ─── SVG Tarot Card ─── */
function TarotCardSVG({ card, reversed, size = "normal" }: { card: TarotCardData; reversed: boolean; size?: "normal" | "compact" }) {
  const isMajor = card.arcana === "major";
  const color = isMajor ? SUIT_COLORS.Spirit : (card.suit ? SUIT_COLORS[card.suit] : "#E8B86D");
  const suitSymbol = card.suit ? SUIT_SYMBOLS[card.suit] : "✦";
  const majorGlyph = isMajor ? (MAJOR_ARCANA_GLYPHS[card.name] ?? "?") : "";
  const rankDisplay = typeof card.rank === "string" ? RANK_DISPLAY[card.rank] : String(card.rank);

  const w = size === "compact" ? 80 : 120;
  const h = size === "compact" ? 130 : 190;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="max-w-full" style={{ transform: reversed ? "rotate(180deg)" : "none", transition: "transform 0.6s ease" }}>
      <defs>
        <linearGradient id={`card-bg-${card.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1C1C26" />
          <stop offset="50%" stopColor="#16161D" />
          <stop offset="100%" stopColor="#0B0B0F" />
        </linearGradient>
        <radialGradient id={`card-glow-${card.id}`}>
          <stop offset="0%" stopColor={`${color}30`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Card background */}
      <rect x="2" y="2" width={w - 4} height={h - 4} rx="8" fill={`url(#card-bg-${card.id})`} stroke={color} strokeWidth="1.5" />

      {/* Inner border */}
      <rect x="6" y="6" width={w - 12} height={h - 12} rx="5" fill="none" stroke={`${color}40`} strokeWidth="0.5" />

      {/* Corner glyphs */}
      <text x="10" y="16" fontSize={size === "compact" ? "8" : "10"} fill={color} style={{ fontFamily: "serif" }}>
        {isMajor ? majorGlyph : rankDisplay}
      </text>
      <text x={w - 10} y={h - 6} fontSize={size === "compact" ? "8" : "10"} fill={color} textAnchor="end" style={{ fontFamily: "serif" }}>
        {isMajor ? majorGlyph : rankDisplay}
      </text>

      {/* Central glow */}
      <circle cx={w / 2} cy={h / 2} r={w * 0.35} fill={`url(#card-glow-${card.id})`} />

      {/* Central symbol */}
      <text x={w / 2} y={h / 2 - 5} fontSize={size === "compact" ? "28" : "42"} fill={color}
        textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "serif" }}>
        {isMajor ? majorGlyph : suitSymbol}
      </text>

      {/* Card name (compact only shows rank) */}
      {!isMajor && (
        <text x={w / 2} y={h - 18} fontSize={size === "compact" ? "7" : "9"} fill={`${color}CC`}
          textAnchor="middle" style={{ fontFamily: "serif" }}>
          {typeof card.rank === "string" ? card.rank.toUpperCase() : `Rank ${card.rank}`}
        </text>
      )}

      {/* Reversed indicator (small mark, not rotated with card) */}
      {reversed && (
        <g style={{ transform: "rotate(180deg)", transformOrigin: "center" }}>
          <circle cx={w / 2} cy={10} r="3" fill="#D98E7A" opacity="0.6" />
        </g>
      )}

      {/* Ornamental corners */}
      <path d={`M 2 8 L 2 2 L 8 2`} fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
      <path d={`M ${w - 2} 8 L ${w - 2} 2 L ${w - 8} 2`} fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
      <path d={`M 2 ${h - 8} L 2 ${h - 2} L 8 ${h - 2}`} fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
      <path d={`M ${w - 2} ${h - 8} L ${w - 2} ${h - 2} L ${w - 8} ${h - 2}`} fill="none" stroke={color} strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

/* ─── Main Component ─── */
export function RealTarotPanel({ locale }: { locale: Locale }) {
  const [selectedSpread, setSelectedSpread] = useState<string>("three");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<TarotResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [allRevealed, setAllRevealed] = useState(false);

  const handleDraw = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setRevealedCards(new Set());
    setAllRevealed(false);
    try {
      const r = await fetch("/api/tarot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spread: selectedSpread,
          question: question.trim() || undefined,
        }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      console.error("tarot draw error:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedSpread, question]);

  const revealCard = (idx: number) => {
    setRevealedCards(prev => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const revealAll = () => {
    if (!result) return;
    setRevealedCards(new Set(result.cards.map((_, i) => i)));
    setAllRevealed(true);
  };

  const positions = result ? SPREAD_POSITION_LABELS[result.spread] ?? [] : [];

  return (
    <FadeIn>
      <GlassCard variant="rose" className="p-5 relative astro-card-sheen" ornamental glow>
        {/* Ambient glow */}
        <div className="astro-aura" />
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none astro-breathing" style={{
          background: "radial-gradient(circle, rgba(217,142,122,0.1) 0%, transparent 70%)",
        }} />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: "#D98E7A" }} />
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t(locale, "Таро · 78 карт", "Tarot · 78 Cards", "टैरो · 78 कार्ड")}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "#D98E7A20", color: "#D98E7A" }}>
              {t(locale, "crypto-random", "crypto-random", "क्रिप्टो-यादृच्छिक")}
            </span>
          </div>

          {/* Spread selector */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {SPREADS.map(s => {
              const active = selectedSpread === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => { setSelectedSpread(s.key); setResult(null); }}
                  className={`rounded-lg border p-2.5 text-left transition-all ${
                    active
                      ? "border-[#D98E7A]/50 bg-[#D98E7A]/10"
                      : "border-[#2A2A35] bg-[#0B0B0F]/60 hover:border-[#9A9AA8]/40"
                  }`}
                >
                  <div className="text-[11px] font-medium" style={{ color: active ? "#D98E7A" : "#F5F0E8" }}>
                    {t(locale, s.label.ru, s.label.en, s.label.hi)}
                  </div>
                  <div className="text-[9px] text-[#8A8A96] mt-0.5">
                    {s.count} {t(locale, "карт", "cards", "कार्ड")} · {t(locale, s.desc.ru, s.desc.en, s.desc.hi)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Question input */}
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-1 block">
              {t(locale, "Ваш вопрос (необязательно)", "Your question (optional)", "आपका प्रश्न (वैकल्पिक)")}
            </label>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              maxLength={500}
              className="astro-input-cosmic w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2 text-[13px] text-[#F5F0E8] outline-none transition-colors focus:border-[#D98E7A]/50"
              placeholder={t(locale, "Что мне нужно знать?", "What do I need to know?", "मुझे क्या जानना चाहिए?")}
            />
          </div>

          {/* Draw button */}
          <CosmicButton variant="rose" onClick={handleDraw} disabled={loading} className="w-full mb-4">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />{t(locale, "Тасую колоду...", "Shuffling deck...", "कार्ड फेंट रहा हूँ...")}</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1.5" />{t(locale, "✦ Вытянуть карты", "✦ Draw cards", "✦ कार्ड खींचें")}</>
            )}
          </CosmicButton>

          {/* Results */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={`result-${result.cards.map(c => c.card.id).join("-")}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Reveal all button */}
                {!allRevealed && (
                  <div className="mb-3 flex justify-center">
                    <button
                      onClick={revealAll}
                      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border border-[#E8B86D]/30 bg-[#E8B86D]/5 text-[#E8B86D] hover:bg-[#E8B86D]/10 transition-all"
                    >
                      <Eye className="w-3 h-3" />
                      {t(locale, "Раскрыть все", "Reveal all", "सभी खोलें")}
                    </button>
                  </div>
                )}

                {/* Cards grid */}
                <div className={`grid gap-3 ${
                  result.spread === "single" ? "grid-cols-1 max-w-xs mx-auto" :
                  result.spread === "three" ? "md:grid-cols-3" :
                  "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                }`}>
                  {result.cards.map((drawn, i) => {
                    const isRevealed = revealedCards.has(i);
                    const posLabel = positions[i] ?? { en: drawn.position, ru: drawn.position, hi: drawn.position };
                    const color = drawn.card.arcana === "major" ? SUIT_COLORS.Spirit : (drawn.card.suit ? SUIT_COLORS[drawn.card.suit] : "#E8B86D");

                    return (
                      <motion.div
                        key={`card-${i}-${drawn.card.id}`}
                        initial={{ opacity: 0, y: 20, rotateY: 180 }}
                        animate={{ opacity: 1, y: 0, rotateY: 0 }}
                        transition={{ delay: i * 0.15, type: "spring", stiffness: 200, damping: 20 }}
                        className="flex flex-col items-center"
                      >
                        {/* Position label */}
                        <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-2 text-center">
                          {i + 1}. {t(locale, posLabel.ru, posLabel.en, posLabel.hi)}
                        </div>

                        {/* Card (clickable to reveal) */}
                        <button
                          onClick={() => revealCard(i)}
                          className="relative transition-transform hover:scale-105"
                          style={{ perspective: "1000px" }}
                        >
                          {!isRevealed ? (
                            // Card back
                            <div className="rounded-lg border border-[#D98E7A]/40 bg-gradient-to-br from-[#1C1C26] to-[#0B0B0F] flex items-center justify-center" style={{
                              width: result.spread === "celtic" ? 80 : 120,
                              height: result.spread === "celtic" ? 130 : 190,
                            }}>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                              >
                                <Sparkles className="w-6 h-6" style={{ color: "#D98E7A" }} />
                              </motion.div>
                            </div>
                          ) : (
                            // Card front
                            <motion.div
                              initial={{ rotateY: 180, opacity: 0 }}
                              animate={{ rotateY: 0, opacity: 1 }}
                              transition={{ duration: 0.6 }}
                              style={{ transformStyle: "preserve-3d" }}
                            >
                              <TarotCardSVG card={drawn.card} reversed={drawn.reversed} size={result.spread === "celtic" ? "compact" : "normal"} />
                            </motion.div>
                          )}
                        </button>

                        {/* Card info (only when revealed) */}
                        {isRevealed && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-2 text-center w-full"
                          >
                            <div className="font-serif text-[12px] font-medium leading-tight" style={{ color }}>
                              {t(locale, drawn.card.nameRu, drawn.card.name, drawn.card.name)}
                            </div>
                            <div className="text-[9px] mt-0.5" style={{ color: drawn.reversed ? "#D98E7A" : "#8A8A96" }}>
                              {drawn.reversed ? t(locale, "Перевёрнута", "Reversed", "उलटा") : t(locale, "Прямая", "Upright", "सीधा")}
                              {" · "}{drawn.card.arcana === "major" ? t(locale, "Старший аркан", "Major arcana", "प्रमुख अर्कना") : drawn.card.suit}
                            </div>
                            {/* Keywords */}
                            <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                              {(drawn.reversed ? drawn.card.keywordsReversed : drawn.card.keywordsUpright).slice(0, 3).map((kw, j) => (
                                <span key={j} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color: `${color}CC` }}>
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {!isRevealed && (
                          <div className="mt-2 text-[9px] text-[#8A8A96] flex items-center gap-1">
                            <EyeOff className="w-2.5 h-2.5" />
                            {t(locale, "Нажмите чтобы открыть", "Click to reveal", "खोलने के लिए क्लिक करें")}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Summary interpretation */}
                {allRevealed && result.cards.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-5 p-4 rounded-lg border border-[#D98E7A]/25 bg-[#D98E7A]/5"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-[#D98E7A] mb-2">
                      {t(locale, "Синтез расклада", "Spread synthesis", "स्प्रेड संश्लेषण")}
                    </div>
                    <p className="text-[12px] leading-relaxed text-[#9A9AA8]">
                      {result.spread === "three" && (
                        locale === "ru"
                          ? `Ваше прошлое («${result.cards[0].card.nameRu}») формирует настоящее («${result.cards[1].card.nameRu}»), которое ведёт к будущему («${result.cards[2].card.nameRu}»). Обратите внимание на перевёрнутые карты — они указывают на заблокированную энергию.`
                          : locale === "hi"
                          ? `आपका अतीत («${result.cards[0].card.name}») वर्तमान («${result.cards[1].card.name}») को आकार देता है, जो भविष्य («${result.cards[2].card.name}») की ओर ले जाता है। उलटे कार्ड अवरुद्ध ऊर्जा दिखाते हैं।`
                          : `Your past («${result.cards[0].card.name}») shapes the present («${result.cards[1].card.name}»), which leads to the future («${result.cards[2].card.name}»). Reversed cards indicate blocked energy.`
                      )}
                      {result.spread === "celtic" && (
                        locale === "ru"
                          ? `10 карт Кельтского креста раскрывают сложную картину: от сути вопроса («${result.cards[0].card.nameRu}») до финального итога («${result.cards[9].card.nameRu}»). Каждая позиция — отдельный аспект вашей ситуации.`
                          : locale === "hi"
                          ? `10 कार्ड केल्टिक क्रॉस जटिल चित्र प्रकट करते हैं: मामले के मूल («${result.cards[0].card.name}») से अंतिम परिणाम («${result.cards[9].card.name}») तक।`
                          : `The 10-card Celtic Cross reveals a complex picture: from the heart of the matter («${result.cards[0].card.name}») to the final outcome («${result.cards[9].card.name}»). Each position is a separate aspect of your situation.`
                      )}
                    </p>
                    {result.question && (
                      <div className="mt-2 text-[11px] italic text-[#8A8A96]">
                        {t(locale, "Ваш вопрос:", "Your question:", "आपका प्रश्न:")} «{result.question}»
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Deck info */}
                <div className="mt-3 text-center text-[10px] text-[#8A8A96]">
                  {t(locale, "Колода Райдера-Уэйта-Смита · 78 карт", "Rider-Waite-Smith deck · 78 cards", "राइडर-वेट-स्मिथ डेक · 78 कार्ड")}
                  {" · "}
                  {result.cards.filter(c => c.reversed).length} {t(locale, "перевёрнутых", "reversed", "उलटा")}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!result && !loading && (
            <div className="text-center py-8">
              <motion.div
                animate={{ rotateY: [0, 180, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Sparkles className="w-8 h-8" style={{ color: "#D98E7A" }} />
              </motion.div>
              <p className="mt-3 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
                {t(locale, "Колода тасуется честным crypto-random.", "Deck shuffled with honest crypto-random.", "डेक ईमानदार क्रिप्टो-यादृच्छिक से फेंटा.")}
              </p>
              <p className="mt-1 text-[11px] text-[#8A8A96]">
                {t(locale, "Выберите расклад и задайте вопрос", "Choose a spread and ask your question", "एक स्प्रेड चुनें और अपना प्रश्न पूछें")}
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealTarotPanel;
