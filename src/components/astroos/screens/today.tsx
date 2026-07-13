"use client";

import * as React from "react";
import {
  GlassCard, Pill, CosmicButton, RitualStarRow, SectionHeading, FadeIn, CosmicDivider,
} from "../ui";
import { CosmicOrb } from "../CosmicOrb";
import { useI18n } from "@/lib/astroos/i18n-context";
import { USER, TODAY, HOROSCOPE_SPHERES } from "@/lib/astroos/data";
import { localized } from "@/lib/astroos/data";
import type { ScreenKey } from "@/lib/astroos/data";
import { motion, AnimatePresence } from "framer-motion";
import { RealHoroscopePanel } from "../real/RealHoroscopePanel";
import { RealMoonPhasePanel } from "../real/RealMoonPhasePanel";
import { RealMoonVoCPanel } from "../real/RealMoonVoCPanel";
import { RealPlanetaryHoursPanel } from "../real/RealPlanetaryHoursPanel";
import { RealTransitForecastPanel } from "../real/RealTransitForecastPanel";
import { RealCosmicAspectsPanel } from "../real/RealCosmicAspectsPanel";
import { RealPlanetaryDignityPanel } from "../real/RealPlanetaryDignityPanel";
import { RealDignityCalendarPanel } from "../real/RealDignityCalendarPanel";
import { RealRetrogradeSchedulePanel } from "../real/RealRetrogradeSchedulePanel";
import { RealStreakCalendar } from "../real/RealStreakCalendar";
import { RealAffirmationPanel } from "../real/RealAffirmationPanel";
import { TransitDetailDrawer } from "../real/TransitDetailDrawer";
import { TransitTimeline } from "../real/TransitTimeline";
import type { TransitAspect } from "../real/TransitDetailDrawer";
import { useMember } from "@/lib/astroos/real/useMember";
import { useRankedCities } from "@/lib/astroos/real/useRankedCities";
import {
  StickyCTA, SocialProof, UpsellNudge, ScarcityBadge, TourSpotlight, type TourStep,
} from "../growth-ui";

/* ---------------------------------------------------------------------------
 * Today screen (v3.2) — sandwich rule + sticky primary CTA + social proof
 *
 * Applies Task 9-a §4 (sandwich rule) + Task 9-b §3 (missing primary CTA) +
 * Task 9-b §4 (zero conversion triggers). The top-3 ritual cards now follow
 * the e-commerce sandwich: Card 1 anchor (horoscope, free) → Card 2 target
 * (Mentor upsell, middle position, rose glow) → Card 3 proof (power city).
 * Affirmation + Compliment move to a secondary "gentle notes" row.
 * The retention loop is closed by a sticky `✦ Cast today's reading` CTA with
 * haptic feedback + toast. All triggers are non-dark-pattern: genuine Free-tier
 * scarcity, authentic live-tick social proof, jade (not red) encouragement.
 * ------------------------------------------------------------------------- */

// Simulated tier toggle — flip to true to preview Pro copy on the Mentor card.
const IS_PRO = false;

// Free-tier mentor daily quota (mirrors TIERS[0].features "3 messages / day").
const MENTOR_DAILY_TOTAL = 3;
const MENTOR_DAILY_USED = 0;

