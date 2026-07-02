"use client";

import { useState } from "react";
import { GlassCard, Pill, CosmicButton, SectionHeading, FadeIn, CosmicDivider } from "../ui";
import { OnboardingStepper } from "../growth-ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { CityAutocomplete } from "../real/CityAutocomplete";
import { api, type ResolvedBirthDTO, type CalculateResult } from "@/lib/astroos/real/api-client";
import type { ScreenKey } from "@/lib/astroos/data";
import { motion, AnimatePresence } from "framer-motion";

type BirthProps = { onNavigate?: (k: ScreenKey) => void };

const L = (en: string, ru: string, hi: string, locale: string) =>
  locale === "ru" ? ru : locale === "hi" ? hi : en;

const VOICES = [
  { key: "calm", icon: "☾", label: { en: "Calm", ru: "Спокойный", hi: "शांत" }, desc: { en: "Warm, slow, grounded", ru: "Тёплый, медленный, заземлённый", hi: "गर्म, धीमा, स्थिर" } },
  { key: "witty", icon: "✦", label: { en: "Witty", ru: "Остроумный", hi: "चुस्त" }, desc: { en: "Dry humor, direct", ru: "Сухой юмор, прямо", hi: "सूखा हास्य, सीधा" } },
  { key: "professional", icon: "◈", label: { en: "Professional", ru: "Профессиональный", hi: "पेशेवर" }, desc: { en: "Analyst, precise", ru: "Аналитик, точный", hi: "विश्लेषक, सटीक" } },
  { key: "trauma", icon: "❋", label: { en: "Trauma-sensitive", ru: "Травма-чувствительный", hi: "आघात-संवेदनशील" }, desc: { en: "Gentle, non-pathologizing", ru: "Мягкий, без патологизации", hi: "कोमल, बिना रोग-निदान" } },
];

/** Step indicator component for form sections */
function StepIndicator({ step }: { step: number }) {
  const glyphs = ["①", "②", "③", "④"];
  return (
    <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E8B86D]/10 text-[11px] text-[#E8B86D] ring-1 ring-[#E8B86D]/20">
      {glyphs[step - 1] ?? step}
    </span>
  );
}

