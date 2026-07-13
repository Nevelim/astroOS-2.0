"use client";

import { GlassCard, Pill, CosmicButton, SectionHeading, FadeIn, CosmicDivider } from "../ui";
import { OnboardingStepper, SocialProof } from "../growth-ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { USER } from "@/lib/astroos/data";
import type { ScreenKey } from "@/lib/astroos/data";
import { motion } from "framer-motion";

type WelcomeProps = { onNavigate?: (k: ScreenKey) => void };

const L = (en: string, ru: string, hi: string, locale: string) =>
  locale === "ru" ? ru : locale === "hi" ? hi : en;

export function WelcomeScreen({ onNavigate }: WelcomeProps = {}) {
  const { t, locale } = useI18n();

  const valueProps = [
    {
      icon: "✦",
      title: L("Depth, not sun-sign", "Глубина, не солнце-знак", "सूर्य-राशि नहीं, गहराई", locale),
      body: L(
        "Western natal chart + Eastern BaZi 4 pillars + 44 astrocartography lines. Real astronomy, not cold readings.",
        "Западная карта + восточный BaZi 4 столпа + 44 линии астрокартографии. Реальная астрономия, не холодные чтения.",
        "पश्चिमी जन्म चार्ट + पूर्वी BaZi 4 स्तंभ + 44 अस्ट्रोकार्टोग्राफी रेखाएं। वास्तविक खगोल, न कि ठंडी रीडिंग।",
        locale
      ),
      tone: "gold" as const,
    },
    {
      icon: "✧",
      title: L("A 2 a.m. Companion", "Спутник в 2 ночи", "रात 2 बजे का साथी", locale),
      body: L(
        "An AI mentor with persistent memory and a stable voice. It remembers your transits, your edges, your gifts.",
        "AI-наставник с постоянной памятью и стабильным голосом. Помнит ваши транзиты, края, дары.",
        "एक AI गुरु जिसमें स्थायी स्मृति और स्थिर स्वर है। यह आपके ट्रांज़िट, किनारे, वरदान याद रखता है।",
        locale
      ),
      tone: "rose" as const,
    },
    {
      icon: "⊕",
      title: L("Where on Earth you thrive", "Где на Земле вы процветаете", "पृथ्वी पर कहाँ आप फलें", locale),
      body: L(
        "Astrocartography that names your power cities — for love, work, roots, recognition. Free, beautiful, mobile.",
        "Астрокартография, которая называет ваши города силы — для любви, работы, корней, признания. Бесплатно, красиво, мобиль.",
        "अस्ट्रोकार्टोग्राफी जो आपके शक्ति शहरों को नाम देती है — प्रेम, काम, जड़ों, मान्यता के लिए। मुफ्त, सुंदर, मोबाइल।",
        locale
      ),
      tone: "jade" as const,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Onboarding stepper — step 1 of 4 */}
      <FadeIn>
        <div className="mx-auto max-w-md">
          <OnboardingStepper current={1} />
        </div>
      </FadeIn>

      {/* Hero */}
      <FadeIn delay={0.05}>
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 18 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#E8B86D]/40 bg-[#12121A] text-3xl text-[#E8B86D] shadow-[0_0_40px_rgba(232,184,109,0.3)]"
          >
            ✦
          </motion.div>
          <div className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#E8B86D]/80">
            {t("welcome.eyebrow")}
          </div>
          <h1 className="mt-2 font-display text-4xl md:text-5xl font-semibold leading-tight text-[#F5F0E8]">
            {t("welcome.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#9A9AA8]">
            {t("welcome.subtitle")}
          </p>
        </div>
      </FadeIn>

      {/* Social proof */}
      <FadeIn delay={0.1}>
        <div className="flex justify-center">
          <SocialProof count={1284700} action={L("readers anchored here", "читателей нашли якорь здесь", "पाठक यहाँ लंगर गए", locale)} tone="gold" live />
        </div>
      </FadeIn>

      {/* Value props */}
      <FadeIn delay={0.15}>
        <div className="grid gap-4 md:grid-cols-3">
          {valueProps.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
            >
              <GlassCard variant={v.tone} className="h-full">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" style={{ color: v.tone === "gold" ? "#E8B86D" : v.tone === "rose" ? "#D98E7A" : "#5BB89C" }}>
                    {v.icon}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-[#F5F0E8]">{v.title}</h3>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-[#9A9AA8]">{v.body}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </FadeIn>

      {/* Primary CTA block */}
      <FadeIn delay={0.25}>
        <GlassCard variant="gold" glow className="mx-auto max-w-2xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#F5F0E8]">
                {L("Ready in 90 seconds", "Готово за 90 секунд", "90 सेकंड में तैयार", locale)}
              </h2>
              <p className="mt-1 text-[13px] text-[#9A9AA8]">
                {L(
                  "Create your account → enter your birth data → see your chart. No paywall in your first session.",
                  "Создайте аккаунт → введите данные рождения → увидите карту. Без paywall в первой сессии.",
                  "खाता बनाएं → जन्म डेटा दर्ज करें → अपनी चार्ट देखें। पहले सत्र में कोई paywall नहीं।",
                  locale
                )}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <CosmicButton variant="primary" onClick={() => onNavigate?.("auth")} className="astro-pulse-glow">
                ✧ {L("Get started — 90 seconds", "Начать — 90 секунд", "शुरू करें — 90 सेकंड", locale)}
              </CosmicButton>
              <CosmicButton variant="ghost" onClick={() => onNavigate?.("reveal")}>
                {L("Explore demo first", "Сначала демо", "पहले डेमो देखें", locale)}
              </CosmicButton>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[#6B6B78]">
              <span>✓ {L("No password friction", "Без парольной боли", "पासवर्ड बाधा नहीं", locale)}</span>
              <span>✓ {L("Google · Apple · Email", "Google · Apple · Email", "Google · Apple · Email", locale)}</span>
              <span>✓ {L("Delete everything in 1 tap", "Удалить всё в 1 тап", "1 टैप में सब हटाएं", locale)}</span>
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      {/* Trust band */}
      <FadeIn delay={0.3}>
        <div className="mx-auto max-w-2xl">
          <CosmicDivider />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-4 text-[11px] text-[#9A9AA8]">
            <span className="font-mono text-[#E8B86D]">★ 4.8</span>
            <span>{L("12,400+ reviews", "12 400+ отзывов", "12,400+ समीक्षा", locale)}</span>
            <span className="text-[#2A2A35]">·</span>
            <span>{L("No surprise charges", "Без скрытых списаний", "कोई आश्चर्यजनक शुल्क नहीं", locale)}</span>
            <span className="text-[#2A2A35]">·</span>
            <span>{L("Cancel in 2 taps", "Отмена в 2 тапа", "2 टैप में रद्द करें", locale)}</span>
            <span className="text-[#2A2A35]">·</span>
            <span>{L("Your chart is yours", "Ваша карта — ваша", "आपकी चार्ट आपकी है", locale)}</span>
          </div>
        </div>
      </FadeIn>

      {/* Testimonials — social proof quotes */}
      <FadeIn delay={0.33}>
        <div className="mx-auto max-w-3xl">
          <h3 className="mb-3 text-center font-display text-lg text-[#9A9AA8]">
            {L("What readers say", "Что говорят читатели", "पाठक क्या कहते हैं", locale)}
          </h3>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {[
              {
                name: "Mira",
                sign: "Scorpio",
                glyph: "♏",
                stars: 5,
                text: L(
                  "The BaZi pillar explained a tension I've felt for years. Finally language for it.",
                  "Столп BaZi объяснил напряжение, которое я чувствовал годами. Наконец-то слова для этого.",
                  "BaZi स्तंभ ने वह तनाव समझाया जो मैंने सालों महसूस किया।",
                  locale,
                ),
              },
              {
                name: "Jonas",
                sign: "Aquarius",
                glyph: "♒",
                stars: 5,
                text: L(
                  "Astrocartography pointed me to Porto. Moved 6 months ago — best decision.",
                  "Астрокартография указала на Порту. Переехал 6 месяцев назад — лучшее решение.",
                  "एस्ट्रोकार्टोग्राफी ने मुझे पोर्टो की ओर इशारा किया। 6 महीने हो गए — सर्वश्रेष्ठ निर्णय।",
                  locale,
                ),
              },
              {
                name: "Anya",
                sign: "Pisces",
                glyph: "♓",
                stars: 4,
                text: L(
                  "The 2 a.m. companion caught me on a hard night. No paywall, no judgment.",
                  "Спутник в 2 ночи поймал меня в тяжёлую ночь. Без paywall, без осуждения.",
                  "2 a.m. साथी ने मुश्किल रात में मुझे पकड़ा। कोई paywall नहीं।",
                  locale,
                ),
              },
            ].map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
                className="rounded-xl border border-[#2A2A35] bg-[#12121A]/60 p-3"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[#F5F0E8]">{r.name}</span>
                    <span className="text-[#E8B86D]">{r.glyph}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#E8B86D]">
                    {"★".repeat(r.stars)}<span className="text-[#2A2A35]">{"★".repeat(5 - r.stars)}</span>
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#9A9AA8]">"{r.text}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* What you'll get — preview of the journey */}
      <FadeIn delay={0.35}>
        <div className="mx-auto max-w-3xl">
          <h3 className="mb-3 text-center font-display text-lg text-[#9A9AA8]">
            {L("Your 5-minute first session", "Ваша 5-минутная первая сессия", "आपका 5-मिनट पहला सत्र", locale)}
          </h3>
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { n: "1", label: L("Account", "Аккаунт", "खाता", locale), t: "10s", tone: "#5BB89C" },
              { n: "2", label: L("Birth data", "Данные", "जन्म", locale), t: "25s", tone: "#5BB89C" },
              { n: "3", label: L("Reveal", "Reveal", "Reveal", locale), t: "90s", tone: "#E8B86D" },
              { n: "4", label: L("First ritual", "Ритуал", "अनुष्ठान", locale), t: "60s", tone: "#D98E7A" },
            ].map((s) => (
              <div key={s.n} className="rounded-lg border border-[#2A2A35] bg-[#12121A]/60 p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: s.tone }}>{s.t}</div>
                <div className="mt-1 font-display text-sm text-[#F5F0E8]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Returning user? */}
      <FadeIn delay={0.4}>
        <div className="text-center text-[12px] text-[#6B6B78]">
          {L("Already have an account?", "Уже есть аккаунт?", "पहले से खाता है?", locale)}{" "}
          <button onClick={() => onNavigate?.("auth")} className="font-medium text-[#E8B86D] hover:underline">
            {L("Sign in", "Войти", "लॉगिन", locale)}
          </button>
        </div>
      </FadeIn>
    </div>
  );
}
