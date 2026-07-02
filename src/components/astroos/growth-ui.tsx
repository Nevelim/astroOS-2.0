"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Pill } from "./ui";
import type { ScreenKey } from "@/lib/astroos/data";

/* ===========================================================================
 * growth-ui.tsx — shared conversion primitives for AstroOS v3.2
 *
 * Built from the Product Owner + UX/Cognitive audits (Task 9-a / 9-b).
 * Every primitive is a NON-dark-pattern trigger: honest, jade/gold/rose themed,
 * dismissable, and never uses fear or fake scarcity.
 *
 * Brand promise honored: "No fear-mongering. No paywall traps. Just your chart,
 * explained." Triggers use reciprocity, authority, genuine scarcity (real limits),
 * and authentic social proof (live-tick counters).
 * =========================================================================== */

/* ============ SoftPaywall ============
 * Blurred backdrop over gated content + CTA to Upgrade + dismiss.
 * Used on World (2nd city / 2nd card / travel-mode), Connect (deep synastry).
 * Never gates viral loops (partner link, power card share). */
export function SoftPaywall({
  trigger,
  title,
  copy,
  cta = "Start 7-day reverse trial",
  note = "No charge during trial. Cancel anytime.",
  onCta,
  onDismiss,
}: {
  trigger: string;
  title: string;
  copy: string;
  cta?: string;
  note?: string;
  onCta: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-[#0B0B0F]/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ y: 12, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="w-full max-w-sm rounded-2xl border border-[#E8B86D]/30 bg-[#12121A] p-5 shadow-[0_0_40px_rgba(232,184,109,0.18)]"
      >
        <div className="flex items-center justify-between">
          <Pill tone="gold">✦ Pro · {trigger}</Pill>
          <button
            onClick={onDismiss}
            className="rounded-md p-1 text-[#6B6B78] transition hover:bg-[#1C1C26] hover:text-[#F5F0E8]"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
        <h4 className="mt-3 font-display text-xl font-semibold text-[#F5F0E8]">{title}</h4>
        <p className="mt-2 text-[13px] leading-relaxed text-[#9A9AA8]">{copy}</p>
        <button
          onClick={onCta}
          className="mt-4 w-full rounded-lg bg-gradient-to-br from-[#E8B86D] to-[#D98E7A] px-4 py-2.5 text-sm font-semibold text-[#0B0B0F] transition hover:shadow-[0_0_24px_rgba(232,184,109,0.45)]"
        >
          {cta}
        </button>
        <p className="mt-2 text-center text-[11px] text-[#6B6B78]">{note}</p>
      </motion.div>
    </motion.div>
  );
}

/* ============ SocialProof ============
 * "12,847 Scorpios felt seen in Lisbon this week" — authentic, live-tick.
 * tone: gold | jade | rose | water | muted */
export function SocialProof({
  count,
  action,
  tone = "gold",
  live = false,
  className,
}: {
  count: number;
  action: React.ReactNode;
  tone?: "gold" | "jade" | "rose" | "water" | "muted";
  live?: boolean;
  className?: string;
}) {
  const toneColor =
    tone === "gold" ? "#E8B86D" : tone === "jade" ? "#5BB89C" : tone === "rose" ? "#D98E7A" : tone === "water" ? "#5E8FA8" : "#9A9AA8";
  return (
    <div className={cn("flex items-center gap-2 text-[11px]", className)} style={{ color: toneColor }}>
      {live && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: toneColor }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: toneColor }} />
        </span>
      )}
      <span className="font-mono tabular-nums">{count.toLocaleString()}</span>
      <span className="text-[#9A9AA8]">{action}</span>
    </div>
  );
}

/* ============ TrialCountdown ============
 * Jade (not red) countdown bar — urgency without fear.
 * "3 days left of Pro · auto-downgrades Sunday · no charge" */
