"use client";

import { cn } from "@/lib/utils";

type OrbSize = "sm" | "md" | "lg";
type OrbColor = "gold" | "jade" | "rose";

const sizeMap: Record<OrbSize, string> = {
  sm: "w-8 h-8",
  md: "w-14 h-14",
  lg: "w-20 h-20",
};

const colorMap: Record<OrbColor, { gradient: string; glow: string }> = {
  gold: {
    gradient: "from-[#E8B86D]/60 via-[#E8B86D]/30 to-[#B58E4D]/20",
    glow: "0 0 20px rgba(232,184,109,0.3), 0 0 40px rgba(232,184,109,0.1)",
  },
  jade: {
    gradient: "from-[#5BB89C]/60 via-[#5BB89C]/30 to-[#4A9A82]/20",
    glow: "0 0 20px rgba(91,184,156,0.3), 0 0 40px rgba(91,184,156,0.1)",
  },
  rose: {
    gradient: "from-[#D98E7A]/60 via-[#D98E7A]/30 to-[#B27361]/20",
    glow: "0 0 20px rgba(217,142,122,0.3), 0 0 40px rgba(217,142,122,0.1)",
  },
};

/**
 * A floating decorative orb that can be placed anywhere.
 * Shows a gradient sphere with a gentle glow and float animation.
 * Uses CSS gradients + box-shadow for the glow effect.
 * Floats gently with cosmic-float animation.
 */
export function CosmicOrb({
  size = "md",
  color = "gold",
  className,
}: {
  size?: OrbSize;
  color?: OrbColor;
  className?: string;
}) {
  const { gradient, glow } = colorMap[color];

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none rounded-full cosmic-float",
        "bg-gradient-to-br",
        gradient,
        sizeMap[size],
        className
      )}
      style={{ boxShadow: glow }}
    />
  );
}
