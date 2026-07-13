"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/* ============ Starfield background ============ */
export function Starfield({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 z-0 starfield", className)}
    />
  );
}

export function CosmicGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 z-0 cosmic-glow", className)}
    />
  );
}

/* ============ GlassCard ============ */
type GlassVariant = "neutral" | "gold" | "jade" | "rose";

const glassClass: Record<GlassVariant, string> = {
  neutral: "glass",
  gold: "glass-gold",
  jade: "glass-jade",
  rose: "glass-rose",
};

export function GlassCard({
  variant = "neutral",
  className,
  children,
  glow,
  ornamental,
  hover,
  shimmer: shimmerOn,
  sheen,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: GlassVariant;
  glow?: boolean;
  ornamental?: boolean;
  hover?: boolean;
  shimmer?: boolean;
  sheen?: boolean;
}) {
  const cornerColor = variant === "gold" ? "#E8B86D" : variant === "jade" ? "#5BB89C" : variant === "rose" ? "#D98E7A" : "#5E8FA8";
  return (
    <div
      className={cn(
        "relative rounded-xl p-5 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
        glassClass[variant],
        glow && variant === "gold" && "glow-gold",
        glow && variant === "jade" && "glow-jade",
        glow && variant === "rose" && "glow-rose",
        hover && "cosmic-card-hover",
        sheen && "astro-card-sheen",
        className
      )}
      {...props}
    >
      {shimmerOn && (
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden">
          <div className="absolute inset-0 cosmic-shimmer" />
        </div>
      )}
      {ornamental && (
        <>
          <span aria-hidden className="pointer-events-none absolute top-1.5 left-1.5 w-3 h-3 border-t border-l rounded-tl-sm" style={{ borderColor: `${cornerColor}80` }} />
          <span aria-hidden className="pointer-events-none absolute top-1.5 right-1.5 w-3 h-3 border-t border-r rounded-tr-sm" style={{ borderColor: `${cornerColor}80` }} />
          <span aria-hidden className="pointer-events-none absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l rounded-bl-sm" style={{ borderColor: `${cornerColor}80` }} />
          <span aria-hidden className="pointer-events-none absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r rounded-br-sm" style={{ borderColor: `${cornerColor}80` }} />
        </>
      )}
      {children}
    </div>
  );
}

/* ============ Pill (chip) ============ */
type PillTone = "gold" | "jade" | "rose" | "muted" | "water";

const pillClass: Record<PillTone, string> = {
  gold: "bg-[#E8B86D]/15 text-[#E8B86D] border-[#E8B86D]/30",
  jade: "bg-[#5BB89C]/15 text-[#5BB89C] border-[#5BB89C]/30",
  rose: "bg-[#D98E7A]/15 text-[#D98E7A] border-[#D98E7A]/30",
  muted: "bg-[#1C1C26] text-[#9A9AA8] border-[#2A2A35]",
  water: "bg-[#5E8FA8]/15 text-[#5E8FA8] border-[#5E8FA8]/30",
};

export function Pill({
  tone = "gold",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        pillClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ============ CosmicButton ============ */
type BtnVariant = "primary" | "ghost" | "jade" | "rose" | "outline";

const btnClass: Record<BtnVariant, string> = {
  primary:
    "bg-gradient-to-br from-[#E8B86D] to-[#D98E7A] text-[#0B0B0F] hover:shadow-[0_0_24px_rgba(232,184,109,0.45)] font-semibold",
  jade: "bg-gradient-to-br from-[#5BB89C] to-[#4A9A82] text-[#0B0B0F] hover:shadow-[0_0_24px_rgba(91,184,156,0.45)] font-semibold",
  rose: "bg-gradient-to-br from-[#D98E7A] to-[#B27361] text-[#0B0B0F] hover:shadow-[0_0_24px_rgba(217,142,122,0.45)] font-semibold",
  ghost: "bg-transparent text-[#F5F0E8] hover:bg-[#1C1C26] border border-[#2A2A35]",
  outline:
    "bg-transparent text-[#E8B86D] border border-[#E8B86D]/40 hover:bg-[#E8B86D]/10",
};

export function CosmicButton({
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
        btnClass[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ============ RitualStar row (gentle streak, no shame) ============ */
export function RitualStarRow({
  filled,
  total = 7,
  className,
}: {
  filled: number;
  total?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)} aria-label={`Streak: ${filled} of ${total} days`}>
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled;
        const isGold = isFilled && filled >= 7;
        return (
          <svg
            key={i}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            className={cn(
              "transition-colors",
              isFilled
                ? isGold
                  ? "text-[#E8B86D]"
                  : "text-[#E8B86D]/80"
                : "text-[#2A2A35]"
            )}
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6L12 2z" />
          </svg>
        );
      })}
    </div>
  );
}

/* ============ SectionHeading ============ */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  variant,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  variant?: "gold" | "jade" | "rose" | "neutral";
  className?: string;
}) {
  const toneColor = variant === "gold" ? "#E8B86D" : variant === "jade" ? "#5BB89C" : variant === "rose" ? "#D98E7A" : "#E8B86D";
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow && (
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#E8B86D]/80">
          {eyebrow}
        </div>
      )}
      <h2
        className={cn(
          "font-display text-3xl md:text-4xl font-semibold leading-tight text-[#F5F0E8]",
          variant === "gold" && "cosmic-text-glow"
        )}
      >
        {title}
      </h2>
      {/* Decorative gradient line that animates in from left */}
      <div
        aria-hidden
        className="h-[2px] w-24 cosmic-line-animate"
        style={{ background: `linear-gradient(90deg, ${toneColor}, #5BB89C, transparent)` }}
      />
      {subtitle && (
        <p className="max-w-2xl text-[15px] leading-relaxed text-[#9A9AA8]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ============ StatTile ============ */
export function StatTile({
  value,
  label,
  tone = "gold",
  percentage,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  tone?: PillTone;
  percentage?: number;
}) {
  const toneColor =
    tone === "gold"
      ? "#E8B86D"
      : tone === "jade"
      ? "#5BB89C"
      : tone === "rose"
      ? "#D98E7A"
      : tone === "water"
      ? "#5E8FA8"
      : "#F5F0E8";
  const toneBg =
    tone === "gold"
      ? "rgba(232,184,109,0.06)"
      : tone === "jade"
      ? "rgba(91,184,156,0.06)"
      : tone === "rose"
      ? "rgba(217,142,122,0.06)"
      : tone === "water"
      ? "rgba(94,143,168,0.06)"
      : "rgba(245,240,232,0.03)";
  return (
    <div
      className="glass rounded-xl p-4 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${toneBg}, rgba(22,22,29,0.62))` }}
    >
      <div className={cn("font-display text-2xl font-semibold cosmic-float")} style={{ color: toneColor }}>
        {value}
      </div>
      <div className="mt-1 text-[12px] leading-snug text-[#9A9AA8]">{label}</div>
      {typeof percentage === "number" && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#1C1C26]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%`, background: toneColor }}
          />
        </div>
      )}
    </div>
  );
}

/* ============ CosmicDivider ============ */
export function CosmicDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-px w-full bg-gradient-to-r from-transparent via-[#2A2A35] to-transparent",
        className
      )}
    />
  );
}

/* ============ Animated entrance ============ */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