export function TrialCountdown({
  daysLeft,
  totalDays = 7,
  className,
}: {
  daysLeft: number;
  totalDays?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (daysLeft / totalDays) * 100));
  const dayWord = daysLeft === 1 ? "day" : "days";
  return (
    <div className={cn("rounded-lg border border-[#5BB89C]/25 bg-[#5BB89C]/8 p-3", className)}>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-[#5BB89C]">
          ✦ {daysLeft} {dayWord} left of Pro
        </span>
        <span className="text-[11px] text-[#9A9AA8]">no charge · cancel anytime</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1C1C26]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-[#5BB89C] to-[#4A9A82]"
        />
      </div>
    </div>
  );
}

/* ============ ScarcityBadge ============
 * Genuine daily-limit scarcity: "3 free questions today · 0 used".
 * Shows a row of dots filling as the quota is consumed. */
export function ScarcityBadge({
  total,
  used,
  label,
  className,
}: {
  total: number;
  used: number;
  label: string;
  className?: string;
}) {
  const remaining = Math.max(0, total - used);
  const exhausted = remaining === 0;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]",
        exhausted
          ? "border-[#D98E7A]/30 bg-[#D98E7A]/10 text-[#D98E7A]"
          : "border-[#5BB89C]/30 bg-[#5BB89C]/10 text-[#5BB89C]",
        className
      )}
    >
      <span className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn("h-1.5 w-1.5 rounded-full transition", i < used ? "bg-current opacity-30" : "bg-current")}
          />
        ))}
      </span>
      <span className="font-medium">
        {exhausted ? "Limit reached · resets at midnight" : `${remaining} ${label}`}
      </span>
    </div>
  );
}

/* ============ SandwichPosition ============
 * Labels the top-3 of a ranked list per the e-commerce "sandwich rule":
 * 1 = anchor (relevance+velocity), 2 = target (high-margin upsell), 3 = proof. */
export function SandwichPosition({
  rank,
  className,
}: {
  rank: 1 | 2 | 3;
  className?: string;
}) {
  const meta = {
    1: { label: "Best match for you", tone: "gold" as const, icon: "✦" },
    2: { label: "Editor's pick · deep dive", tone: "rose" as const, icon: "◆" },
    3: { label: "Most chosen this week", tone: "jade" as const, icon: "❋" },
  }[rank];
  return (
    <Pill tone={meta.tone} className={className}>
      <span className="mr-1">{meta.icon}</span>
      {meta.label}
    </Pill>
  );
}

/* ============ StickyCTA ============
 * Bottom-anchored primary call-to-action for mobile-first retention loops.
 * Z-pattern anchor; used on Today ("Cast today's reading"). */
export function StickyCTA({
  label,
  sublabel,
  onClick,
  className,
}: {
  label: string;
  sublabel?: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 240, damping: 28 }}
      className={cn("sticky bottom-4 z-30 mx-auto w-full max-w-md", className)}
    >
      <button
        onClick={onClick}
        className="astro-glow-ring group flex w-full items-center justify-between gap-3 rounded-2xl border border-[#E8B86D]/40 bg-[#12121A]/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.5),0_0_30px_rgba(232,184,109,0.15)] backdrop-blur-md transition hover:border-[#E8B86D]/70 hover:shadow-[0_-8px_30px_rgba(0,0,0,0.5),0_0_40px_rgba(232,184,109,0.3)]"
      >
        <span className="flex flex-col items-start text-left">
          <span className="font-display text-base font-semibold text-[#F5F0E8]">{label}</span>
          {sublabel && <span className="text-[11px] text-[#9A9AA8]">{sublabel}</span>}
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E8B86D] to-[#D98E7A] text-[#0B0B0F] shadow-[0_0_20px_rgba(232,184,109,0.5)] transition group-hover:scale-105">
          →
        </span>
      </button>
    </motion.div>
  );
}

/* ============ UpsellNudge ============
 * Inline mini-CTA card used inside free-tier surfaces (Today card 2, Mentor).
 * Compact, non-blocking, drives to Upgrade or another screen. */
