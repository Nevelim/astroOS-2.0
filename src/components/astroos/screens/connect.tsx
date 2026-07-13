"use client";

import { useState, type ReactElement } from "react";
import {
  GlassCard, Pill, CosmicButton, SectionHeading, FadeIn, CosmicDivider,
} from "../ui";
import { SoftPaywall, SocialProof, InfoTip } from "../growth-ui";
import { useI18n } from "@/lib/astroos/i18n-context";
import { COMPATIBILITY, localized } from "@/lib/astroos/data";
import type { ScreenKey } from "@/lib/astroos/data";
import { AnimatePresence } from "framer-motion";
import { RealConnectPanel } from "../real/RealConnectPanel";
import { SynastryChartOverlay } from "../real/SynastryChartOverlay";

export function ConnectScreen({ onNavigate }: { onNavigate?: (k: ScreenKey) => void } = {}) {
  const { t, locale } = useI18n();
  const c = COMPATIBILITY;

  // === Demo tier toggle — flip to true to preview Pro experience ===
  const isPro = false;

  // When !isPro, the deep report is blurred; `locked` controls whether the
  // SoftPaywall overlay is visible. Dismiss keeps content blurred + shows a
  // small "Locked" pill (reciprocity: partner-link unlock path stays free).
  const [locked, setLocked] = useState(true);

  // Partner link clipboard — genuine viral loop (never gated).
  const [partnerLink] = useState(`https://astroos.app/r/${c.person1.name.toLowerCase()}-x-${c.person2.name.toLowerCase()}-3f8a2`);
  const [copied, setCopied] = useState<"link" | "text" | null>(null);
  const copyToClipboard = async (kind: "link" | "text") => {
    const text =
      kind === "link"
        ? partnerLink
        : locale === "ru"
        ? `${c.person1.name} приглашает вас на AstroOS — создайте свою карту, и ваш полный отчёт совместимости откроется вместе. ${partnerLink}`
        : locale === "hi"
        ? `${c.person1.name} आपको AstroOS पर आमंत्रित करते हैं — अपनी चार्ट बनाएं, पूर्ण संगतता रिपोर्ट खुलेगी। ${partnerLink}`
        : `${c.person1.name} invites you to AstroOS — create your chart and your full compatibility report unlocks together. ${partnerLink}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopied(kind); setTimeout(() => setCopied(null), 2200); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  // QR code toggle — mock SVG QR pattern (visual, not scannable; real impl needs qrcode lib)
  const [showQR, setShowQR] = useState(false);

  // Free preview: top-3 harmony + top-3 friction aspects (the "taste").
  const harmony = c.aspects.filter((a) => a.type === "harmonious").slice(0, 3);
  const friction = c.aspects.filter((a) => a.type === "tense").slice(0, 3);

  const showGate = !isPro;
  const gateVisible = showGate && locked;
  const gateDismissed = showGate && !locked;

  const toneColor = (tone: string) =>
    tone === "jade"
      ? "#5BB89C"
      : tone === "rose"
      ? "#D98E7A"
      : tone === "water"
      ? "#5E8FA8"
      : "#E8B86D";

  return (
    <div className="space-y-10">
      <FadeIn>
        <SectionHeading
          eyebrow={t("connect.eyebrow")}
          title={t("connect.title")}
          subtitle={
            locale === "ru"
              ? "Топ-3 гармонии + топ-3 трения — бесплатно. Полный отчёт — в Pro или когда партнёр создаст профиль."
              : locale === "hi"
              ? "शीर्ष-3 सामंजस्य + शीर्ष-3 घर्षण मुफ़्त। पूर्ण रिपोर्ट Pro में या जब साझीदार प्रोफ़ाइल बनाए।"
              : "Top-3 harmony + top-3 friction free. Full report unlocks in Pro — or when your partner creates a profile."
          }
        />
      </FadeIn>

      {/* Real Cosmic Match — Western + BaZi compatibility via API */}
      <FadeIn delay={0.03}>
        <RealConnectPanel locale={locale} />
      </FadeIn>

      {/* Synastry Chart Overlay — bi-wheel with cross-aspects */}
      <FadeIn delay={0.035}>
        <SynastryChartOverlay locale={locale} />
      </FadeIn>

      {/* Two persons + overall score (FREE) */}
      <FadeIn delay={0.05}>
        <GlassCard variant="gold" glow>
          <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#E8B86D]/40 bg-[#E8B86D]/10 font-display text-2xl text-[#E8B86D]">
                {c.person1.name.charAt(0)}
              </div>
              <div className="mt-2 font-display text-lg">{c.person1.name}</div>
              <div className="text-[10px] text-[#9A9AA8]">{c.person1.sun} Sun · {c.person1.moon} Moon</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <div className="font-display text-5xl text-gradient-gold">{c.overall}</div>
                <InfoTip
                  label={locale === "ru" ? "Overall compatibility (общий счёт)" : locale === "hi" ? "Overall compatibility" : "Overall compatibility"}
                  tone="gold"
                  side="bottom"
                >
                  {locale === "ru"
                    ? "Общий счёт = средневзвешенное по 5 категориям (Любовь 30%, Общение 25%, Страсть 20%, Эмоции 15%, Долгосрочный потенциал 10%). Учитывает 6 планетарных аспектов (Солнце/Луна/Венера/Марс/Меркурий + Солнце-Солнце духовный). Не приговор — карта взаимодействий."
                    : locale === "hi"
                    ? "Overall = 5 श्रेणियों का भारित औसत। प्यार 30%, संवाद 25%, जुनून 20%, भावना 15%, दीर्घकालिक 10%।"
                    : "Overall = weighted average across 5 categories (Love 30%, Communication 25%, Passion 20%, Emotion 15%, Long-term 10%). Factors 6 planetary aspects (Sun/Moon/Venus/Mars/Mercury + Sun-Sun spiritual). Not a verdict — a map of dynamics."}
                </InfoTip>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[#9A9AA8]">overall</div>
              <Pill tone="gold">{localized(locale, c.level)}</Pill>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#5BB89C]/40 bg-[#5BB89C]/10 font-display text-2xl text-[#5BB89C]">
                {c.person2.name.charAt(0)}
              </div>
              <div className="mt-2 font-display text-lg">{c.person2.name}</div>
              <div className="text-[10px] text-[#9A9AA8]">{c.person2.sun} Sun · {c.person2.moon} Moon</div>
            </div>
          </div>
        </GlassCard>
      </FadeIn>

      {/* FREE PREVIEW — top-3 harmony + top-3 friction (the "taste") */}
      <FadeIn delay={0.08}>
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard variant="jade" className="h-full">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Pill tone="jade">✓ Top-3 harmony · free preview</Pill>
                <InfoTip
                  label={locale === "ru" ? "Harmony aspects (гармоничные аспекты)" : locale === "hi" ? "Harmony aspects" : "Harmony aspects"}
                  tone="jade"
                  side="bottom"
                >
                  {locale === "ru"
                    ? "Гармоничные аспекты — трин (120°), секстиль (60°), соединение (0°) с дружественными планетами. Поток энергии между вашими картами: где вы усиливаете друг друга, где отношения просто работают без усилий."
                    : locale === "hi"
                    ? "Harmony aspects — trine (120°), sextile (60°), conjunction (0°). Где вы друг друга усиливаете."
                    : "Harmony aspects — trine (120°), sextile (60°), conjunction (0°) with friendly planets. The energy flow between your charts: where you amplify each other, where the relationship 'just works' without effort."}
                </InfoTip>
              </span>
              <Pill tone="muted">free</Pill>
            </div>
            <ul className="mt-3 space-y-2">
              {harmony.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-[#5BB89C]/20 bg-[#5BB89C]/5 px-3 py-2"
                >
                  <span className="font-mono text-[12px] text-[#F5F0E8]">
                    {a.p1} {a.aspect} {a.p2}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[#5BB89C]">
                    {a.type}
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard variant="rose" className="h-full">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Pill tone="rose">⚠ Top-3 friction · free preview</Pill>
                <InfoTip
                  label={locale === "ru" ? "Friction aspects (напряжённые аспекты)" : locale === "hi" ? "Friction aspects" : "Friction aspects"}
                  tone="rose"
                  side="bottom"
                >
                  {locale === "ru"
                    ? "Напряжённые аспекты — квадратура (90°), оппозиция (180°), соединение с враждебными планетами. Не плохо — это точки роста: где ваши карты трутся, где отношения требуют работы. Часто — самые глубокие точки близости."
                    : locale === "hi"
                    ? "Friction aspects — square (90°), opposition (180°). Точки роста, не плохо."
                    : "Friction aspects — square (90°), opposition (180°), conjunction with hostile planets. Not 'bad' — these are growth edges: where your charts rub, where the relationship asks for work. Often the deepest points of intimacy."}
                </InfoTip>
              </span>
              <Pill tone="muted">free</Pill>
            </div>
            <ul className="mt-3 space-y-2">
              {friction.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-[#D98E7A]/20 bg-[#D98E7A]/5 px-3 py-2"
                >
                  <span className="font-mono text-[12px] text-[#F5F0E8]">
                    {a.p1} {a.aspect} {a.p2}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[#D98E7A]">
                    {a.type}
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </FadeIn>

      {/* GATED SECTION — deep synastry (blurred + SoftPaywall when !isPro) */}
      <FadeIn delay={0.1}>
        <div
          className={`relative rounded-2xl border ${
            showGate
              ? "border-dashed border-[#E8B86D]/40"
              : "border-transparent"
          }`}
        >
          {/* Pro pill + lock indicator in the corner */}
          {showGate && (
            <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E8B86D]/40 bg-[#0B0B0F]/80 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-[#E8B86D] backdrop-blur-sm">
                🔒 Pro
              </span>
            </div>
          )}

          {/* Dismissed-state "Locked" pill (small, non-blocking) */}
          {gateDismissed && (
            <div className="absolute left-3 top-3 z-30">
              <button
                onClick={() => setLocked(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#E8B86D]/40 bg-[#0B0B0F]/80 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-[#E8B86D] backdrop-blur-sm transition hover:border-[#E8B86D]/70"
              >
                🔒 Locked · tap to view offer
              </button>
            </div>
          )}

          <div
            className={
              showGate
                ? "pointer-events-none select-none blur-sm px-3 pb-3 pt-8 sm:px-4 sm:pb-4 sm:pt-8"
                : ""
            }
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Synastry wheel */}
              <GlassCard variant="jade" className="h-full">
                <Pill tone="jade">{t("connect.synastry")}</Pill>
                <div className="mt-4 flex justify-center">
                  <svg viewBox="0 0 360 360" className="h-auto w-full max-w-[340px]">
                    <defs>
                      <radialGradient id="synBg" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#1C1C26" /><stop offset="100%" stopColor="#0B0B0F" />
                      </radialGradient>
                    </defs>
                    {/* Outer wheel = person1, inner wheel = person2 */}
                    <circle cx="180" cy="180" r="165" fill="url(#synBg)" stroke="#E8B86D" strokeWidth="1.5" opacity="0.6" />
                    <circle cx="180" cy="180" r="120" fill="none" stroke="#5BB89C" strokeWidth="1.5" opacity="0.6" />
                    <circle cx="180" cy="180" r="80" fill="none" stroke="#2A2A35" strokeWidth="0.5" />
                    {/* 12 divisions outer */}
                    {Array.from({ length: 12 }).map((_, i) => {
                      const a = (i * 30 - 90) * Math.PI / 180;
                      return <line key={i} x1={180 + 120 * Math.cos(a)} y1={180 + 120 * Math.sin(a)} x2={180 + 165 * Math.cos(a)} y2={180 + 165 * Math.sin(a)} stroke="#2A2A35" strokeWidth="0.5" />;
                    })}
                    {/* Aspect lines between planets */}
                    <line x1="180" y1="70" x2="290" y2="250" stroke="#5BB89C" strokeWidth="1.5" opacity="0.7" />
                    <line x1="110" y1="140" x2="250" y2="210" stroke="#D98E7A" strokeWidth="1.5" opacity="0.6" strokeDasharray="4 2" />
                    <line x1="100" y1="220" x2="260" y2="140" stroke="#E8B86D" strokeWidth="1" opacity="0.5" />
                    <line x1="200" y1="280" x2="160" y2="90" stroke="#5BB89C" strokeWidth="1" opacity="0.4" />
                    {/* Person1 planets (outer ring) */}
                    <g>
                      <circle cx="180" cy="70" r="8" fill="#FBBF24" /><text x="180" y="74" fill="#0B0B0F" fontSize="8" textAnchor="middle" fontWeight="bold">☉</text>
                      <circle cx="110" cy="140" r="8" fill="#94A3B8" /><text x="110" y="144" fill="#0B0B0F" fontSize="8" textAnchor="middle" fontWeight="bold">☾</text>
                      <circle cx="260" cy="140" r="8" fill="#F472B6" /><text x="260" y="144" fill="#0B0B0F" fontSize="8" textAnchor="middle" fontWeight="bold">♀</text>
                    </g>
                    {/* Person2 planets (inner ring) */}
                    <g>
                      <circle cx="290" cy="250" r="7" fill="#FBBF24" opacity="0.7" /><text x="290" y="254" fill="#0B0B0F" fontSize="7" textAnchor="middle" fontWeight="bold">☉</text>
                      <circle cx="250" cy="210" r="7" fill="#94A3B8" opacity="0.7" /><text x="250" y="214" fill="#0B0B0F" fontSize="7" textAnchor="middle" fontWeight="bold">☾</text>
                      <circle cx="160" cy="90" r="7" fill="#F472B6" opacity="0.7" /><text x="160" y="94" fill="#0B0B0F" fontSize="7" textAnchor="middle" fontWeight="bold">♀</text>
                      <circle cx="200" cy="280" r="7" fill="#EF4444" opacity="0.7" /><text x="200" y="284" fill="#0B0B0F" fontSize="7" textAnchor="middle" fontWeight="bold">♂</text>
                    </g>
                    <circle cx="180" cy="180" r="3" fill="#E8B86D" />
                  </svg>
                </div>
                {/* Planet positions table */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded border border-[#E8B86D]/30 p-2">
                    <div className="text-[9px] uppercase text-[#E8B86D]">{c.person1.name}</div>
                    <div className="font-mono text-[#F5F0E8]">☉{c.person1.sun} ☾{c.person1.moon} ♀{c.person1.venus} ♂{c.person1.mars}</div>
                  </div>
                  <div className="rounded border border-[#5BB89C]/30 p-2">
                    <div className="text-[9px] uppercase text-[#5BB89C]">{c.person2.name}</div>
                    <div className="font-mono text-[#F5F0E8]">☉{c.person2.sun} ☾{c.person2.moon} ♀{c.person2.venus} ♂{c.person2.mars}</div>
                  </div>
                </div>
              </GlassCard>

              {/* 5 categories */}
              <GlassCard className="h-full">
                <Pill tone="gold">{t("connect.categories")}</Pill>
                <div className="mt-4 space-y-3">
                  {c.categories.map((cat) => (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-[#F5F0E8]">{localized(locale, cat.name)}</span>
                        <span className="font-mono text-[13px]" style={{ color: toneColor(cat.tone) }}>
                          {cat.score}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#1C1C26]">
                        <div className="h-full rounded-full"
                          style={{ width: `${cat.score}%`, background: toneColor(cat.tone) }} />
                      </div>
                      <div className="mt-1 text-[10px] text-[#9A9AA8]">{localized(locale, cat.desc)}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="mt-6">
              <CosmicDivider />
            </div>

            {/* Aspects + Strengths/Challenges */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <GlassCard>
                <Pill tone="jade">{t("connect.aspects")}</Pill>
                <div className="mt-3 overflow-x-auto scrollbar-astro">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-[9px] uppercase tracking-wider text-[#6B6B78] border-b border-[#2A2A35]">
                        <th className="py-1 pr-2 text-left">P1</th><th className="py-1 pr-2 text-left">P2</th>
                        <th className="py-1 pr-2 text-left">Aspect</th><th className="py-1 pr-2 text-right">Orb</th>
                        <th className="py-1 text-right">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.aspects.map((a, i) => (
                        <tr key={i} className="border-b border-[#22222C]">
                          <td className="py-1.5 pr-2 text-[#F5F0E8]">{a.p1}</td>
                          <td className="py-1.5 pr-2 text-[#F5F0E8]">{a.p2}</td>
                          <td className="py-1.5 pr-2 capitalize" style={{ color: toneColor(a.tone) }}>{a.aspect}</td>
                          <td className="py-1.5 pr-2 text-right font-mono text-[#9A9AA8]">{a.orb}°</td>
                          <td className="py-1.5 text-right text-[10px] capitalize" style={{ color: a.type === "harmonious" ? "#5BB89C" : "#D98E7A" }}>{a.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              <div className="space-y-4">
                <GlassCard variant="jade">
                  <Pill tone="jade">✓ {t("connect.strengths")}</Pill>
                  <ul className="mt-2 space-y-1.5">
                    {c.strengths.map((s, i) => (
                      <li key={i} className="text-[12px] text-[#F5F0E8]/85 leading-relaxed">✓ {localized(locale, s)}</li>
                    ))}
                  </ul>
                </GlassCard>
                <GlassCard variant="rose">
                  <Pill tone="rose">⚠ {t("connect.challenges")}</Pill>
                  <ul className="mt-2 space-y-1.5">
                    {c.challenges.map((s, i) => (
                      <li key={i} className="text-[12px] text-[#F5F0E8]/85 leading-relaxed">⚠ {localized(locale, s)}</li>
                    ))}
                  </ul>
                </GlassCard>
              </div>
            </div>
          </div>

          {/* SoftPaywall overlay (only when locked + !isPro) */}
          <AnimatePresence>
            {gateVisible && (
              <SoftPaywall
                trigger="full synastry"
                title="Unlock your full compatibility report"
                copy="See every aspect, category breakdown, and the strengths-and-frictions map. Pro unlocks Cosmic Match for unlimited partners."
                cta="Start 7-day reverse trial"
                onCta={() => onNavigate?.("upgrade")}
                onDismiss={() => setLocked(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </FadeIn>

      {/* Partner link viral + Family hub — FREE, never gated */}
      <FadeIn delay={0.3}>
        <div className="grid gap-4 md:grid-cols-2">
          <GlassCard variant="gold">
            <div className="flex items-center justify-between">
              <Pill tone="gold">{t("connect.partner")}</Pill>
              <Pill tone="muted">always free · viral loop</Pill>
            </div>
            <p className="mt-3 text-[13px] text-[#9A9AA8] leading-relaxed">
              {locale === "ru"
                ? `Отправьте это ${c.person2.name}. Когда ${c.person2.name} создаст свою карту, ваш полный отчёт откроется вместе — для обоих.`
                : locale === "hi"
                ? `इसे ${c.person2.name} को भेजें। जब ${c.person2.name} अपनी चार्ट बनाएगा, आपकी पूर्ण रिपोर्ट एक साथ खुलेगी।`
                : `Send this to ${c.person2.name}. When ${c.person2.name} creates their chart, your full report unlocks together — for both of you.`}
            </p>
            {/* Partner link display */}
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 px-3 py-2">
              <span className="text-[#5BB89C] text-sm">🔗</span>
              <span className="flex-1 truncate font-mono text-[11px] text-[#9A9AA8]">{partnerLink}</span>
              <AnimatePresence mode="wait">
                {copied === "link" ? (
                  <span key="ok" className="text-[11px] font-medium text-[#5BB89C]">✓ {locale === "ru" ? "Скопировано" : locale === "hi" ? "कॉपी हुआ" : "Copied"}</span>
                ) : (
                  <button
                    key="copy"
                    onClick={() => copyToClipboard("link")}
                    className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-[#E8B86D] transition hover:bg-[#E8B86D]/10"
                  >
                    {locale === "ru" ? "Копировать" : locale === "hi" ? "कॉपी" : "Copy"}
                  </button>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => copyToClipboard("link")}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#E8B86D] to-[#D98E7A] px-4 py-2 text-[12px] font-semibold text-[#0B0B0F] transition hover:shadow-[0_0_20px_rgba(232,184,109,0.4)]"
              >
                {copied === "link" ? "✓ " : "✦ "}{locale === "ru" ? "Скопировать ссылку" : locale === "hi" ? "लिंक कॉपी करें" : "Copy partner link"}
              </button>
              <button
                onClick={() => copyToClipboard("text")}
                className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 px-4 py-2 text-[12px] font-medium text-[#9A9AA8] transition hover:border-[#9A9AA8]/40 hover:text-[#F5F0E8]"
              >
                {copied === "text" ? "✓ " : ""}{copied === "text" ? (locale === "ru" ? "Текст скопирован" : locale === "hi" ? "टेक्स्ट कॉपी" : "Text copied") : (locale === "ru" ? "Копировать текст" : locale === "hi" ? "टेक्स्ट कॉपी" : "Copy share text")}
              </button>
            </div>
            {/* Social share — direct deep links, open in new tab */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-[#6B6B78]">
                {locale === "ru" ? "Поделиться:" : locale === "hi" ? "साझा करें:" : "Share:"}
              </span>
              {[
                {
                  label: "WhatsApp",
                  color: "#25D366",
                  href: `https://wa.me/?text=${encodeURIComponent(locale === "ru" ? `${c.person1.name} приглашает вас на AstroOS — создайте свою карту, и ваш полный отчёт совместимости откроется вместе. ${partnerLink}` : locale === "hi" ? `${c.person1.name} आपको AstroOS पर आमंत्रित करते हैं। ${partnerLink}` : `${c.person1.name} invites you to AstroOS — create your chart and your full compatibility report unlocks together. ${partnerLink}`)}`,
                  icon: "✆",
                },
                {
                  label: "Telegram",
                  color: "#229ED9",
                  href: `https://t.me/share/url?url=${encodeURIComponent(partnerLink)}&text=${encodeURIComponent(locale === "ru" ? "Твоя карта совместимости ждёт" : locale === "hi" ? "आपकी संगतता चार्ट इंतज़ार कर रही है" : "Your compatibility chart awaits")}`,
                  icon: "✈",
                },
                {
                  label: "X",
                  color: "#F5F0E8",
                  href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(locale === "ru" ? `Мы на AstroOS проверили совместимость — ${c.overall}/100. Проверь свою: ${partnerLink}` : locale === "hi" ? `हमने AstroOS पर संगतता जाँची — ${c.overall}/100। ${partnerLink}` : `We checked our compatibility on AstroOS — ${c.overall}/100. Check yours: ${partnerLink}`)}`,
                  icon: "✕",
                },
                {
                  label: "Email",
                  color: "#E8B86D",
                  href: `mailto:?subject=${encodeURIComponent(locale === "ru" ? "Наша карта совместимости" : locale === "hi" ? "हमारी संगतता चार्ट" : "Our compatibility chart")}&body=${encodeURIComponent(locale === "ru" ? `${c.person1.name} приглашает вас на AstroOS — создайте свою карту, и ваш полный отчёт совместимости откроется вместе. ${partnerLink}` : locale === "hi" ? `${c.person1.name} आपको AstroOS पर आमंत्रित करते हैं। ${partnerLink}` : `${c.person1.name} invites you to AstroOS — create your chart and your full compatibility report unlocks together. ${partnerLink}`)}`,
                  icon: "✉",
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 px-2.5 py-1.5 text-[11px] font-medium text-[#9A9AA8] transition hover:border-[#9A9AA8]/40 hover:text-[#F5F0E8]"
                  style={{ color: s.color === "#F5F0E8" ? undefined : s.color }}
                >
                  <span aria-hidden>{s.icon}</span>
                  <span>{s.label}</span>
                </a>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <SocialProof count={2300} action="partner links shared today" tone="jade" live />
              <span className="text-[10px] text-[#6B6B78]">k contribution 0.15–0.25 · queer-inclusive</span>
            </div>
            {/* QR code — scan with phone camera to open partner link on mobile */}
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/40 p-3">
              <button
                onClick={() => setShowQR((v) => !v)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#E8B86D]/30 bg-[#E8B86D]/8 text-xl text-[#E8B86D] transition hover:bg-[#E8B86D]/15"
                aria-label={locale === "ru" ? "Показать QR-код" : locale === "hi" ? "QR कोड दिखाएं" : "Show QR code"}
                aria-expanded={showQR}
              >
                {showQR ? "✕" : "▦"}
              </button>
              <div className="flex-1">
                <div className="text-[12px] font-medium text-[#F5F0E8]">
                  {locale === "ru" ? "QR-код для сканирования" : locale === "hi" ? "स्कैन करने के लिए QR कोड" : "QR code to scan"}
                </div>
                <div className="text-[10px] text-[#6B6B78]">
                  {locale === "ru" ? "Наведите камеру телефона — партнёр откроет ссылку" : locale === "hi" ? "फोन कैमरा से स्कैन करें" : "Point your phone camera — your partner opens the link"}
                </div>
              </div>
              {showQR && (
                <div className="shrink-0 rounded-lg border border-[#2A2A35] bg-[#F5F0E8] p-2" aria-label="QR code">
                  {/* Mock QR pattern — deterministic from partnerLink hash. Real impl: qrcode lib. */}
                  <svg viewBox="0 0 21 21" width="84" height="84" shapeRendering="crispEdges">
                    {(() => {
                      // simple hash → 21×21 grid with finder patterns in 3 corners
                      let h = 0;
                      for (let i = 0; i < partnerLink.length; i++) h = (h * 31 + partnerLink.charCodeAt(i)) >>> 0;
                      const cells: ReactElement[] = [];
                      const isFinder = (r: number, c: number) => {
                        const inBox = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
                        return inBox(0, 0) || inBox(0, 14) || inBox(14, 0);
                      };
                      const finderFill = (r: number, c: number) => {
                        const local = (br: number, bc: number) => {
                          const lr = r - br, lc = c - bc;
                          return lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
                        };
                        if (r >= 0 && r < 7 && c >= 0 && c < 7) return local(0, 0);
                        if (r >= 0 && r < 7 && c >= 14 && c < 21) return local(0, 14);
                        if (r >= 14 && r < 21 && c >= 0 && c < 7) return local(14, 0);
                        return false;
                      };
                      for (let r = 0; r < 21; r++) {
                        for (let c = 0; c < 21; c++) {
                          let fill = false;
                          if (isFinder(r, c)) {
                            fill = finderFill(r, c);
                          } else {
                            h = (h * 1103515245 + 12345) & 0x7fffffff;
                            fill = (h >> 16) % 100 < 48;
                          }
                          if (fill) cells.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0B0B0F" />);
                        }
                      }
                      return cells;
                    })()}
                  </svg>
                </div>
              )}
            </div>
          </GlassCard>
          <GlassCard variant="jade">
            <Pill tone="jade">{t("connect.family")}</Pill>
            <p className="mt-3 text-[13px] text-[#9A9AA8] leading-relaxed">{t("connect.family.desc")}</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex aspect-square items-center justify-center rounded-lg border ${i < 4 ? "border-[#5BB89C]/40 bg-[#5BB89C]/8" : "border-dashed border-[#2A2A35]"}`}>
                  {i < 4 ? <span className="text-[10px] text-[#5BB89C]">✓</span> : <span className="text-[14px] text-[#6B6B78]">+</span>}
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-[#6B6B78]">4 of 5 profiles · Pro feature</div>
          </GlassCard>
        </div>
      </FadeIn>
    </div>
  );
}
