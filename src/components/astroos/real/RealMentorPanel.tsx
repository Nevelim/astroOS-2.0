"use client";
/**
 * RealMentorPanel — панель AI-наставника с реальным ZAI SDK.
 * WebSocket streaming через chat-service (:3003), fallback на REST.
 * 4 голоса, 2 a.m. Companion, cited transits, quota enforcement.
 *
 * Clean Architecture: Interface Adapter, использует useMentorChat hook.
 * Hades 2 визуал: glow, ornamental borders, streaming cursor.
 */
import { useState } from "react";
import { GlassCard, CosmicButton, FadeIn } from "../ui";
import { useMentorChat } from "@/lib/astroos/real/useMentorChat";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Moon, Quote, AlertCircle, Loader2 } from "lucide-react";

type Voice = "calm" | "witty" | "professional" | "trauma";

const VOICE_META: Record<Voice, { label: { ru: string; en: string; hi: string }; icon: string; color: string }> = {
  calm: { label: { ru: "Спокойный", en: "Calm", hi: "शांत" }, icon: "☾", color: "#5BB89C" },
  witty: { label: { ru: "Остроумный", en: "Witty", hi: "चतुर" }, icon: "✦", color: "#E8B86D" },
  professional: { label: { ru: "Профессиональный", en: "Professional", hi: "पेशेवर" }, icon: "◈", color: "#5E8FA8" },
  trauma: { label: { ru: "Бережный", en: "Trauma-sensitive", hi: "संवेदनशील" }, icon: "♥", color: "#D98E7A" },
};

export function RealMentorPanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [voice, setVoice] = useState<Voice>("calm");
  const [twoAm, setTwoAm] = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, error, quota, sendMessage } = useMentorChat({
    voice,
    twoAmCompanion: twoAm,
    locale,
  });

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  return (
    <FadeIn>
      <GlassCard variant={twoAm ? "rose" : "jade"} className="p-5" ornamental glow>
        {/* Header — voice selector + 2 a.m. toggle */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif text-lg flex items-center gap-2" style={{ color: "#F5F0E8" }}>
              <Sparkles className="w-4 h-4" style={{ color: twoAm ? "#D98E7A" : "#5BB89C" }} />
              {t("Космический наставник", "Cosmic Mentor", "खगोलीय गुरु")}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#F5F0E860" }}>
              {t("ZAI SDK · real streaming · 4 голоса", "ZAI SDK · real streaming · 4 voices", "ZAI SDK · वास्तविक स्ट्रीमिंग · 4 आवाज़ें")}
            </p>
          </div>
          <button
            onClick={() => setTwoAm(!twoAm)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              twoAm ? "text-[#0B0B0F]" : "text-[#F5F0E8]/70"
            }`}
            style={twoAm
              ? { background: "#D98E7A", boxShadow: "0 0 12px rgba(217,142,122,0.5)" }
              : { background: "rgba(11,11,15,0.6)", border: "1px solid rgba(217,142,122,0.3)" }}
          >
            <Moon className="w-3 h-3" />
            {twoAm ? t("2 a.m. вкл", "2 a.m. on", "2 a.m. चालू") : t("2 a.m.", "2 a.m.", "2 a.m.")}
          </button>
        </div>

        {/* Voice pills */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {(Object.keys(VOICE_META) as Voice[]).map((v) => {
            const meta = VOICE_META[v];
            const active = voice === v;
            return (
              <button
                key={v}
                onClick={() => setVoice(v)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 ${
                  active ? "scale-105" : "opacity-60 hover:opacity-90"
                }`}
                style={{
                  background: active ? `${meta.color}25` : "rgba(11,11,15,0.5)",
                  border: `1px solid ${active ? meta.color : "#F5F0E820"}`,
                  color: meta.color,
                  boxShadow: active ? `0 0 10px ${meta.color}40` : "none",
                }}
              >
                <span>{meta.icon}</span>
                {meta.label[locale]}
              </button>
            );
          })}
        </div>

        {/* Quota bar */}
        {quota && (
          <div className="mb-3 flex items-center gap-2 text-[10px]">
            <span style={{ color: "#F5F0E860" }}>{t("Квота", "Quota", "कोटा")}:</span>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#F5F0E815" }}>
              <motion.div
                className="h-full"
                style={{ background: quota.remaining > 0 ? "#5BB89C" : "#D98E7A" }}
                initial={{ width: 0 }}
                animate={{ width: `${(quota.used / quota.total) * 100}%` }}
              />
            </div>
            <span className="font-mono" style={{ color: quota.remaining > 0 ? "#5BB89C" : "#D98E7A" }}>
              {quota.used}/{quota.total}
            </span>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto mb-3 pr-1 custom-scroll">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-block"
              >
                <Sparkles className="w-8 h-8" style={{ color: twoAm ? "#D98E7A" : "#5BB89C" }} />
              </motion.div>
              <p className="mt-3 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
                {t("Спросите о чём-нибудь...", "Ask anything...", "कुछ भी पूछें...")}
              </p>
              <p className="text-[11px] mt-1" style={{ color: "#F5F0E860" }}>
                {twoAm
                  ? t("Тихий голос, мягкий свет. Я здесь.", "Quiet voice, soft light. I'm here.", "धीमी आवाज़, कोमक प्रकाश। मैं यहाँ हूँ।")
                  : t("Цитирует реальные транзиты. Помнит вас.", "Cites real transits. Remembers you.", "वास्तविक ट्रांज़िट उद्धृत करता है। आपको याद रखता है।")}
              </p>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
                  }`}
                  style={msg.role === "user"
                    ? { background: "#E8B86D20", border: "1px solid #E8B86D40", color: "#F5F0E8" }
                    : { background: "rgba(91,184,156,0.1)", border: "1px solid #5BB89C30", color: "#F5F0E8" }}
                >
                  {msg.role === "assistant" && msg.streaming && msg.content === "" ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#5BB89C" }} />
                      <span className="text-[11px]" style={{ color: "#5BB89C" }}>
                        {t("Думаю...", "Thinking...", "सोच रहा हूँ...")}
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                        {msg.streaming && (
                          <span className="inline-block w-1.5 h-3 ml-0.5 animate-pulse" style={{ background: "#5BB89C" }} />
                        )}
                      </p>
                      {msg.citedTransits && msg.citedTransits.length > 0 && (
                        <div className="mt-2 pt-2 border-t flex flex-wrap gap-1" style={{ borderColor: "#5BB89C20" }}>
                          {msg.citedTransits.map((tr, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"
                              style={{ background: "#E8B86D15", color: "#E8B86D" }}>
                              <Quote className="w-2.5 h-2.5" />
                              {tr.description}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-2 p-2 rounded text-[11px] flex items-center gap-1.5" style={{ background: "#D98E7A15", color: "#D98E7A" }}>
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t("Напишите наставнику...", "Write to your mentor...", "अपने गुरु को लिखें...")}
            rows={1}
            className="flex-1 bg-transparent rounded-xl px-3 py-2 text-sm resize-none focus:outline-none"
            style={{
              background: "rgba(11,11,15,0.6)",
              border: "1px solid #F5F0E820",
              color: "#F5F0E8",
              minHeight: 40,
              maxHeight: 120,
            }}
          />
          <CosmicButton
            variant="gold"
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="!px-3 !py-2.5"
          >
            <Send className="w-4 h-4" />
          </CosmicButton>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealMentorPanel;
