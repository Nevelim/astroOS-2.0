"use client";

import { useState, useEffect } from "react";
import { GlassCard, Pill, CosmicButton, SectionHeading, FadeIn, CosmicDivider } from "../ui";
import { InfoTip, UpsellNudge, SocialProof } from "../growth-ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { LIFE_THEMES, SPHERES, type LifeTheme } from "@/lib/astroos/data";
import type { ScreenKey } from "@/lib/astroos/data";
import { RealThemesPanel } from "../real/RealThemesPanel";
import { motion, AnimatePresence } from "framer-motion";

type ThemesProps = { onNavigate?: (k: ScreenKey) => void };

const L = (en: string, ru: string, hi: string, locale: string) =>
  locale === "ru" ? ru : locale === "hi" ? hi : en;

export function ThemesScreen({ onNavigate }: ThemesProps = {}) {
  const { t, locale } = useI18n();
  const [activeKey, setActiveKey] = useState<string>(LIFE_THEMES[0].key);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [isPro] = useState(false); // demo toggle; Free user sees preview + paywall nudge
  // Progress tracking: which weeks the user has marked as done (per active theme).
  // Keyed by `${themeKey}:${weekNumber}` so switching themes preserves each theme's progress.
  // Persisted to localStorage so progress survives reloads (per cron round 5 P1).
  const STORAGE_KEY = "astroos:themes:completed";
  const [completed, setCompleted] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set(["shadow:1"]);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        return new Set(arr);
      }
    } catch { /* localStorage unavailable or corrupt — fall through to default */ }
    return new Set(["shadow:1"]); // week 1 of shadow pre-marked as in-progress→done demo
  });
  // Persist whenever completed changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
    } catch { /* localStorage unavailable — in-memory only */ }
  }, [completed]);
  const toggleWeek = (themeKey: string, week: number) => {
    const key = `${themeKey}:${week}`;
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const active = LIFE_THEMES.find((th) => th.key === activeKey)!;
  const completedCount = active.weeks.filter((w) => completed.has(`${active.key}:${w.week}`)).length;
  const sphere = SPHERES.find((s) => s.key === active.focusSphere);
  const resetThemeProgress = () => {
    setCompleted((prev) => {
      const next = new Set(prev);
      active.weeks.forEach((w) => next.delete(`${active.key}:${w.week}`));
      return next;
    });
  };
  // Export insights: gather all marked-done weeks across ALL themes into a text summary.
  // Useful for journaling, sharing with therapist/mentor, or pasting into the AI mentor.
  const [exported, setExported] = useState(false);
  const exportInsights = async () => {
    const lines: string[] = [];
    lines.push(locale === "ru" ? "Мои инсайты из AstroOS Themes" : locale === "hi" ? "AstroOS Themes से मेरी अंतर्दृष्टि" : "My insights from AstroOS Themes");
    lines.push("");
    LIFE_THEMES.forEach((th) => {
      const doneWeeks = th.weeks.filter((w) => completed.has(`${th.key}:${w.week}`));
      if (doneWeeks.length > 0) {
        const name = th.name[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"];
        lines.push(`◆ ${name} (${doneWeeks.length}/4) — ${th.monthLabel}`);
        doneWeeks.forEach((w) => {
          const title = w.title[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"];
          const prompt = w.prompt[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"];
          lines.push(`  Week ${w.week} · ${title}`);
          lines.push(`    Prompt: ${prompt}`);
        });
        lines.push(`  Practice: ${th.practice[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}`);
        lines.push(`  Crystal: ${th.crystal}`);
        lines.push("");
      }
    });
    if (lines.length <= 2) {
      lines.push(locale === "ru" ? "Пока нет отмеченных недель." : locale === "hi" ? "अभी कोई पूर्ण सप्ताह नहीं।" : "No weeks marked done yet.");
    }
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setExported(true);
      setTimeout(() => setExported(false), 2500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setExported(true); setTimeout(() => setExported(false), 2500); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };
  const totalCompletedAcrossThemes = LIFE_THEMES.reduce(
    (sum, th) => sum + th.weeks.filter((w) => completed.has(`${th.key}:${w.week}`)).length,
    0
  );
  // Share single week insight to X / WhatsApp — opens deep link in new tab
  const shareWeek = (themeKey: string, weekNum: number) => {
    const th = LIFE_THEMES.find((t) => t.key === themeKey)!;
    const w = th.weeks.find((wk) => wk.week === weekNum)!;
    const themeName = th.name[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"];
    const weekTitle = w.title[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"];
    const prompt = w.prompt[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"];
    const text = locale === "ru"
      ? `AstroOS · ${themeName} · Неделя ${weekNum} — ${weekTitle}\n\n«${prompt}»\n\n#AstroOS #${themeName.replace(/\s/g, "")}`
      : locale === "hi"
      ? `AstroOS · ${themeName} · सप्ताह ${weekNum} — ${weekTitle}\n\n"${prompt}"\n\n#AstroOS`
      : `AstroOS · ${themeName} · Week ${weekNum} — ${weekTitle}\n\n"${prompt}"\n\n#AstroOS`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const toneColor = (tone: LifeTheme["tone"]) =>
    tone === "gold" ? "#E8B86D" : tone === "jade" ? "#5BB89C" : tone === "rose" ? "#D98E7A" : "#5E8FA8";

  return (
    <div className="space-y-8">
      <FadeIn>
        <SectionHeading
          eyebrow={t("themes.eyebrow")}
          title={t("themes.title")}
          subtitle={t("themes.subtitle")}
        />
      </FadeIn>

      {/* Real spheres wheel — 8 life spheres with scores */}
      <FadeIn delay={0.03}>
        <RealThemesPanel locale={locale} onNavigate={onNavigate} />
      </FadeIn>

      {/* Social proof + monthly cadence */}
      <FadeIn delay={0.05}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SocialProof count={8421} action={L("readers in this month's theme", "читателей в теме этого месяца", "इस महीने की थीम में पाठक", locale)} tone="gold" live />
          <div className="flex items-center gap-2 text-[11px] text-[#9A9AA8]">
            <Pill tone="jade">{L("New theme every month", "Новая тема каждый месяц", "हर महीने नई थीम", locale)}</Pill>
            <span>·</span>
            <span className="font-mono">{LIFE_THEMES.length} {L("themes", "тем", "थीम", locale)}</span>
          </div>
        </div>
      </FadeIn>

      {/* Theme selector rail */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {LIFE_THEMES.map((th, i) => {
            const active = th.key === activeKey;
            const color = toneColor(th.tone);
            return (
              <motion.button
                key={th.key}
                onClick={() => {
                  setActiveKey(th.key);
                  setExpandedWeek(1);
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                whileHover={{ y: -2 }}
                className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                  active ? "border-2" : "border border-[#2A2A35] hover:border-[#9A9AA8]/40"
                }`}
                style={active ? { borderColor: color, backgroundColor: `${color}12` } : undefined}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-15 blur-2xl transition group-hover:opacity-30"
                  style={{ backgroundColor: color }}
                />
                <div className="relative">
                  <div className="text-2xl" style={{ color }}>{th.icon}</div>
                  <div className="mt-1.5 font-display text-[13px] font-semibold leading-tight text-[#F5F0E8]">
                    {th.name[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}
                  </div>
                  <div className="mt-0.5 text-[9px] uppercase tracking-wider text-[#8A8A96]">{th.monthLabel}</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </FadeIn>

      {/* Active theme detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
        >
          {/* Left: hero + 4-week arc */}
          <div className="space-y-5">
            {/* Hero card */}
            <GlassCard variant={active.tone} glow className="relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl"
                style={{ backgroundColor: toneColor(active.tone) }}
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl" style={{ color: toneColor(active.tone) }}>{active.icon}</span>
                      <h2 className="font-display text-3xl font-semibold text-[#F5F0E8]">
                        {active.name[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}
                      </h2>
                    </div>
                    <p className="mt-2 max-w-md text-[14px] italic leading-relaxed text-[#9A9AA8]">
                      {active.tagline[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}
                    </p>
                  </div>
                  <Pill tone={active.tone === "water" ? "water" : active.tone}>{active.monthLabel}</Pill>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 rounded-full border border-[#2A2A35] bg-[#0B0B0F]/60 px-2.5 py-1">
                    <span className="text-[#9A9AA8]">{L("Natal", "Натальная", "नेटल", locale)}</span>
                    <span className="font-mono text-[#F5F0E8]">{active.natalSignature}</span>
                    <InfoTip label={L("Natal signature", "Натальная сигнатура", "नेटल हस्ताक्षर", locale)} tone={active.tone === "water" ? "water" : active.tone}>
                      {L(
                        "We activate this theme around the chart placement that rules it for you. Yours is computed from your natal chart.",
                        "Мы активируем эту тему вокруг того размещения в карте, которое ею управляет. Ваше вычисляется из натальной карты.",
                        "हम यह थीम उस चार्ट स्थान के इर्द-गिर्द सक्रिय करते हैं जो इसे नियंत्रित करता है। आपका आपकी नेटल चार्ट से गणना होता है।",
                        locale
                      )}
                    </InfoTip>
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-[#2A2A35] bg-[#0B0B0F]/60 px-2.5 py-1">
                    <span style={{ color: sphere?.color }}>{sphere?.icon}</span>
                    <span className="text-[#9A9AA8]">{L("Focus sphere", "Фокус-сфера", "फोकस क्षेत्र", locale)}</span>
                    <span className="text-[#F5F0E8]">{active.focusSphere}</span>
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-[#2A2A35] bg-[#0B0B0F]/60 px-2.5 py-1">
                    <span className="text-[#9A9AA8]">{L("Crystal", "Кристалл", "क्रिस्टल", locale)}</span>
                    <span className="text-[#F5F0E8]">{active.crystal}</span>
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* 4-week arc */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-[#F5F0E8]">
                  {L("The four-week arc", "Четырёхнедельная арка", "चार-सप्ताह चाप", locale)}
                </h3>
                <InfoTip label={L("Why four weeks?", "Почему четыре недели?", "चार सप्ताह क्यों?", locale)} tone="jade">
                  {L(
                    "Behavioral research shows 21-28 days builds a groove; the 4th week integrates. Each week has a prompt — a small, specific practice.",
                    "Поведенческие исследования показывают: 21-28 дней создают привычку; 4-я неделя интегрирует. У каждой недели есть промпт — маленькая конкретная практика.",
                    "व्यवहार अनुसंधान दिखाता है: 21-28 दिन आदत बनाते हैं; चौथा सप्ताह एकीकृत करता है। प्रत्येक सप्ताह में एक प्रॉम्प्ट है।",
                    locale
                  )}
                </InfoTip>
              </div>
              <div className="space-y-2">
                {active.weeks.map((w) => {
                  const open = expandedWeek === w.week;
                  const locked = !isPro;
                  return (
                    <div
                      key={w.week}
                      className={`overflow-hidden rounded-xl border transition-colors ${
                        open ? "border-[#E8B86D]/30 bg-[#12121A]" : "border-[#2A2A35] bg-[#12121A]/60"
                      }`}
                    >
                      <button
                        onClick={() => setExpandedWeek(open ? null : w.week)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left"
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold"
                          style={{ borderColor: `${toneColor(active.tone)}55`, color: toneColor(active.tone), backgroundColor: `${toneColor(active.tone)}15` }}
                        >
                          {w.week}
                        </span>
                        <span className="flex-1 font-display text-[14px] font-medium text-[#F5F0E8]">
                          {w.title[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}
                        </span>
                        {locked && (
                          <Pill tone="muted" className="shrink-0">🔒 {L("Pro", "Pro", "Pro", locale)}</Pill>
                        )}
                        <span className={`shrink-0 text-[#8A8A96] transition-transform ${open ? "rotate-90" : ""}`}>›</span>
                      </button>
                      <AnimatePresence>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-[#2A2A35] px-4 py-3">
                              <div className="text-[10px] uppercase tracking-wider text-[#8A8A96]">
                                {L("This week's prompt", "Промпт этой недели", "इस सप्ताह का प्रॉम्प्ट", locale)}
                              </div>
                              <div
                                className={`mt-1.5 text-[13px] leading-relaxed ${locked ? "select-none text-[#9A9AA8] [filter:blur(3px)]" : "text-[#F5F0E8]"}`}
                              >
                                {w.prompt[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}
                              </div>
                              {locked && (
                                <div className="mt-2 flex items-center gap-2 text-[11px] text-[#E8B86D]">
                                  <span>🔒</span>
                                  <span>{L("Unlock all 4 prompts with Pro", "Откройте все 4 промпта с Pro", "सभी 4 प्रॉम्प्ट Pro के साथ खोलें", locale)}</span>
                                </div>
                              )}
                              {!locked && (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <button
                                    onClick={() => toggleWeek(active.key, w.week)}
                                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
                                      completed.has(`${active.key}:${w.week}`)
                                        ? "border-[#5BB89C]/50 bg-[#5BB89C]/12 text-[#5BB89C]"
                                        : "border-[#2A2A35] bg-[#0B0B0F]/40 text-[#9A9AA8] hover:border-[#5BB89C]/40 hover:text-[#5BB89C]"
                                    }`}
                                  >
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[9px]">
                                      {completed.has(`${active.key}:${w.week}`) && "✓"}
                                    </span>
                                    {completed.has(`${active.key}:${w.week}`)
                                      ? L("Marked done · tap to undo", "Отмечено · нажмите чтобы отменить", "पूर्ण · रद्द करने हेतु टैप करें", locale)
                                      : L("Mark this week done", "Отметить неделю выполненной", "इस सप्ताह पूर्ण चिह्नित करें", locale)}
                                  </button>
                                  <button
                                    onClick={() => shareWeek(active.key, w.week)}
                                    className="flex items-center gap-1 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 px-3 py-1.5 text-[11px] font-medium text-[#9A9AA8] transition hover:border-[#E8B86D]/40 hover:text-[#E8B86D]"
                                    aria-label={L("Share this prompt to X", "Поделиться промптом в X", "इस प्रॉम्प्ट को X पर साझा करें", locale)}
                                  >
                                    <span aria-hidden>↗</span>
                                    {L("Share", "Поделиться", "साझा", locale)}
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily practice + affirmation */}
            <div className="grid gap-3 sm:grid-cols-2">
              <GlassCard variant="neutral">
                <div className="text-[10px] uppercase tracking-wider text-[#E8B86D]/80">{L("Daily practice", "Ежедневная практика", "दैनिक अभ्यास", locale)}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#F5F0E8]">
                  {active.practice[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}
                </p>
              </GlassCard>
              <GlassCard variant="jade">
                <div className="text-[10px] uppercase tracking-wider text-[#5BB89C]">{L("Affirmation", "Аффирмация", "पुष्टि", locale)}</div>
                <p className="mt-1.5 font-display text-[14px] italic leading-relaxed text-[#F5F0E8]">
                  {active.affirmation[locale === "ru" ? "ru" : locale === "hi" ? "hi" : "en"]}
                </p>
              </GlassCard>
            </div>
          </div>

          {/* Right: progress + paywall nudge + ritual calendar */}
          <div className="space-y-4">
            <GlassCard variant="gold">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
                  {L("Your progress", "Ваш прогресс", "आपकी प्रगति", locale)}
                </h3>
                <Pill tone={completedCount === 4 ? "jade" : completedCount > 0 ? "gold" : "muted"}>
                  {completedCount}/4
                </Pill>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4].map((w) => {
                  const done = completed.has(`${active.key}:${w}`);
                  return (
                    <div key={w} className="flex-1">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          done ? "bg-[#5BB89C] shadow-[0_0_8px_rgba(91,184,156,0.4)]" : "bg-[#2A2A35]"
                        }`}
                      />
                      <div className={`mt-1 text-center text-[9px] ${done ? "text-[#5BB89C]" : "text-[#8A8A96]"}`}>
                        {done ? "✓" : L("Week", "Нед.", "सप्ताह", locale)} {w}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-[12px] text-[#9A9AA8]">
                {completedCount === 0 && (locale === "ru" ? "Начните с недели 1 — отметьте её когда выполните." : locale === "hi" ? "सप्ताह 1 से शुरू करें।" : "Start with week 1 — mark it done when complete.")}
                {completedCount > 0 && completedCount < 4 && (
                  <>
                    {L(`Week ${completedCount} of 4 · `, `Неделя ${completedCount} из 4 · `, `सप्ताह ${completedCount}/4 · `, locale)}
                    <span className="text-[#5BB89C]">{L("in progress", "в процессе", "जारी", locale)}</span>
                  </>
                )}
                {completedCount === 4 && (
                  <span className="text-[#5BB89C]">
                    {L("Theme complete ✦ Your insight feeds your mentor's memory.", "Тема завершена ✦ Ваш инсайт питает память наставника.", "थीम पूर्ण ✦ आपकी अंतर्दृष्टि गुरु की स्मृति में जाती है।", locale)}
                  </span>
                )}
              </div>
              {completedCount > 0 && (
                <button
                  onClick={resetThemeProgress}
                  className="mt-3 text-[10px] text-[#8A8A96] transition hover:text-[#D98E7A]"
                >
                  ↺ {L("Reset this theme's progress", "Сбросить прогресс этой темы", "इस थीम की प्रगति रीसेट करें", locale)}
                </button>
              )}
            </GlassCard>

            {!isPro && (
              <UpsellNudge
                icon="◈"
                title={L("Unlock all 6 themes", "Откройте все 6 тем", "सभी 6 थीम खोलें", locale)}
                copy={L(
                  "Pro unlocks every theme's full 4-week arc, daily practices, affirmations, and the monthly new drop. Plus your natal signature computed from your real chart.",
                  "Pro открывает полную 4-недельную арку каждой темы, ежедневные практики, аффирмации и ежемесячный новый дроп. Плюс ваша натальная сигнатура, вычисленная из реальной карты.",
                  "Pro हर थीम का पूरा 4-सप्ताह चाप, दैनिक अभ्यास, पुष्टियाँ और मासिक नया ड्रॉप खोलता है। साथ ही आपकी वास्तविक चार्ट से गणना।",
                  locale
                )}
                cta={L("Start 7-day reverse trial", "Начать 7-дневный reverse-trial", "7-दिन reverse-trial शुरू करें", locale)}
                tone="gold"
                onClick={() => onNavigate?.("upgrade")}
              />
            )}

            <GlassCard variant="neutral">
              <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
                {L("Ritual calendar", "Календарь ритуалов", "अनुष्ठान कैलेंडर", locale)}
              </h3>
              <p className="mt-1 text-[11px] text-[#9A9AA8]">
                {L("Theme-aligned transits this month", "Тема-выровненные транзиты в этом месяце", "इस महीने थीम-संरेखित ट्रांज़िट", locale)}
              </p>
              <div className="mt-3 space-y-2">
                {[
                  { date: "Jun 28", event: L("Moon ☌ your Pluto", "Луна ☌ ваш Плутон", "चंद्रमा ☌ आपका प्लूटो", locale), tone: "rose" as const },
                  { date: "Jul 02", event: L("Sun ⚹ your Moon", "Солнце ⚹ ваша Луна", "सूर्य ⚹ आपका चंद्रमा", locale), tone: "gold" as const },
                  { date: "Jul 09", event: L("Venus enters your 8th", "Венера в вашем 8-м доме", "शुक्र आपके 8वें में", locale), tone: "rose" as const },
                ].map((r) => (
                  <div key={r.date} className="flex items-center gap-2 text-[12px]">
                    <Pill tone={r.tone} className="shrink-0">{r.date}</Pill>
                    <span className="text-[#9A9AA8]">{r.event}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard variant="jade">
              <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
                {L("From your mentor", "От наставника", "आपके गुरु से", locale)}
              </h3>
              <p className="mt-2 text-[12px] italic leading-relaxed text-[#9A9AA8]">
                {L(
                  "\"The theme isn't a destination. It's a lens. Walk through your month with it, and notice what you notice.\"",
                  "«Тема — не пункт назначения. Это линза. Пройдите с ней через месяц и замечайте, что замечаете.»",
                  "\"थीम मंज़िल नहीं। यह लेंस है। इसके साथ महीना गुजारें और ध्यान दें कि आप क्या ध्यान देते हैं।\"",
                  locale
                )}
              </p>
              <button
                onClick={() => onNavigate?.("mentor")}
                className="mt-2 text-[12px] font-medium text-[#5BB89C] hover:underline"
              >
                {L("Ask the mentor about this theme →", "Спросить наставника об этой теме →", "इस थीम के बारे में गुरु से पूछें →", locale)}
              </button>
            </GlassCard>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Past themes archive */}
      <FadeIn delay={0.18}>
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-[#F5F0E8]">
              {L("Past themes", "Прошлые темы", "पिछली थीम", locale)}
            </h3>
            <Pill tone="muted">{L("completed", "завершено", "पूर्ण", locale)}</Pill>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "✚", name: L("Vitality", "Жизненность", "जीवन शक्ति", locale), month: L("May", "Май", "मई", locale), completion: 100, insight: L("Body as instrument", "Тело как инструмент", "शरीर वाद्य", locale) },
              { icon: "♥", name: L("Eros & Belonging", "Эрос", "इरोस", locale), month: L("April", "Апрель", "अप्रैल", locale), completion: 75, insight: L("The yes-check", "Проверка да", "हां-जांच", locale) },
              { icon: "☾", name: L("Shadow Work", "Тень", "छाया", locale), month: L("March", "Март", "मार्च", locale), completion: 100, insight: L("Naming", "Назвать", "नामकरण", locale) },
            ].map((p, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                whileHover={{ y: -2 }}
                className="group relative overflow-hidden rounded-xl border border-[#2A2A35] bg-[#12121A]/60 p-3 text-left transition hover:border-[#9A9AA8]/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl text-[#8A8A96]">{p.icon}</span>
                  <span className="text-[9px] uppercase tracking-wider text-[#8A8A96]">{p.month}</span>
                </div>
                <div className="mt-1.5 font-display text-[13px] font-semibold text-[#9A9AA8]">{p.name}</div>
                <div className="mt-1 text-[10px] italic text-[#8A8A96]">{p.insight}</div>
                {/* Completion bar */}
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#2A2A35]">
                    <div
                      className={`h-full rounded-full ${p.completion === 100 ? "bg-[#5BB89C]" : "bg-[#E8B86D]/60"}`}
                      style={{ width: `${p.completion}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-mono ${p.completion === 100 ? "text-[#5BB89C]" : "text-[#E8B86D]/70"}`}>{p.completion}%</span>
                </div>
                {p.completion === 100 && (
                  <div className="mt-1.5 flex items-center gap-1 text-[9px] text-[#5BB89C]">
                    <span>✓</span>
                    <span>{L("4 weeks completed", "4 недели завершено", "4 सप्ताह पूर्ण", locale)}</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-[#8A8A96]">
            {L("Your insights from each completed theme feed your mentor's memory.", "Ваши инсайты из каждой завершённой темы питают память наставника.", "प्रत्येक पूर्ण थीम से आपकी अंतर्दृष्टि आपके गुरु की स्मृति में जाती है।", locale)}
          </p>
        </div>
      </FadeIn>

      {/* Export insights — gather all marked-done weeks into clipboard text */}
      {totalCompletedAcrossThemes > 0 && (
        <FadeIn delay={0.18}>
          <GlassCard variant="jade">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F5F0E8]">
                  {L("Export your insights", "Экспортировать инсайты", "अपनी अंतर्दृष्टि निर्यात करें", locale)}
                </h3>
                <p className="mt-1 text-[12px] text-[#9A9AA8]">
                  {L(
                    `${totalCompletedAcrossThemes} week${totalCompletedAcrossThemes === 1 ? "" : "s"} marked done across all themes. Paste into your journal, your therapist note, or the AI mentor.`,
                    `${totalCompletedAcrossThemes} недел${totalCompletedAcrossThemes === 1 ? "я" : "ь"} отмечено во всех темах. Вставьте в журнал, заметку терапевта или AI-наставнику.`,
                    `${totalCompletedAcrossThemes} सप्ताह पूर्ण। अपने जर्नल में पेस्ट करें।`,
                    locale
                  )}
                </p>
              </div>
              <button
                onClick={exportInsights}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all ${
                  exported
                    ? "border border-[#5BB89C]/50 bg-[#5BB89C]/12 text-[#5BB89C]"
                    : "bg-gradient-to-br from-[#5BB89C] to-[#4A9A82] text-[#0B0B0F] hover:shadow-[0_0_20px_rgba(91,184,156,0.4)]"
                }`}
              >
                {exported ? `✓ ${L("Copied to clipboard", "Скопировано", "कॉपी हुआ", locale)}` : `⤓ ${L("Copy all insights", "Копировать все инсайты", "सभी अंतर्दृष्टि कॉपी", locale)}`}
              </button>
            </div>
          </GlassCard>
        </FadeIn>
      )}

      {/* Footer note */}
      <FadeIn delay={0.2}>
        <CosmicDivider />
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-3 text-[11px] text-[#8A8A96]">
          <span>{L("Themes rotate monthly", "Темы меняются ежемесячно", "थीम मासिक बदलती हैं", locale)}</span>
          <span className="text-[#2A2A35]">·</span>
          <span>{L("Aligned to your natal signature", "Выровнены с вашей натальной сигнатурой", "आपके नेटल हस्ताक्षर से संरेखित", locale)}</span>
          <span className="text-[#2A2A35]">·</span>
          <span>{L("No shame, no streak pressure", "Без стыда, без давления серий", "बिना शर्म, बिना स्ट्रीक दबाव", locale)}</span>
        </div>
      </FadeIn>
    </div>
  );
}