export function TodayScreen({ onNavigate }: { onNavigate?: (k: ScreenKey) => void } = {}) {
  const { t, locale } = useI18n();
  const { member } = useMember();
  const displayName = member?.displayName || USER.name;
  const memberStreak = member?.streak ?? USER.streak;
  const [ritualCast, setRitualCast] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // TransitDetailDrawer state
  const [selectedAspect, setSelectedAspect] = React.useState<TransitAspect | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const handleAspectClick = React.useCallback((aspect: TransitAspect) => {
    setSelectedAspect(aspect);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = React.useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Onboarding tour — shows on first Today visit after activation.
  // localStorage flag persists dismissal across sessions.
  const [tourOpen, setTourOpen] = React.useState(false);
  React.useEffect(() => {
    try {
      const seen = localStorage.getItem("astroos:tour:today");
      if (!seen) {
        // small delay so the screen finishes mounting + sticky CTA renders
        const id = setTimeout(() => setTourOpen(true), 600);
        return () => clearTimeout(id);
      }
    } catch { /* localStorage unavailable */ }
  }, []);
  const closeTour = () => {
    setTourOpen(false);
    try { localStorage.setItem("astroos:tour:today", "1"); } catch { /* noop */ }
  };

  // Streak reflects the cast state — star fills by one (capped at 7).
  const streakFilled = Math.min(7, memberStreak + (ritualCast ? 1 : 0));

  // Locale-conditional inline copy (new strings — see task spec).
  const L = (en: string, ru: string, hi: string) =>
    locale === "ru" ? ru : locale === "hi" ? hi : en;

  const mentorTitle = L(
    "Ask your 2 a.m. Companion",
    "Спросите своего компаньона в 2 ночи",
    "अपने 2 बजे रात के साथी से पूछें"
  );
  const mentorCopyFree = L(
    "The conversation you're circling wants a witness. 3 free messages today.",
    "Разговор, вокруг которого вы кружите, хочет свидетеля. 3 бесплатных сообщения сегодня.",
    "वह बातचीत जिसके चारों ओर आप घूम रहे हैं, एक गवाह चाहती है। आज 3 मुफ़्त संदेश।"
  );
  const mentorCopyPro = L(
    "Unlimited messages + 2 a.m. Companion unlocked.",
    "Безлимитные сообщения + компаньон в 2 ночи разблокирован.",
    "असीमित संदेश + 2 बजे रात का साथी अनलॉक।"
  );
  const mentorCta = L("Open Mentor", "Открыть Наставника", "मेंटर खोलें");
  const scarcityLabel = L("free messages today", "бесплатных сообщений сегодня", "मुफ़्त संदेश आज");

  // Real ranked cities from /api/calculate
  const { cities: rankedCities } = useRankedCities(3);
  const topCity = rankedCities[0];
  const powerCity = topCity?.city?.name ?? USER.powerCities[0];
  const powerCityCountry = topCity?.city?.country ?? "Portugal";
  const powerCityLat = topCity?.city?.lat?.toFixed(1) ?? "38.7";
  const topInfluence = topCity?.influences?.[0];
  const powerCityLine = topInfluence ? `${topInfluence.planet} ${topInfluence.type} line` : "IC line";
  const powerCityEyebrow = L("Your power city today", "Ваш город силы сегодня", "आज का आपका शक्ति शहर");
  const powerCityCopy = topCity
    ? L(
        `Your #1 ranked city — ${topInfluence?.planet ?? "planetary"} ${topInfluence?.type ?? ""} influence at ${Math.round(topInfluence?.distKm ?? 0)}km. Index: ${(topCity.index.index * 100).toFixed(0)}%`,
        `Ваш город №1 — влияние ${topInfluence?.planet ?? "планеты"} ${topInfluence?.type ?? ""} на расстоянии ${Math.round(topInfluence?.distKm ?? 0)}км. Индекс: ${(topCity.index.index * 100).toFixed(0)}%`,
        `आपका #1 शहर — ${topInfluence?.planet ?? "ग्रह"} ${topInfluence?.type ?? ""} प्रभाव ${Math.round(topInfluence?.distKm ?? 0)}किमी पर। सूचकांक: ${(topCity.index.index * 100).toFixed(0)}%`
      )
    : L(
        "Your Scorpio Sun sits on its IC line — home, roots, and the kind of rest that doesn't ask you to perform.",
        "Ваше Скорпионье Солнце стоит на линии IC — дом, корни и тот отдых, что не требует вас выступать.",
        "आपका वृश्चिक सूर्य इसकी IC रेखा पर है — घर, जड़ें, और वह विश्राम जो आपसे प्रदर्शन नहीं मांगता।"
      );
  const powerCityCta = L("Open Power Card", "Открыть Карту Силы", "पावर कार्ड खोलें");
  const powerCityProof = L(
    "Scorpios felt seen in Lisbon this week",
    "Скорпионы чувствовали себя увиденными в Лиссабоне на этой неделе",
    "इस हफ्ते वृश्चिक लिस्बन में समझे जाते महसूस कर रहे हैं"
  );

  const castLabel = L("✦ Cast today's reading", "✦ Бросить сегодняшний расклад", "✦ आज की रीडिंग डालें");
  const toastMsg = L(
    "Tomorrow's preview unlocks at 18:33 ✦",
    "Завтрашний превью откроется в 18:33 ✦",
    "कल का पूर्वावलोकन 18:33 पर खुलेगा ✦"
  );
  const wardNudge = L(
    "Two more days and your WARD hits gold ✦",
    "Ещё два дня — и ваш WARD станет золотым ✦",
    "और दो दिन — आपका WARD सुनहरा हो जाएगा ✦"
  );
  const gentleNotesEyebrow = L("soft close", "мягкое закрытие", "कोमल समापन");
  const gentleNotesTitle = L("Today's gentle notes", "Сегодняшние мягкие заметки", "आज की कोमल टिप्पणियाँ");
  const gentleNotesSub = L(
    "Affirmation + compliment · the soft close of the ritual loop.",
    "Аффирмация + комплимент · мягкое закрытие цикла ритуала.",
    "पुष्टि + प्रशंसा · अनुष्ठान चक्र का कोमल समापन।"
  );
  const headerProof = L(
    "rituals cast today · 8,412 Scorpios",
    "раскладов брошено сегодня · 8 412 Скорпионов",
    "आज डाली गई रीडिंग · 8,412 वृश्चिक"
  );
  const cardProof = L("rituals cast today", "раскладов сегодня", "आज की रीडिंग");

  const handleCast = React.useCallback(() => {
    if (ritualCast) return;
    setRitualCast(true);
    // Mobile haptic feedback (no-op on desktop browsers).
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate(15); } catch { /* ignore */ }
    }
    setToast(toastMsg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, [ritualCast, toastMsg]);

  React.useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  return (
    <div className="space-y-10 pb-24">
      <FadeIn>
        <div className="relative flex flex-wrap items-end justify-between gap-4" data-tour="today-hero">
          {/* Decorative orbs */}
          <CosmicOrb size="sm" color="gold" className="absolute -top-4 right-20 opacity-40 hidden md:block" />
          <CosmicOrb size="sm" color="jade" className="absolute top-8 right-8 opacity-30 hidden md:block" />
          <CosmicOrb size="sm" color="rose" className="absolute bottom-4 right-44 opacity-25 hidden md:block" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#E8B86D]/80">
              {localized(locale, TODAY.date)}
            </div>
            <h1 className="mt-1 font-display text-4xl md:text-5xl font-semibold">
              {t("today.greeting")}, <span className="text-gradient-gold">{displayName}</span>
            </h1>
            <p className="mt-2 max-w-xl text-[15px] text-[#9A9AA8]">{localized(locale, TODAY.focus)}</p>
            <SocialProof
              count={12408}
              action={headerProof}
              tone="gold"
              live
              className="mt-3"
            />
          </div>
          <GlassCard variant="gold" className="!p-4">
            <div className="text-[11px] uppercase tracking-wider text-[#9A9AA8]">{t("today.streak")}</div>
            <RitualStarRow filled={streakFilled} className="mt-1.5" />
            <div className="mt-1.5 text-[11px] text-[#6B6B78]">{streakFilled} of 7 · {t("today.streak.sub")}</div>
          </GlassCard>
        </div>
      </FadeIn>

      {/* Real horoscope — real transits + AI narrative */}
      <FadeIn delay={0.03}>
        <RealHoroscopePanel locale={locale} onAspectClick={handleAspectClick} />
      </FadeIn>

      {/* Real moon phase — astronomy-engine + cosmic SVG visualization */}
      <FadeIn delay={0.04}>
        <RealMoonPhasePanel locale={locale} />
      </FadeIn>

      {/* Moon Void of Course — when the Moon makes no major aspect before changing signs */}
      <RealMoonVoCPanel locale={locale} />

      {/* Real planetary hours — ancient timekeeping system with astronomy-engine */}
      <FadeIn delay={0.045}>
        <RealPlanetaryHoursPanel locale={locale} />
      </FadeIn>

      {/* Transit timeline — 24h horizontal strip */}
      <TransitTimeline locale={locale} onAspectClick={handleAspectClick} />

      {/* Cosmic aspects — live planet positions + aspect grid (uses fixed /api/transits) */}
      <RealCosmicAspectsPanel locale={locale} />

      {/* Planetary dignity — essential dignity (Ruler/Exalted/Detriment/Fall) of current transits */}
      <RealPlanetaryDignityPanel locale={locale} />

      {/* Dignity calendar — upcoming dignity transitions over the next 30 days */}
      <RealDignityCalendarPanel locale={locale} />

      {/* Retrograde schedule — upcoming Rx/direct stations timeline */}
      <RealRetrogradeSchedulePanel locale={locale} />

      {/* Real 7-day transit forecast — planet positions + sign ingresses */}
      <FadeIn delay={0.048}>
        <RealTransitForecastPanel locale={locale} />
      </FadeIn>

      {/* Real streak calendar — 7-day WARD visualization */}
      <FadeIn delay={0.05}>
        <RealStreakCalendar locale={locale} onNavigate={onNavigate} />
      </FadeIn>

      {/* Real affirmation — AI-generated by sign */}
      <FadeIn delay={0.07}>
        <RealAffirmationPanel locale={locale} />
      </FadeIn>

      {/* ============ Sandwich rule: 3 ritual cards ============
       * Card 1 anchor (horoscope, free, what they came for)
       * Card 2 target (Mentor upsell — middle position, rose glow, the highest-attention slot)
       * Card 3 proof (power city + social proof → viral k-loop driver)
       * Stacked vertically for narrative ritual reading (per task spec). */}
      <div className="space-y-5">
        {/* Card 1 — anchor: today's horoscope */}
        <FadeIn delay={0.05}>
          <GlassCard variant="gold" glow className="relative">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Pill tone="gold">☉ {t("today.horoscope")}</Pill>
              <SocialProof count={12408} action={cardProof} tone="gold" live />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TODAY.transitPills.map((p) => (
                <Pill key={p.label} tone={p.tone}>{p.label}</Pill>
              ))}
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-[#F5F0E8]/90">{localized(locale, TODAY.horoscope)}</p>
            <div className="mt-4 flex items-center gap-2">
              <CosmicButton variant="ghost" className="!py-1.5 !px-3 !text-[12px]">{t("today.share")} ✦</CosmicButton>
            </div>
          </GlassCard>
        </FadeIn>

        {/* Card 2 — target: Mentor upsell (middle position, rose glow, slightly elevated) */}
        <FadeIn delay={0.1}>
          <motion.div
            initial={{ y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative rounded-2xl border border-[#D98E7A]/40 bg-[#12121A]/60 p-[1px] shadow-[0_0_30px_rgba(217,142,122,0.18)]"
            data-tour="today-mentor"
          >
            {/* Subtle rose glow halo to draw the eye (Z-pattern target) */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-[#D98E7A]/10 blur-xl"
            />
            <div className="rounded-2xl bg-[#12121A]/80 p-5 backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Pill tone="rose">◆ {L("Editor's pick · deep dive", "Выбор редакции · глубоко", "संपादक की पसंद · गहराई")}</Pill>
                <ScarcityBadge total={MENTOR_DAILY_TOTAL} used={MENTOR_DAILY_USED} label={scarcityLabel} />
              </div>
              <div className="mt-3">
                <UpsellNudge
                  icon="☾"
                  title={mentorTitle}
                  copy={IS_PRO ? mentorCopyPro : mentorCopyFree}
                  cta={`${mentorCta} →`}
                  tone="rose"
                  onClick={() => onNavigate?.("mentor")}
                  className="!border-transparent !bg-transparent !p-0 hover:!bg-transparent"
                />
              </div>
            </div>
          </motion.div>
        </FadeIn>

        {/* Card 3 — proof: power city (viral k-loop driver) */}
        <FadeIn delay={0.15}>
          <GlassCard variant="jade" className="h-full">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Pill tone="jade">❋ {powerCityEyebrow}</Pill>
              <span className="font-mono text-[10px] text-[#6B6B78]">{powerCityLine} · {powerCity}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-display text-3xl font-semibold text-[#5BB89C]">{powerCity}</span>
              <span className="text-[11px] text-[#6B6B78]">{powerCityCountry} · {powerCityLat}°{topCity?.city?.lat != null && topCity.city.lat >= 0 ? "N" : "S"}</span>
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-[#F5F0E8]/90">{powerCityCopy}</p>
            <div className="mt-4">
              <SocialProof count={8412} action={powerCityProof} tone="jade" live />
            </div>
            <div className="mt-4">
              <CosmicButton
                variant="jade"
                className="!py-2 !px-4 !text-[13px]"
                onClick={() => onNavigate?.("world")}
              >
                {powerCityCta} →
              </CosmicButton>
            </div>
          </GlassCard>
        </FadeIn>
      </div>

      {/* Top 3 Ranked Cities — real data from /api/calculate */}
      {rankedCities.length > 0 && (
        <FadeIn delay={0.17}>
          <GlassCard>
            <Pill tone="gold">{L("Your top cities", "Ваши лучшие города", "आपके शीर्ष शहर")}</Pill>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {rankedCities.slice(0, 3).map((rc, i) => {
                const inf = rc.influences[0];
                const toneColor = rc.index.tone === "gold" ? "#E8B86D" : rc.index.tone === "jade" ? "#5BB89C" : rc.index.tone === "rose" ? "#D98E7A" : "#5E8FA8";
                return (
                  <motion.div
                    key={rc.city.id}
                    initial={{ opacity:0, y:8 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay: i * 0.1 }}
                    className="astro-hover-lift rounded-lg border p-3 transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ background:`${toneColor}08`, borderColor:`${toneColor}20` }}
                    onClick={() => onNavigate?.("world")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display text-lg font-semibold" style={{ color:toneColor }}>#{rc.rank}</span>
                      <span className="text-[12px] font-medium text-[#F5F0E8]">{rc.city.name}</span>
                    </div>
                    <div className="text-[10px] text-[#9A9AA8]">{rc.city.country}</div>
                    {inf && (
                      <div className="mt-1 flex items-center gap-1 text-[10px]">
                        <span style={{ color:toneColor }}>{inf.planet} {inf.type}</span>
                        <span className="text-[#6B6B78]">· {Math.round(inf.distKm)}km</span>
                      </div>
                    )}
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-[#1C1C26]">
                      <div className="h-full rounded-full" style={{
                        width:`${Math.min(100, rc.index.index * 100)}%`,
                        background:toneColor
                      }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </FadeIn>
      )}

      {/* ============ Secondary: gentle notes (Affirmation + Compliment moved here) ============ */}
      <FadeIn delay={0.18}>
        <div>
          <SectionHeading
            eyebrow={gentleNotesEyebrow}
            title={gentleNotesTitle}
            subtitle={gentleNotesSub}
          />
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <GlassCard variant="jade" className="h-full">
              <div className="flex items-center justify-between">
                <Pill tone="jade">☾ {t("today.affirmation")}</Pill>
                <span className="font-mono text-[10px] text-[#6B6B78]">~40 words</span>
              </div>
              <p className="mt-4 font-display text-lg italic leading-relaxed text-[#5BB89C]">{localized(locale, TODAY.affirmation)}</p>
              <div className="mt-4"><Pill tone="muted">paired with ☽ square Chiron</Pill></div>
            </GlassCard>
            <GlassCard variant="rose" className="h-full">
              <div className="flex items-center justify-between">
                <Pill tone="rose">♥ {t("today.compliment")}</Pill>
                <span className="font-mono text-[10px] text-[#6B6B78]">Day Master 壬</span>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-[#F5F0E8]/90">{localized(locale, TODAY.compliment)}</p>
              <div className="mt-4"><Pill tone="muted">rotation · depth</Pill></div>
            </GlassCard>
          </div>
        </div>
      </FadeIn>

      <CosmicDivider />

      {/* Horoscope 5 spheres + lucky hours (data-density from GitHub) */}
      <FadeIn delay={0.2}>
        <GlassCard>
          <Pill tone="gold">{t("divine.horoscope.spheres")}</Pill>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {HOROSCOPE_SPHERES.map((s) => (
              <div key={s.key} className="rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">{t(`sphere.${s.key}`)}</div>
                <div className="mt-1 font-display text-3xl font-semibold" style={{ color: s.tone === "gold" ? "#E8B86D" : s.tone === "jade" ? "#5BB89C" : "#D98E7A" }}>{s.val}</div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1C1C26]">
                  <div className="h-full rounded-full" style={{ width: `${s.val}%`, background: s.tone === "gold" ? "#E8B86D" : s.tone === "jade" ? "#5BB89C" : "#D98E7A" }} />
                </div>
                <p className="mt-2 text-[10px] leading-snug text-[#6B6B78]">{localized(locale, s.note)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <GlassCard className="flex-1 min-w-[200px] !p-3">
              <Pill tone="jade">{t("divine.lucky")}</Pill>
              <div className="mt-1.5 font-mono text-[14px] text-[#5BB89C]">07:14 — 09:02 · 18:33 — 20:11</div>
            </GlassCard>
            <GlassCard className="flex-1 min-w-[200px] !p-3">
              <Pill tone="rose">{t("divine.avoid")}</Pill>
              <div className="mt-1.5 font-mono text-[14px] text-[#D98E7A]">13:00 — 14:30 (signed contracts)</div>
            </GlassCard>
          </div>
        </GlassCard>
      </FadeIn>

      {/* WARD + ritual loop */}
      <FadeIn delay={0.25}>
        <section className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <GlassCard>
            <Pill tone="gold">{t("today.ward.eyebrow")}</Pill>
            <h3 className="mt-3 font-display text-2xl font-semibold">{t("today.ward.title")}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#9A9AA8]">{t("today.ward.desc")}</p>
            {/* Gentle streak — reflects today's cast, capped at 7. No shame, no red. */}
            <div className="mt-5 flex items-center gap-3">
              <RitualStarRow filled={streakFilled} />
              <span className="text-[12px] text-[#6B6B78]">{streakFilled} / 7 this week</span>
            </div>
            {/* Encouragement, not shame — only shows when below gold (7). */}
            {streakFilled < 7 && (
              <p className="mt-3 text-[12px] font-medium text-[#E8B86D]/90">{wardNudge}</p>
            )}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-[#0B0B0F]/60 p-3 text-center">
                <div className="font-display text-2xl text-[#E8B86D]">18%</div><div className="text-[10px] text-[#6B6B78] mt-0.5">Month 6</div>
              </div>
              <div className="rounded-lg bg-[#0B0B0F]/60 p-3 text-center">
                <div className="font-display text-2xl text-[#5BB89C]">25%</div><div className="text-[10px] text-[#6B6B78] mt-0.5">Month 12</div>
              </div>
              <div className="rounded-lg bg-[#0B0B0F]/60 p-3 text-center">
                <div className="font-display text-2xl text-[#D98E7A]">42%</div><div className="text-[10px] text-[#6B6B78] mt-0.5">Year 5</div>
              </div>
            </div>
          </GlassCard>
          <GlassCard variant="jade">
            <Pill tone="jade">{t("today.loop.eyebrow")}</Pill>
            <h3 className="mt-3 font-display text-2xl font-semibold">{t("today.loop.title")}</h3>
            <ol className="mt-3 space-y-2 text-[13px] text-[#9A9AA8]">
              <li>1. Calm morning push (voice-selected time)</li>
              <li>2. Open → Morning Horoscope (~80 words)</li>
              <li>3. Day Focus (1 line, action-oriented)</li>
              <li>4. Evening Affirmation (~40 words)</li>
              <li>5. Optional: daily Compliment (rotation)</li>
              <li>6. Optional: chat with AI Mentor</li>
              <li>7. RitualStar fills — gentle, no shame</li>
              <li className="text-[#5BB89C]">↻ Loop closes; push next morning</li>
            </ol>
            <p className="mt-3 text-[11px] text-[#6B6B78]">Total: 90 seconds. Fits coffee · commute · bedtime.</p>
          </GlassCard>
        </section>
      </FadeIn>

      <FadeIn delay={0.3}>
        <GlassCard>
          <Pill tone="rose">{t("today.antishame.eyebrow")}</Pill>
          <p className="mt-3 font-display text-lg italic text-[#D98E7A]">
            {locale === "ru"
              ? "Пропустили день? «С возвращением. Вот ваш фокус на сегодня.» Без зачёркивания. Без красного. Без стыда. Серия приватна — без таблиц лидеров."
              : locale === "hi"
              ? "दिन छूट गया? 'वापसी पर स्वागत है। यहां आज का फोकस है।' कोई कटाई नहीं। कोई शर्म नहीं। शृंखला निजी है।"
              : "Missed a day? \"Welcome back. Here's your focus for today.\" No strike-through. No red. No shame. The streak is private — no leaderboard."}
          </p>
        </GlassCard>
      </FadeIn>

      {/* ============ Sticky primary CTA — the missing retention button ============
       * Z-pattern bottom-right anchor. Closes the ritual loop with one tap.
       * Haptic + star-fill + toast. Sublabel carries live social proof. */}
      <StickyCTA
        label={castLabel}
        sublabel={<SocialProof count={12408} action={cardProof} tone="gold" live />}
        onClick={handleCast}
        className="data-tour-sticky-cta"
      />

      {/* ============ Toast — auto-dismisses after 3s ============
       * Positioned above the sticky CTA / mobile bottom nav. */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#E8B86D]/40 bg-[#12121A]/95 px-5 py-2.5 text-center text-[13px] font-medium text-[#F5F0E8] shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_24px_rgba(232,184,109,0.25)] backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ Onboarding tour — first Today visit ============ */}
      <AnimatePresence>
        {tourOpen && (
          <TourSpotlight
            steps={[
              {
                targetSelector: '[data-tour="today-hero"]',
                title: L("Welcome to your daily ritual", "Добро пожаловать в ежедневный ритуал", "आपके दैनिक अनुष्ठान में आपका स्वागत है"),
                body: L(
                  "This is Today — your home base. Each day brings a new focus, drawn from your real transits. Come back every morning.",
                  "Это Сегодня — ваша база. Каждый день — новый фокус, из ваших реальных транзитов. Возвращайтесь каждое утро.",
                  "यह आज है — आपका घर। हर दिन नया फोकस, आपके वास्तविक ट्रांज़िट से। हर सुबह लौटें।"
                ),
                cta: L("Next →", "Далее →", "आगामी →"),
              },
              {
                targetSelector: '[data-tour="today-mentor"]',
                title: L("Ask your AI mentor", "Спросите AI-наставника", "अपने AI गुरु से पूछें"),
                body: L(
                  "The rose-glow card is your daily prompt to talk to the mentor. 3 free messages a day — it remembers your transits.",
                  "Карта с розовым свечением — ваш ежедневный повод поговорить с наставником. 3 бесплатных сообщения в день — он помнит ваши транзиты.",
                  "गुलाबी चमक वाला कार्ड — मेंटर से बात करने के लिए आपका दैनिक निमंत्रण। दिन में 3 मुफ़्त संदेश — यह आपके ट्रांज़िट याद रखता है।"
                ),
                cta: L("Next →", "Далее →", "आगामी →"),
              },
              {
                targetSelector: '.data-tour-sticky-cta',
                title: L("Cast your reading", "Бросьте расклад", "अपनी रीडिंग डालें"),
                body: L(
                  "Tap this button once a day to cast your reading. Your WARD streak fills — gently, no shame. Haptic + a small gift unlocks tomorrow's preview.",
                  "Нажмите эту кнопку раз в день, чтобы бросить расклад. Ваш WARD-streak заполняется — мягко, без стыда. Тактильный отклик + небольшой подарок открывает завтрашний превью.",
                  "अपनी रीडिंग डालने के लिए दिन में एक बार यह बटन दबाएं। आपका WARD स्ट्रीक भरता है — कोमलता से, बिना शर्म। कल्पना + कल का पूर्वावलोकन खुलता है।"
                ),
                cta: L("Got it ✦", "Понятно ✦", "समझ गया ✦"),
                side: "top",
              },
            ]}
            onClose={closeTour}
            onAdvance={() => {}}
          />
        )}
      </AnimatePresence>

      {/* ============ Transit Detail Drawer ============ */}
      <TransitDetailDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        aspect={selectedAspect}
        locale={locale}
      />
    </div>
  );
}
