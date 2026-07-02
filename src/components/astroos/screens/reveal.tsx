"use client";

import { useState, useCallback } from "react";
import { GlassCard, Pill, CosmicButton, SectionHeading, FadeIn } from "../ui";
import { CosmicOrb } from "../CosmicOrb";
import { useI18n } from "@/lib/astroos/i18n-context";
import { USER } from "@/lib/astroos/data";
import type { ScreenKey } from "@/lib/astroos/data";
import { motion, AnimatePresence } from "framer-motion";
import { RealRevealPanel, type RevealPanelData } from "../real/RealRevealPanel";

type RevealProps = { onNavigate?: (k: ScreenKey) => void };

const STEPS_RU = [
  { label: "0–10с", title: "Splash & one-tap login", desc: "Email · Google · Apple. Без пароля. Starfield дышит." },
  { label: "10–35с", title: "Ввод данных рождения", desc: "Smart autocomplete городов (geonames). TZ авто. DST обработан. Выбор голоса: Calm · Witty · Professional · Trauma-sensitive." },
  { label: "35–45с", title: "Graceful path неизвестного времени", desc: "Не знаете время? Округление до 2ч → 12-house fallback. Или 'спросить семью' → shareable SMS link. Или solar chart ( disclosed)." },
  { label: "45–85с", title: "The Reveal", desc: "Full-screen кинематографично: starfield → колесо карты рисуется → BaZi столпы поднимаются → ваша космическая идентичность названа." },
  { label: "85–90с", title: "Consent & permission-primed push", desc: "Calm copy, не OS-default. Activation = reveal screen loads. Цель: 70% (индустрия 45–55%)." },
];
const STEPS_EN = [
  { label: "0–10s", title: "Splash & one-tap login", desc: "Email · Google · Apple. No password friction. The starfield breathes." },
  { label: "10–35s", title: "Birth data entry", desc: "Smart city autocomplete (geonames). Timezone auto. DST handled. Voice pick: Calm · Witty · Professional · Trauma-sensitive." },
  { label: "35–45s", title: "Graceful birth-time path", desc: "Unknown time? Approximate to nearest 2h → 12-house fallback. Or 'ask a family member' → shareable SMS link. Or solar chart (disclosed)." },
  { label: "45–85s", title: "The Reveal", desc: "Full-screen cinematic: starfield → chart wheel draws → BaZi pillars rise → your cosmic identity, named." },
  { label: "85–90s", title: "Consent & permission-primed push", desc: "Calm copy, not OS-default. Activation = reveal screen loads. Target: 70% activation (industry 45–55%)." },
];
const STEPS_HI = [
  { label: "0–10से", title: "Splash & one-tap login", desc: "Email · Google · Apple. कोई पासवर्ड नहीं। Starfield सांस लेता है।" },
  { label: "10–35से", title: "जन्म डेटा दर्ज", desc: "Smart city autocomplete. TZ स्वतः। DST नियंत्रित। आवाज़ चुनें: Calm · Witty · Professional · Trauma-sensitive।" },
  { label: "35–45से", title: "अज्ञात समय graceful path", desc: "समय नहीं पता? 2 घंटे तक approx → 12-house fallback। या 'परिवार से पूछें' → SMS लिंक। या solar chart।" },
  { label: "45–85से", title: "The Reveal", desc: "Full-screen cinematic: starfield → चार्ट चक्र → BaZi स्तंभ → आपकी ब्रह्मांडीय पहचान।" },
  { label: "85–90से", title: "Consent & push", desc: "Calm copy। Activation = reveal screen। लक्ष्य: 70% (उद्योग 45–55%)।" },
];