export function BirthDataScreen({ onNavigate }: BirthProps = {}) {
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [voice, setVoice] = useState("calm");
  const [calculating, setCalculating] = useState(false);
  const [resolvedBirth, setResolvedBirth] = useState<ResolvedBirthDTO | null>(null);
  const [gender, setGender] = useState<0 | 1>(1);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<CalculateResult | null>(null);

  // Computed birth date/time string
  const birthDateTime = date && (unknownTime || time)
    ? `${date}T${unknownTime ? "12:00" : time}`
    : undefined;

  // Can submit when we have: name, date, (time or unknown), and resolved city
  const canSubmit = name.trim() && date && (unknownTime || time) && resolvedBirth;

  const handleCityResolved = (result: ResolvedBirthDTO) => {
    setResolvedBirth(result);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !resolvedBirth) return;
    setCalculating(true);
    setCalcError(null);
    try {
      // Step 1: Calculate the natal chart via /api/calculate
      const payload = resolvedBirth.calculatePayload;
      const result = await api.calculate({
        ...payload,
        gender,
        rankCities: true,
        cityLimit: 50,
      });
      setCalcResult(result);

      // Step 2: Save birth data to member profile via /api/profile
      try {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: name.trim(),
            birthDateTime: payload.birthDateTime,
            birthLat: payload.birthLat,
            birthLng: payload.birthLng,
            birthTzOffset: payload.birthTzOffset,
            birthPlaceName: payload.birthPlaceName,
            gender,
            voice,
            onboardingDone: true,
          }),
        });
      } catch {
        // Profile save is non-blocking — don't fail the whole flow
      }

      // Step 3: Navigate to reveal screen
      onNavigate?.("reveal");
    } catch (err) {
      setCalcError((err as Error).message || "Calculation failed");
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="mx-auto max-w-md">
          <OnboardingStepper current={2} />
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <SectionHeading
          eyebrow={t("birth.eyebrow")}
          title={t("birth.title")}
          subtitle={t("birth.subtitle")}
        />
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* The form — wrapped in animated gradient border */}
        <FadeIn delay={0.1}>
          <div className="astro-gradient-border-wrap">
            <div className="astro-gradient-border-inner">
              <GlassCard variant="gold" glow className="space-y-5 border-0">
                {/* ① Name */}
                <div>
                  <label className="flex items-center text-[10px] uppercase tracking-wider text-[#9A9AA8]">
                    <StepIndicator step={1} />
                    {L("Your name", "Ваше имя", "आपका नाम", locale)}
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="astro-input-cosmic mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2.5 text-[14px] text-[#F5F0E8] outline-none transition-colors focus:border-[#E8B86D]/50"
                    placeholder={L("Aeliana", "Аэлиана", "एलियाना", locale)}
                  />
                </div>

                {/* ② Date + Time */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="flex items-center text-[10px] uppercase tracking-wider text-[#9A9AA8]">
                      <StepIndicator step={2} />
                      {L("Birth date", "Дата рождения", "जन्म तिथि", locale)}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="astro-input-cosmic mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2.5 text-[14px] text-[#F5F0E8] outline-none transition-colors focus:border-[#E8B86D]/50 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">
                      {L("Birth time", "Время рождения", "जन्म समय", locale)}
                    </label>
                    <input
                      type="time"
                      value={time}
                      disabled={unknownTime}
                      onChange={(e) => setTime(e.target.value)}
                      className={`astro-input-cosmic mt-1 w-full rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2.5 text-[14px] text-[#F5F0E8] outline-none transition-colors focus:border-[#E8B86D]/50 [color-scheme:dark] ${
                        unknownTime ? "opacity-40" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Unknown time — graceful path */}
                <button
                  onClick={() => setUnknownTime((v) => !v)}
                  className="flex items-center gap-2 text-[12px] text-[#9A9AA8] transition hover:text-[#E8B86D]"
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded border transition ${unknownTime ? "border-[#E8B86D] bg-[#E8B86D] text-[#0B0B0F]" : "border-[#2A2A35]"}`}>
                    {unknownTime && "✓"}
                  </span>
                  {L("I don't know my birth time", "Не знаю время рождения", "मुझे जन्म समय नहीं पता", locale)}
                </button>
                <AnimatePresence>
                  {unknownTime && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-lg border border-[#5BB89C]/25 bg-[#5BB89C]/8 p-3 text-[12px] leading-relaxed text-[#9A9AA8]">
                        <span className="font-medium text-[#5BB89C]">
                          {L("That's fine. ", "Это нормально. ", "यह ठीक है। ", locale)}
                        </span>
                        {L(
                          "We'll build a solar chart (Sun-based) and use a 12-house fallback. You can refine later by asking family — we'll generate a shareable SMS link.",
                          "Мы построим солнечную карту (на основе Солнца) с 12-домовым fallback. Позже можете уточнить у семьи — мы сгенерируем SMS-ссылку.",
                          "हम सौर चार्ट (सूर्य-आधारित) बनाएंगे और 12-भव fallback का उपयोग करेंगे। बाद में परिवार से पूछकर सटीक कर सकते हैं — हम SMS लिंक बनाएंगे।",
                          locale
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Gender */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">
                    {L("Gender", "Пол", "लिंग", locale)}
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {[
                      { value: 1 as const, label: L("Male", "Мужской", "पुरुष", locale), icon: "♂" },
                      { value: 0 as const, label: L("Female", "Женский", "महिला", locale), icon: "♀" },
                    ].map((g) => (
                      <button
                        key={g.value}
                        onClick={() => setGender(g.value)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition ${
                          gender === g.value
                            ? "border-[#E8B86D]/50 bg-[#E8B86D]/10 text-[#E8B86D]"
                            : "border-[#2A2A35] bg-[#0B0B0F]/60 text-[#F5F0E8] hover:border-[#9A9AA8]/40"
                        }`}
                      >
                        <span>{g.icon}</span>
                        <span>{g.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-[#6B6B78]">
                    {L("Affects BaZi Luck Pillars direction", "Влияет на направление BaZi Luck Pillars", "BaZi Luck Pillars दिशा को प्रभावित करता है", locale)}
                  </p>
                </div>

                {/* ③ City autocomplete — real implementation */}
                <div>
                  <label className="flex items-center text-[10px] uppercase tracking-wider text-[#9A9AA8] mb-1">
                    <StepIndicator step={3} />
                    {L("Birth city", "Город рождения", "जन्म शहर", locale)}
                  </label>
                  <CityAutocomplete
                    birthDateTime={birthDateTime}
                    onCityResolved={handleCityResolved}
                  />
                </div>

                {/* ④ Voice selector */}
                <div>
                  <label className="flex items-center text-[10px] uppercase tracking-wider text-[#9A9AA8]">
                    <StepIndicator step={4} />
                    {L("Mentor voice", "Голос наставника", "गुरु स्वर", locale)}
                  </label>
                  <p className="mt-0.5 text-[11px] text-[#6B6B78]">
                    {L("You can change this later. Stable persona — never switches on you.", "Можно изменить позже. Стабильная персона — не переключается.", "बाद में बदल सकते हैं। स्थिर व्यक्तित्व — कभी नहीं बदलता।", locale)}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {VOICES.map((v) => {
                      const active = voice === v.key;
                      return (
                        <button
                          key={v.key}
                          onClick={() => setVoice(v.key)}
                          className={`flex items-start gap-2 rounded-lg border p-2.5 text-left transition ${
                            active
                              ? "border-[#E8B86D]/50 bg-[#E8B86D]/10"
                              : "border-[#2A2A35] bg-[#0B0B0F]/60 hover:border-[#9A9AA8]/40"
                          }`}
                        >
                          <span className={`text-lg ${active ? "text-[#E8B86D]" : "text-[#9A9AA8]"}`}>{v.icon}</span>
                          <span className="flex-1">
                            <span className={`block text-[12px] font-medium ${active ? "text-[#E8B86D]" : "text-[#F5F0E8]"}`}>
                              {v.label[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}
                            </span>
                            <span className="block text-[10px] leading-snug text-[#6B6B78]">
                              {v.desc[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <CosmicDivider />

                {/* Submit — glow only when canSubmit */}
                <motion.div
                  animate={canSubmit ? { scale: [1, 1.015, 1] } : { scale: 1 }}
                  transition={{ duration: 2.5, repeat: canSubmit ? Infinity : 0, ease: "easeInOut" }}
                >
                  <CosmicButton
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!canSubmit || calculating}
                    className={`w-full ${canSubmit ? "astro-submit-ready" : ""}`}
                  >
                    {calculating
                      ? L("Calculating your 44 lines…", "Считаю ваши 44 линии…", "आपकी 44 रेखाएं गणना…", locale)
                      : !canSubmit
                      ? L("Fill in your details", "Заполните данные", "विवरण भरें", locale)
                      : L("✦ Calculate my chart", "✦ Построить мою карту", "✦ मेरी चार्ट बनाएं", locale)}
                  </CosmicButton>
                </motion.div>
                <p className="text-center text-[11px] text-[#6B6B78]">
                  {L("Takes ~1.5 seconds. Cached forever (your chart never changes).", "~1.5 секунды. Кэшируется навсегда (ваша карта не меняется).", "~1.5 सेकंड। हमेशा कैश (आपकी चार्ट कभी नहीं बदलती)।", locale)}
                </p>

                {/* Error message */}
                <AnimatePresence>
                  {calcError && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="rounded-lg border border-[#D98E7A]/30 bg-[#D98E7A]/8 p-3 text-[12px] text-[#D98E7A]"
                    >
                      {calcError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Resolved birth data preview — enhanced */}
                <AnimatePresence>
                  {resolvedBirth && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="astro-resolved-glow rounded-xl border border-[#5BB89C]/25 bg-[#5BB89C]/5 p-4 text-[11px] text-[#9A9AA8]"
                    >
                      {/* Header with cosmic map icon */}
                      <div className="flex items-center gap-2 mb-3">
                        <motion.span
                          initial={{ rotate: 0 }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                          className="text-lg text-[#5BB89C]"
                        >
                          ⊕
                        </motion.span>
                        <span className="font-medium text-[#5BB89C] text-[12px]">
                          {L("Birth data resolved", "Данные рождения определены", "जन्म डेटा हल किया", locale)}
                        </span>
                      </div>

                      {/* Grid with icon+label+value pattern */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 rounded-lg bg-[#0B0B0F]/40 px-3 py-2">
                          <span className="text-[#E8B86D] text-[13px]">🏙</span>
                          <span className="flex-1 text-[#9A9AA8]">{L("City", "Город", "शहर", locale)}</span>
                          <span className="text-[#F5F0E8] font-medium">{resolvedBirth.city.displayName}</span>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-lg bg-[#0B0B0F]/40 px-3 py-2">
                          <span className="text-[#5BB89C] text-[13px]">⊕</span>
                          <span className="flex-1 text-[#9A9AA8]">{L("Coordinates", "Координаты", "निर्देशांक", locale)}</span>
                          <span className="text-[#F5F0E8] font-medium font-mono-astro">{resolvedBirth.city.lat.toFixed(2)}°, {resolvedBirth.city.lng.toFixed(2)}°</span>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-lg bg-[#0B0B0F]/40 px-3 py-2">
                          <span className="text-[#D98E7A] text-[13px]">🌐</span>
                          <span className="flex-1 text-[#9A9AA8]">{L("Timezone", "Часовой пояс", "समय क्षेत्र", locale)}</span>
                          <span className="text-[#F5F0E8] font-medium">{resolvedBirth.birth.ianaTimezone}</span>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-lg bg-[#0B0B0F]/40 px-3 py-2">
                          <span className="text-[#5E8FA8] text-[13px]">◷</span>
                          <span className="flex-1 text-[#9A9AA8]">{L("UTC offset", "Смещение UTC", "UTC ऑफसेट", locale)}</span>
                          <span className="text-[#F5F0E8] font-medium">{resolvedBirth.birth.offsetLabel} ({resolvedBirth.birth.tzAbbr})</span>
                        </div>
                        {resolvedBirth.birth.dstActive && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="astro-dst-badge flex items-center gap-2.5 rounded-lg bg-[#E8B86D]/8 border border-[#E8B86D]/20 px-3 py-2"
                          >
                            <span className="text-[#E8B86D] text-[13px]">☀</span>
                            <span className="flex-1 text-[#E8B86D]">{L("DST", "Летнее время", "DST", locale)}</span>
                            <span className="text-[#E8B86D] font-medium">
                              {L("Active", "Активно", "सक्रिय", locale)}
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </div>
          </div>
        </FadeIn>

        {/* Side: why we ask + privacy */}
        <FadeIn delay={0.15}>
          <div className="space-y-4">
            {/* Why we ask — with planet icons */}
            <GlassCard variant="neutral">
              <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
                {L("Why we ask", "Зачем мы спрашиваем", "हम क्यों पूछते हैं", locale)}
              </h3>
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-[#9A9AA8]">
                <li className="flex gap-2 items-start">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8B86D]/10 text-[11px] text-[#E8B86D]">☉</span>
                  <span>{L("Date + time → your 12 houses, rising sign, Moon degree.", "Дата + время → 12 домов, асцендент, градус Луны.", "तिथि + समय → 12 भव, लग्न, चंद्र अंश।", locale)}</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5BB89C]/10 text-[11px] text-[#5BB89C]">⊕</span>
                  <span>{L("Place → latitude/longitude → your 44 astrocartography lines.", "Место → широта/долгота → 44 линии астрокартографии.", "स्थान → अक्षांश/देशांतर → 44 अस्ट्रोकार्टो रेखाएं।", locale)}</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D98E7A]/10 text-[11px] text-[#D98E7A]">壬</span>
                  <span>{L("All three → your BaZi 4 pillars + Day Master.", "Все три → BaZi 4 столпа + Day Master.", "तीनों → BaZi 4 स्तंभ + Day Master।", locale)}</span>
                </li>
              </ul>
            </GlassCard>

            {/* Historical accuracy — with globe/timezone visual */}
            <GlassCard variant="jade">
              <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
                {L("Historical accuracy", "Историческая точность", "ऐतिहासिक सटीकता", locale)}
              </h3>
              {/* Globe / timezone visual */}
              <div className="mt-3 flex items-center justify-center">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#5BB89C]/25 bg-[#5BB89C]/5">
                  <span className="text-2xl text-[#5BB89C]">🌐</span>
                  {/* Orbiting dot */}
                  <motion.span
                    className="absolute h-2 w-2 rounded-full bg-[#E8B86D]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    style={{ transformOrigin: "0 0", top: "50%", left: "50%", marginLeft: 24 }}
                  />
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[#9A9AA8]">
                {L(
                  "We use the IANA timezone database (same as NASA and airlines) to compute your exact UTC offset at birth — including DST, historical timezone changes, and Soviet time reforms.",
                  "Мы используем базу часовых поясов IANA (как NASA и авиакомпании) для вычисления точного смещения UTC на момент рождения — включая DST, исторические изменения и советские реформы времени.",
                  "हम IANA टाइमज़ोन डेटाबेस (NASA और एयरलाइंस की तरह) का उपयोग जन्म के समय सटीक UTC ऑफसेट की गणना के लिए करते हैं — DST, ऐतिहासिक परिवर्तन और सोवियत समय सुधारों सहित।",
                  locale
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Pill tone="jade">IANA tz</Pill>
                <Pill tone="jade">DST-aware</Pill>
                <Pill tone="jade">Historical</Pill>
              </div>
            </GlassCard>

            {/* Your data is yours — with lock/shield icon */}
            <GlassCard variant="jade">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold text-[#F5F0E8]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5BB89C]/10 text-[14px] text-[#5BB89C]">🛡</span>
                {L("Your data is yours", "Ваши данные — ваши", "आपका डेटा आपका है", locale)}
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-[#9A9AA8]">
                {L(
                  "We never sell your birth chart. We never email-blast you. You can export or delete everything in one tap from Profile.",
                  "Мы никогда не продаём вашу карту рождения. Никогда не спамим. Экспорт или удаление всех данных — в один тап из Профиля.",
                  "हम आपकी जन्म चार्ट कभी नहीं बेचते। कभी स्पैम नहीं। प्रोफ़ाइल से एक टैप में सब निर्यात या हटाएं।",
                  locale
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Pill tone="jade">bcrypt</Pill>
                <Pill tone="jade">CSPRNG</Pill>
                <Pill tone="jade">GDPR Art. 9</Pill>
                <Pill tone="jade">1-tap delete</Pill>
              </div>
            </GlassCard>
          </div>
        </FadeIn>
      </div>

      {/* Back / skip */}
      <FadeIn delay={0.2}>
        <div className="flex items-center justify-between text-[12px]">
          <button onClick={() => onNavigate?.("auth")} className="text-[#9A9AA8] transition hover:text-[#F5F0E8]">
            ← {L("Back to account", "Назад к аккаунту", "खाते पर वापस", locale)}
          </button>
          <button onClick={() => onNavigate?.("reveal")} className="text-[#6B6B78] transition hover:text-[#E8B86D]">
            {L("Skip with demo data →", "Пропустить с демо-данными →", "डेमो डेटा से छोड़ें →", locale)}
          </button>
        </div>
      </FadeIn>
    </div>
  );
}