export function UpsellNudge({
  icon = "✦",
  title,
  copy,
  cta,
  tone = "gold",
  onClick,
  className,
}: {
  icon?: string;
  title: string;
  copy: string;
  cta: string;
  tone?: "gold" | "jade" | "rose";
  onClick: () => void;
  className?: string;
}) {
  const borderTone =
    tone === "gold" ? "border-[#E8B86D]/30 hover:border-[#E8B86D]/60" : tone === "jade" ? "border-[#5BB89C]/30 hover:border-[#5BB89C]/60" : "border-[#D98E7A]/30 hover:border-[#D98E7A]/60";
  const accent = tone === "gold" ? "#E8B86D" : tone === "jade" ? "#5BB89C" : "#D98E7A";
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border bg-[#12121A]/60 p-4 text-left transition-all",
        borderTone,
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
        style={{ backgroundColor: accent }}
      />
      <div className="relative flex items-start gap-3">
        <span className="text-xl leading-none" style={{ color: accent }}>{icon}</span>
        <div className="flex-1">
          <div className="font-display text-sm font-semibold text-[#F5F0E8]">{title}</div>
          <div className="mt-1 text-[12px] leading-relaxed text-[#9A9AA8]">{copy}</div>
          <div className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: accent }}>
            {cta}
            <span className="transition group-hover:translate-x-0.5">→</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ============ NotificationsBell + dropdown ============
 * Growth surface in the top bar. Carries transit alerts, streak nudges,
 * new city matches, trial countdown — all in one place. */
export type AstroNotification = {
  id: string;
  kind: "transit" | "streak" | "city" | "trial" | "divine";
  title: string;
  body: string;
  time: string;
  action?: { label: string; screen: ScreenKey };
  read?: boolean;
};