export function RevealScreen({ onNavigate }: RevealProps = {}) {
  const { t, locale } = useI18n();
  const [phase, setPhase] = useState<"intro" | "revealed">("intro");
  const [revealData, setRevealData] = useState<RevealPanelData | null>(null);
  const steps = locale === "ru" ? STEPS_RU : locale === "hi" ? STEPS_HI : STEPS_EN;

  const handleRevealDataLoaded = useCallback((data: RevealPanelData) => {
    setRevealData(data);
  }, []);

  // Derive signs from real data or fallback to USER mock
  const sunSign = revealData?.sunSign ?? USER.sun;
  const moonSign = revealData?.moonSign ?? USER.moon;
  const risingSign = revealData?.risingSign ?? USER.rising;
  const dayMaster = revealData?.dayMaster ?? USER.dayMaster;

  return (
    <div className="space-y-12">
      <FadeIn>
        <SectionHeading eyebrow={t("reveal.eyebrow")} title={t("reveal.title")} subtitle={t("reveal.subtitle")} />
      </FadeIn>

      {/* Real reveal — astronomy-engine + BaZi */}
      <FadeIn delay={0.03}>
        <RealRevealPanel locale={locale} onDataLoaded={handleRevealDataLoaded} />
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="astro-premium-border relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 starfield opacity-90" />
          <div className="absolute inset-0 cosmic-glow" />
          {/* Decorative orb near the cinematic reveal */}
          <CosmicOrb size="lg" color="jade" className="absolute top-6 right-10 opacity-20 z-10 hidden md:block" />
          <CosmicOrb size="sm" color="gold" className="absolute bottom-10 left-8 opacity-15 z-10 hidden md:block" />
          <div className="relative p-8 md:p-14 text-center min-h-[460px] flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {phase === "intro" ? (
                <motion.div key="intro" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.6 }} className="space-y-6">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-[#E8B86D]/70">AstroOS · Reveal</div>
                  <p className="font-display text-2xl md:text-3xl italic text-[#F5F0E8] max-w-xl mx-auto">
                    {locale === "ru" ? "«90 секунд — позволь нам назвать, что делало небо, когда ты пришёл.»" : locale === "hi" ? "«90 सेकंड — जब आप आए थे तब आकाश क्या कर रहा था, उसे नाम देने दें।»" : "“For 90 seconds, let us name what the sky was doing when you arrived.”"}
                  </p>
                  <CosmicButton variant="primary" onClick={() => setPhase("revealed")} className="astro-pulse-glow">✧ {t("reveal.cta")}</CosmicButton>
                  <p className="text-[11px] text-[#6B6B78]">{t("reveal.nopaywall")}</p>
                </motion.div>
              ) : (
                <motion.div key="revealed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="space-y-5">
                  <div className="flex items-center justify-center gap-2">
                    <Pill tone="gold">{sunSign} Sun</Pill>
                    <Pill tone="jade">{moonSign} Moon</Pill>
                    <Pill tone="rose">{risingSign} Rising</Pill>
                  </div>
                  <motion.h2 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.7 }} className="font-display text-4xl md:text-6xl font-semibold">
                    <span className="text-gradient-cosmic">{t("reveal.you.are")} {sunSign} Sun</span>
                    <br />
                    <span className="text-[#F5F0E8]">· {moonSign} Moon · {risingSign} Rising</span>
                  </motion.h2>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="font-display text-xl md:text-2xl text-[#5BB89C]">
                    {t("reveal.day.master")} · {dayMaster}
                  </motion.p>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }} className="flex flex-wrap justify-center gap-2">
                    <span className="text-[13px] text-[#9A9AA8]">{t("reveal.power.cities")}</span>
                    {USER.powerCities.map((c) => <Pill key={c} tone="gold">{c}</Pill>)}
                  </motion.div>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="font-display text-lg italic text-[#E8B86D] max-w-md mx-auto">
                    {locale === "ru" ? "Ваш дар — глубина. Ваш край — границы. Хотите ежедневную практику, чтобы сбалансировать оба?" : locale === "hi" ? "आपका वरदान गहराई है। आपका किनारा सीमाएं हैं।" : t("reveal.gift")}
                  </motion.p>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }} className="flex justify-center gap-3 pt-2">
                    <CosmicButton variant="primary" onClick={() => onNavigate?.("today")}>{t("reveal.start")}</CosmicButton>
                    <CosmicButton variant="ghost" onClick={() => setPhase("intro")}>{t("reveal.replay")}</CosmicButton>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <section>
          <h3 className="font-display text-2xl font-semibold mb-4">{t("reveal.timeline")}</h3>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <FadeIn key={i} delay={0.05 * i}>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8B86D]/40 bg-[#E8B86D]/10 font-mono text-[11px] text-[#E8B86D]">{i + 1}</div>
                    {i < steps.length - 1 && <div className="mt-1 h-full w-px flex-1 bg-gradient-to-b from-[#E8B86D]/40 to-transparent" />}
                  </div>
                  <GlassCard variant={i === 3 ? "gold" : "neutral"} className="flex-1 mb-2">
                    <div className="flex items-center gap-2">
                      <Pill tone="muted">{s.label}</Pill>
                      {i === 3 && <Pill tone="gold">the wow</Pill>}
                    </div>
                    <h4 className="mt-2 font-display text-lg font-semibold">{s.title}</h4>
                    <p className="mt-1 text-[13px] text-[#9A9AA8] leading-relaxed">{s.desc}</p>
                  </GlassCard>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.2}>
        <GlassCard variant="jade">
          <Pill tone="jade">{t("reveal.principle.eyebrow")}</Pill>
          <p className="mt-3 font-display text-xl italic text-[#5BB89C]">
            {locale === "ru" ? "Ноль пейволла в первой сессии. Противоположность Nebula dark-pattern и Co-Star paywall-after-3-taps. Доверие — актив; Reveal — вклад." : locale === "hi" ? "पहले सत्र में कोई पेवॉल नहीं। विश्वास — संपत्ति; Reveal — जमा।" : "Zero paywall contact in the first session. The opposite of Nebula's dark-pattern and Co-Star's paywall-after-3-taps. Trust is the asset; the Reveal is the deposit."}
          </p>
        </GlassCard>
      </FadeIn>
    </div>
  );
}
