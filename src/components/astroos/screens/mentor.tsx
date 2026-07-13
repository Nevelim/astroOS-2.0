"use client";

import { useState } from "react";
import {
  GlassCard,
  Pill,
  CosmicButton,
  SectionHeading,
  FadeIn,
  CosmicDivider,
} from "../ui";
import { SoftPaywall, SocialProof, ScarcityBadge } from "../growth-ui";
import { MENTOR_VOICES, MENTOR_CHAT } from "@/lib/astroos/data";
import { useI18n } from "@/lib/astroos/i18n-context";
import type { ScreenKey } from "@/lib/astroos/data";
import { motion, AnimatePresence } from "framer-motion";
import { RealMentorPanel } from "../real/RealMentorPanel";

export function MentorScreen({ onNavigate }: { onNavigate?: (k: ScreenKey) => void } = {}) {
  const { t, locale } = useI18n();
  const [companion, setCompanion] = useState(false);
  const [voice, setVoice] = useState("empowerment");
  const [input, setInput] = useState("");
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [paywallVisible, setPaywallVisible] = useState(false);
  // Progressive disclosure: voices start collapsed (name + short tag), expand on click
  const [expandedVoice, setExpandedVoice] = useState<string | null>(null);
  // Voice preview — uses Web Speech API (browser-native TTS) to speak the sample.
  // Real audio, no backend. Falls back gracefully if speechSynthesis unavailable.
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const speakSample = (text: string, voiceKey: string) => {
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel(); // stop any in-progress
      const utter = new SpeechSynthesisUtterance(text);
      // Map voice tone → speech rate/pitch for a distinct feel per voice
      const voiceProfiles: Record<string, { rate: number; pitch: number }> = {
        empowerment: { rate: 1.0, pitch: 1.05 },
        reflective: { rate: 0.85, pitch: 0.95 },
        playful: { rate: 1.1, pitch: 1.15 },
        pragmatic: { rate: 1.0, pitch: 0.9 },
      };
      const prof = voiceProfiles[voiceKey] || { rate: 1.0, pitch: 1.0 };
      utter.rate = prof.rate;
      utter.pitch = prof.pitch;
      utter.onend = () => setPreviewingVoice(null);
      utter.onerror = () => setPreviewingVoice(null);
      setPreviewingVoice(voiceKey);
      window.speechSynthesis.speak(utter);
    } catch {
      setPreviewingVoice(null);
    }
  };
  const stopPreview = () => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    } catch { /* ignore */ }
    setPreviewingVoice(null);
  };

  // === Demo tier toggle — flip to true to preview Pro experience ===
  const isPro = false;

  // Free-tier scarcity — genuine daily limits per TIERS.
  // Normal mode: 3 free questions / day.
  // 2 a.m. Companion mode (Free): 1 free session tonight (Pro retention hook).
  const dailyLimit = companion && !isPro ? 1 : 3;
  const usedInMode = companion && !isPro ? Math.min(messagesUsed, 1) : messagesUsed;
  const limitReached = !isPro && usedInMode >= dailyLimit;

  const handleSend = () => {
    if (!input.trim()) return;
    if (limitReached) {
      setPaywallVisible(true);
      return;
    }
    // Prototype: increment the daily counter; real send wired to Socket.io later.
    setMessagesUsed((n) => n + 1);
    setInput("");
  };

  return (
    <div className="space-y-10">
      <FadeIn>
        <SectionHeading
          eyebrow={t("mentor.eyebrow")}
          title={t("mentor.title")}
          subtitle={locale === "ru" ? "Глубочайший драйвер удержания. 4 голоса, стриминг, постоянная память, RAG по 10K проверенных документов. И 2 a.m. Companion — режим первого класса." : locale === "hi" ? "सबसे गहरा प्रतिधारण ड्राइवर। 4 आवाज़ें, स्ट्रीमिंग, स्थायी स्मृति। और 2 a.m. Companion — प्रथम-श्रेणी मोड।" : t("mentor.subtitle")}
        />
      </FadeIn>

      {/* Real AI Mentor — ZAI SDK + WebSocket streaming */}
      <FadeIn delay={0.03}>
        <RealMentorPanel locale={locale} />
      </FadeIn>

      {/* 2 a.m. Companion toggle banner */}
      <FadeIn delay={0.05}>
        <GlassCard variant="rose" glow>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Pill tone="rose">retention hook №1 · first-class mode</Pill>
                <Pill tone="muted">auto 23:00–05:00</Pill>
              </div>
              <h3 className="mt-2 font-display text-2xl font-semibold">
                {t("mentor.companion.title")}
              </h3>
              <p className="mt-1 text-[13px] text-[#9A9AA8] max-w-xl">
                The UI transforms: starfield intensifies, gold → warm amber, cards dissolve to a
                single soft glow panel. Soft voice, slower streaming, memory-forward. Targeted at
                Anxious Self-Improver + Healing Heart archetypes.
              </p>
            </div>
            <button
              onClick={() => {
                setCompanion((c) => !c);
                setPaywallVisible(false);
              }}
              className={`relative h-9 w-16 rounded-full border transition-colors ${
                companion ? "border-[#D98E7A]/60 bg-[#D98E7A]/30" : "border-[#2A2A35] bg-[#1C1C26]"
              }`}
              aria-label="Toggle 2 a.m. companion mode"
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`absolute top-1 h-7 w-7 rounded-full ${
                  companion ? "left-8 bg-[#D98E7A]" : "left-1 bg-[#9A9AA8]"
                }`}
              />
            </button>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Voice selector + social proof */}
      <FadeIn delay={0.1}>
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-xl font-semibold">Choose your voice · stable persona</h3>
            <SocialProof count={48213} action="conversations held this week" tone="rose" live />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {MENTOR_VOICES.map((v) => {
              const isSelected = voice === v.key;
              const isExpanded = expandedVoice === v.key;
              const toneColor = v.tone === "gold" ? "#E8B86D" : v.tone === "jade" ? "#5BB89C" : v.tone === "rose" ? "#D98E7A" : "#9A9AA8";
              return (
                <div
                  key={v.key}
                  className={`rounded-xl border transition-all ${
                    isSelected
                      ? "bg-[#12121A]"
                      : "bg-[#0B0B0F]/40 hover:bg-[#0B0B0F]/70"
                  }`}
                  style={{ borderColor: isSelected ? `${toneColor}80` : "#2A2A35" }}
                >
                  <button
                    onClick={() => {
                      setVoice(v.key);
                      setExpandedVoice(isExpanded ? null : v.key);
                    }}
                    className="flex w-full items-center justify-between gap-2 p-3 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-2">
                      <Pill tone={v.tone}>{v.name}</Pill>
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={toneColor} strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-[#6B6B78] text-[10px] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      aria-hidden
                    >
                      ▾
                    </span>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[#2A2A35] px-3 pb-3 pt-2">
                          <div className="text-[12px] text-[#9A9AA8]">{v.desc}</div>
                          <div className="mt-2 font-display text-sm italic text-[#F5F0E8]/80">
                            “{v.sample}”
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => setVoice(v.key)}
                              className="text-[11px] font-medium transition hover:underline"
                              style={{ color: toneColor }}
                            >
                              {isSelected ? "✓ Selected" : "Select this voice →"}
                            </button>
                            <span className="text-[#2A2A35]">·</span>
                            {previewingVoice === v.key ? (
                              <button
                                onClick={stopPreview}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D98E7A] transition hover:underline"
                              >
                                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#D98E7A]" aria-hidden />
                                {locale === "ru" ? "Остановить" : locale === "hi" ? "रोकें" : "Stop"}
                              </button>
                            ) : (
                              <button
                                onClick={() => speakSample(v.sample, v.key)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9A9AA8] transition hover:text-[#F5F0E8]"
                                aria-label={locale === "ru" ? "Прослушать образец голоса" : locale === "hi" ? "आवाज़ नमूना सुनें" : "Preview voice"}
                              >
                                ▶ {locale === "ru" ? "Прослушать" : locale === "hi" ? "सुनें" : "Preview"}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-[#6B6B78]">
            Stable persona + persistent pgvector memory from day one — anti-Replika identity-discontinuity trap.
          </p>
        </div>
      </FadeIn>

      <CosmicDivider />

      {/* Chat surface */}
      <FadeIn delay={0.15}>
        <div
          className={`relative overflow-hidden rounded-2xl transition-all duration-500 ${
            companion ? "border border-[#D98E7A]/30" : "glass"
          }`}
        >
          {companion && <div className="absolute inset-0 starfield opacity-70" />}
          <div className="relative p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#9A9AA8]">
                  {companion ? "2 a.m. Companion" : "Mentor · Empowerment voice"}
                </span>
                {companion && <Pill tone="rose">dim · warm · slow</Pill>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Scarcity — genuine daily-limit (Free) or unlimited (Pro) */}
                {isPro ? (
                  <Pill tone="gold">Pro · unlimited</Pill>
                ) : companion ? (
                  <ScarcityBadge
                    total={1}
                    used={usedInMode}
                    label="2 a.m. session tonight"
                  />
                ) : (
                  <ScarcityBadge
                    total={3}
                    used={messagesUsed}
                    label="free questions today"
                  />
                )}
                <Pill tone="muted">streaming · Socket.io</Pill>
              </div>
            </div>

            {/* 2 a.m. Companion scarcity note (Free only) */}
            {companion && !isPro && (
              <p className="mt-3 text-[12px] leading-relaxed text-[#D98E7A]">
                2 a.m. Companion is a Pro feature. Tonight&apos;s session is on us ✦
              </p>
            )}

            <div className="mt-6 space-y-5">
              {companion ? (
                /* 2 a.m. mode — single soft panel */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-[#D98E7A]/20 bg-[#0B0B0F]/60 p-6"
                >
                  <p className="font-display text-xl italic leading-relaxed text-[#D98E7A]">
                    You&apos;ve been up. Let&apos;s sit with what&apos;s coming up.
                  </p>
                  <p className="mt-4 text-[14px] leading-relaxed text-[#F5F0E8]/70">
                    I remember last week you mentioned the conversation with your sister. The Moon
                    meets your Sun tonight — the old story about being &apos;too much&apos; may surface. It
                    isn&apos;t. Would you like to say what&apos;s actually here, right now?
                  </p>
                  <div className="mt-4">
                    <Pill tone="rose">memory recall · 7 days</Pill>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <CosmicButton variant="rose" className="!py-2 !px-4 !text-[12px]">
                      I want to say it
                    </CosmicButton>
                    <CosmicButton variant="ghost" className="!py-2 !px-4 !text-[12px]">
                      Just sit with me
                    </CosmicButton>
                  </div>
                </motion.div>
              ) : (
                /* Normal chat */
                MENTOR_CHAT.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        m.role === "user"
                          ? "bg-[#1C1C26] border border-[#2A2A35] text-[#F5F0E8]"
                          : "glass-gold text-[#F5F0E8]"
                      }`}
                    >
                      <p className="text-[14px] leading-relaxed">{m.text}</p>
                      {m.cites && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {m.cites.map((cite) => (
                            <Pill key={cite} tone="jade">{cite}</Pill>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Composer — wraps in relative so SoftPaywall can absolute-inset-0 */}
            <div className="relative mt-6">
              <div className="flex items-center gap-2 rounded-xl border border-[#2A2A35] bg-[#0B0B0F]/60 p-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                  disabled={limitReached && !isPro}
                  placeholder={
                    limitReached && !isPro
                      ? companion
                        ? "Tonight's session is complete — try the morning"
                        : "Daily limit reached — resets at midnight"
                      : companion
                      ? "Speak softly… the night listens"
                      : "Ask anything about your chart…"
                  }
                  className="flex-1 bg-transparent px-3 py-2 text-[14px] text-[#F5F0E8] placeholder:text-[#6B6B78] outline-none disabled:opacity-60"
                />
                <CosmicButton
                  variant={companion ? "rose" : "primary"}
                  className="!py-2 !px-4 !text-[12px]"
                  onClick={handleSend}
                  disabled={limitReached && !isPro}
                >
                  {companion ? "Send softly ✦" : "Send ✦"}
                </CosmicButton>
              </div>

              {/* Reset note when limit reached + dismissed (no overlay) */}
              {limitReached && !isPro && !paywallVisible && (
                <p className="mt-2 text-center text-[11px] text-[#9A9AA8]">
                  Resets at midnight ✦
                </p>
              )}

              {/* SoftPaywall over the composer */}
              <AnimatePresence>
                {paywallVisible && (
                  <SoftPaywall
                    trigger={companion ? "2 a.m. session" : "4th question"}
                    title={
                      companion
                        ? "Tonight's free 2 a.m. session is complete"
                        : "You've asked your 3 free questions"
                    }
                    copy="Pro unlocks unlimited messages, the 2 a.m. Companion, and persistent memory across every conversation."
                    cta="Start 7-day reverse trial"
                    onCta={() => onNavigate?.("upgrade")}
                    onDismiss={() => setPaywallVisible(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard>
            <Pill tone="gold">trust</Pill>
            <h4 className="mt-2 font-display text-lg font-semibold">Cited, never vague</h4>
            <p className="mt-1 text-[12px] text-[#9A9AA8]">
              Every interpretation cites the transit, planet, or line it draws from. Anti-cold-reading.
              RAG over Steve Cozzi, Steven Forrest, Robert Hand, classical BaZi texts.
            </p>
          </GlassCard>
          <GlassCard variant="jade">
            <Pill tone="jade">memory</Pill>
            <h4 className="mt-2 font-display text-lg font-semibold">Remembers you</h4>
            <p className="mt-1 text-[12px] text-[#9A9AA8]">
              References past conversations + your chart specifics (Moon sign, Day Master). User can
              view/edit memory in Profile. Target: ≥30% of conversations recall memory by M12.
            </p>
          </GlassCard>
          <GlassCard variant="rose">
            <Pill tone="rose">empowerment</Pill>
            <h4 className="mt-2 font-display text-lg font-semibold">Equipping, not predicting</h4>
            <p className="mt-1 text-[12px] text-[#9A9AA8]">
              Offers concrete practices, not just validation. Never doom. Passes the Healing Heart
              persona kindness test on every message.
            </p>
          </GlassCard>
        </div>
      </FadeIn>
    </div>
  );
}