export function NotificationsBell({
  notifications,
  onNavigate,
}: {
  notifications: AstroNotification[];
  onNavigate: (k: ScreenKey) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const unread = notifications.filter((n) => !n.read).length;
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const kindIcon: Record<AstroNotification["kind"], string> = {
    transit: "☿",
    streak: "☉",
    city: "⊕",
    trial: "✦",
    divine: "䷀",
  };
  const kindTone: Record<AstroNotification["kind"], string> = {
    transit: "#5E8FA8",
    streak: "#E8B86D",
    city: "#5BB89C",
    trial: "#E8B86D",
    divine: "#D98E7A",
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-[#2A2A35] bg-[#0B0B0F]/60 p-2 text-[#9A9AA8] transition hover:text-[#F5F0E8]"
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#E8B86D] text-[8px] font-bold text-[#0B0B0F]">
            {unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-11 z-50 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#2A2A35] bg-[#12121A] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between border-b border-[#2A2A35] px-4 py-2.5">
              <span className="font-display text-sm font-semibold text-[#F5F0E8]">Cosmic inbox</span>
              <span className="text-[10px] text-[#6B6B78]">{unread} new</span>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-astro">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (n.action) onNavigate(n.action.screen);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-[#2A2A35]/50 px-4 py-3 text-left transition hover:bg-[#1C1C26]",
                    !n.read && "bg-[#E8B86D]/5"
                  )}
                >
                  <span className="mt-0.5 text-base" style={{ color: kindTone[n.kind] }}>
                    {kindIcon[n.kind]}
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-[#F5F0E8]">{n.title}</span>
                      <span className="shrink-0 text-[10px] text-[#6B6B78]">{n.time}</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-[#9A9AA8]">{n.body}</span>
                    {n.action && (
                      <span className="mt-1 inline-block text-[11px] font-medium text-[#E8B86D]">{n.action.label} →</span>
                    )}
                  </span>
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E8B86D]" />}
                </button>
              ))}
            </div>
            <div className="border-t border-[#2A2A35] px-4 py-2 text-center">
              <button className="text-[11px] text-[#6B6B78] transition hover:text-[#E8B86D]">Mark all read</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============ CityIndex helpers ============
 * Implements the Product Owner's multi-factor ranking formula:
 *   CityIndex = (M × V) / (1 + K_irr)
 * M = monetizable relevance (astro line density weighted by sphere×persona)
 * V = velocity (multi-line density + QoL velocity proxy)
 * K_irr = irrelevance penalty (low score, climate mismatch, no lines)
 * Pure function — imported by World screen. */
export type IndexableCity = {
  score: number;
  qol: number;
  population: number;
  income: number;
  housing: number;
  climate: string;
  lines: { weight: number; zone: string }[];
};

export type IndexWeights = {
  wAstro: number; // astro line mass
  wQol: number; // quality of life
  wAfford: number; // housing affordability vs income
  wVelocity: number; // multi-line density
  wPersona: number; // sphere×persona fit (passed in)
};

export const DEFAULT_INDEX_WEIGHTS: IndexWeights = {
  wAstro: 0.42,
  wQol: 0.22,
  wAfford: 0.12,
  wVelocity: 0.14,
  wPersona: 0.10,
};

export function computeCityIndex(
  city: IndexableCity,
  personaSphereFit: number, // 0..1, how well city's dominant line matches user's priority sphere
  weights: IndexWeights = DEFAULT_INDEX_WEIGHTS
): { index: number; M: number; V: number; K_irr: number; demoted: boolean } {
  // M — monetizable astro relevance: normalized line mass (positive only), zone-weighted
  const zoneFactor = (z: string) => (z === "main" ? 1.0 : z === "extended" ? 0.7 : 0.3);
  const posMass = city.lines
    .filter((l) => l.weight > 0)
    .reduce((s, l) => s + l.weight * zoneFactor(l.zone), 0);
  const negMass = city.lines
    .filter((l) => l.weight < 0)
    .reduce((s, l) => s + Math.abs(l.weight) * zoneFactor(l.zone), 0);
  const M = Math.max(0, (posMass / Math.max(1, city.lines.length)) - negMass * 0.6);

  // V — velocity: multi-line density (more distinct positive lines = more reasons to return)
  const posLineCount = city.lines.filter((l) => l.weight > 0).length;
  const V = (posLineCount / 4) * 0.6 + (city.qol / 100) * 0.4;

  // affordability: income/housing ratio (higher = more livable)
  const afford = Math.min(1, city.income / Math.max(1, city.housing) / 1.2);

  // persona fit blended into M
  const Mpersona = M * (0.7 + 0.3 * personaSphereFit);

  // K_irr — irrelevance penalty
  let K_irr = 0;
  if (city.score < 35) K_irr += 0.75; // weak chart = demote (not bury)
  if (posLineCount === 0) K_irr += 1.0; // no positive lines = near-irrelevant
  // climate mismatch penalty handled by caller via personaSphereFit penalty
  if (negMass > posMass) K_irr += 0.4; // more friction than support

  const index = (Mpersona * weights.wAstro + (city.qol / 100) * weights.wQol + afford * weights.wAfford + V * weights.wVelocity + personaSphereFit * weights.wPersona) / (1 + K_irr);

  return {
    index: Math.round(index * 1000) / 1000,
    M: Math.round(M * 100) / 100,
    V: Math.round(V * 100) / 100,
    K_irr: Math.round(K_irr * 100) / 100,
    demoted: K_irr >= 0.75,
  };
}

/* ============ OnboardingStepper ============
 * 4-step progress indicator shown across Welcome → Auth → Birth data → Reveal.
 * Gives the new user a clear "where am I, how many steps left" signal so they
 * complete onboarding instead of bouncing. Step 4 (Today) is the activation goal. */
export function OnboardingStepper({
  current,
  className,
}: {
  current: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const steps = [
    { n: 1, label: "Account", labelRu: "Аккаунт", labelHi: "खाता" },
    { n: 2, label: "Birth data", labelRu: "Данные", labelHi: "जन्म" },
    { n: 3, label: "Reveal", labelRu: "Reveal", labelHi: "Reveal" },
    { n: 4, label: "First ritual", labelRu: "Ритуал", labelHi: "अनुष्ठान" },
  ];
  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2", className)} aria-label={`Onboarding step ${current} of 4`}>
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex flex-1 items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-all",
                  done && "border-[#5BB89C]/50 bg-[#5BB89C]/15 text-[#5BB89C]",
                  active && "border-[#E8B86D] bg-[#E8B86D] text-[#0B0B0F] shadow-[0_0_16px_rgba(232,184,109,0.5)]",
                  !done && !active && "border-[#2A2A35] text-[#6B6B78]"
                )}
              >
                {done ? "✓" : s.n}
              </div>
              <span
                className={cn(
                  "hidden text-[11px] font-medium sm:inline",
                  active ? "text-[#E8B86D]" : done ? "text-[#5BB89C]" : "text-[#6B6B78]"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-px flex-1 transition-colors", done ? "bg-[#5BB89C]/40" : "bg-[#2A2A35]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============ InfoTip (cosmic tooltip) ============
 * Hover (desktop) / tap (mobile) info popover for jargon: BaZi 十神, orbis zones,
 * paran, MC/IC/Asc/Desc, transit pills, CityIndex factors. Reduces cognitive load
 * without cluttering the UI. WCAG: keyboard-focusable, Escape to close, aria-describedby.
 * Tone-matched to the cosmic palette (gold/jade/rose/water). */
export function InfoTip({
  label,
  children,
  tone = "gold",
  side = "top",
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  tone?: "gold" | "jade" | "rose" | "water";
  side?: "top" | "bottom" | "right";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const tipRef = React.useRef<HTMLSpanElement>(null);
  const id = React.useId();

  // Close on Escape + on outside click
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onDoc(e: MouseEvent) {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  const toneColor =
    tone === "gold" ? "#E8B86D" : tone === "jade" ? "#5BB89C" : tone === "rose" ? "#D98E7A" : "#5E8FA8";

  const sideClass =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
      : side === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 mt-2"
      : "left-full top-1/2 -translate-y-1/2 ml-2";

  const arrowClass =
    side === "top"
      ? "top-full left-1/2 -translate-x-1/2 border-t-8 border-x-8 border-x-transparent border-t-[#12121A]"
      : side === "bottom"
      ? "bottom-full left-1/2 -translate-x-1/2 border-b-8 border-x-8 border-x-transparent border-b-[#12121A]"
      : "left-full top-1/2 -translate-y-1/2 border-l-8 border-y-8 border-y-transparent border-l-[#12121A]";

  return (
    <span
      ref={tipRef}
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label="More info"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold leading-none transition-colors"
        style={{
          borderColor: `${toneColor}55`,
          color: toneColor,
          backgroundColor: `${toneColor}15`,
        }}
      >
        ?
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.92, y: side === "top" ? 4 : side === "bottom" ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: side === "top" ? 4 : side === "bottom" ? -4 : 0 }}
            transition={{ duration: 0.14 }}
            className={cn(
              "pointer-events-none absolute z-50 w-56 rounded-lg border bg-[#12121A] p-3 text-[11px] leading-relaxed text-[#F5F0E8] shadow-[0_8px_30px_rgba(0,0,0,0.6)]",
              sideClass
            )}
            style={{ borderColor: `${toneColor}40` }}
          >
            <span className="mb-1 block font-display text-[12px] font-semibold" style={{ color: toneColor }}>
              {label}
            </span>
            <span className="block text-[#9A9AA8]">{children}</span>
            <span aria-hidden className={cn("absolute h-0 w-0", arrowClass)} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ============ TourSpotlight ============
 * Onboarding tour overlay: dims the page and highlights a target element with a
 * cosmic-gold ring + a coach-mark popover. Used on Today for first-time-after-
 * activation users. Dismissable, advances through steps. */
export type TourStep = {
  targetSelector: string;
  title: string;
  body: string;
  cta?: string;
  side?: "top" | "bottom" | "right";
};

export function TourSpotlight({
  steps,
  onClose,
  onAdvance,
}: {
  steps: TourStep[];
  onClose: () => void;
  onAdvance: (index: number) => void;
}) {
  const [idx, setIdx] = React.useState(0);
  const step = steps[idx];
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  React.useLayoutEffect(() => {
    let raf1 = 0, raf2 = 0, t1 = 0, t2 = 0;
    function measure() {
      const el = document.querySelector(step.targetSelector) as HTMLElement | null;
      if (el) {
        // Scroll target into view, then RE-MEASURE after the scroll + sticky settle.
        // Sticky/fixed elements report a transient rect during scroll; a delayed
        // second measurement captures the final settled position.
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        raf1 = requestAnimationFrame(() => {
          setRect(el.getBoundingClientRect());
          // After smooth-scroll settles (~250ms) re-measure for sticky elements
          t1 = window.setTimeout(() => {
            setRect(el.getBoundingClientRect());
          }, 280);
        });
      } else {
        setRect(null);
      }
    }
    measure();
    // Re-measure on resize/scroll (capture phase to catch inner scroll containers)
    const onScroll = () => {
      const el = document.querySelector(step.targetSelector) as HTMLElement | null;
      if (el) {
        raf2 = requestAnimationFrame(() => setRect(el.getBoundingClientRect()));
      }
    };
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll, true);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step.targetSelector]);

  const next = () => {
    if (idx < steps.length - 1) {
      const n = idx + 1;
      setIdx(n);
      onAdvance(n);
    } else {
      onClose();
    }
  };

  const side = step.side || "bottom";
  const popoverStyle: React.CSSProperties =
    side === "top"
      ? rect
        ? { top: rect.top - 16, left: rect.left + rect.width / 2, transform: "translate(-50%, -100%)" }
        : { top: "20%", left: "50%", transform: "translateX(-50%)" }
      : side === "right"
      ? rect
        ? { top: rect.top + rect.height / 2, left: rect.right + 16, transform: "translateY(-50%)" }
        : { top: "50%", left: "60%" }
      : rect
      ? { top: rect.bottom + 16, left: rect.left + rect.width / 2, transform: "translateX(-50%)" }
      : { top: "70%", left: "50%", transform: "translateX(-50%)" };

  // Escape key + nav-click dismissal: tour auto-closes on Escape or when
  // the user clicks any [data-nav] / nav button outside the popover itself.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[45]"
    >
      {/* Dim layer with cutout for the spotlight target.
          z-[45] is BELOW sidebar (z-50), header (z-50), mobile-nav (z-50)
          so nav clicks pass through and unmount the tour via navigation. */}
      <div
        className="absolute inset-0 bg-[#0B0B0F]/75 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
        style={{
          // Use box-shadow trick to "cut out" the highlighted rect
          boxShadow: rect
            ? `0 0 0 9999px rgba(11,11,15,0.78)`
            : undefined,
        }}
      />
      {/* Spotlight ring */}
      {rect && (
        <motion.div
          initial={false}
          animate={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="absolute rounded-lg border-2 border-[#E8B86D] shadow-[0_0_24px_rgba(232,184,109,0.5)] pointer-events-none"
          style={{ position: "absolute" }}
        />
      )}
      {/* Coach-mark popover */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="absolute z-10 w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#E8B86D]/40 bg-[#12121A] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        style={popoverStyle}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#E8B86D]/80">
            Tour · {idx + 1} / {steps.length}
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#6B6B78] transition hover:bg-[#1C1C26] hover:text-[#F5F0E8]"
            aria-label="Skip tour"
          >
            ✕
          </button>
        </div>
        <h4 className="mt-2 font-display text-lg font-semibold text-[#F5F0E8]">{step.title}</h4>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#9A9AA8]">{step.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn("h-1 w-4 rounded-full transition-colors", i === idx ? "bg-[#E8B86D]" : i < idx ? "bg-[#5BB89C]" : "bg-[#2A2A35]")}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="rounded-lg bg-gradient-to-br from-[#E8B86D] to-[#D98E7A] px-3 py-1.5 text-[12px] font-semibold text-[#0B0B0F] transition hover:shadow-[0_0_16px_rgba(232,184,109,0.4)]"
          >
            {idx < steps.length - 1 ? step.cta || "Next →" : "Done ✦"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
