"use client";
/**
 * CosmicSkeleton — loading skeleton с cosmic shimmer (Hades 2 style).
 * Заменяет обычные спиннеры на lore-наполненные skeleton screens.
 */
import { motion } from "framer-motion";

interface CosmicSkeletonProps {
  variant?: "card" | "line" | "circle" | "hexagram";
  className?: string;
  lore?: string;
}

export function CosmicSkeleton({ variant = "line", className, lore }: CosmicSkeletonProps) {
  const baseStyle = {
    background: "linear-gradient(90deg, rgba(232,184,109,0.05) 0%, rgba(91,184,156,0.1) 50%, rgba(232,184,109,0.05) 100%)",
    backgroundSize: "200% 100%",
    animation: "astro-shimmer 2s linear infinite",
    borderRadius: variant === "circle" ? "50%" : "8px",
  };

  if (variant === "card") {
    return (
      <div className={`p-5 rounded-xl ${className ?? ""}`} style={{ background: "rgba(11,11,15,0.4)", border: "1px solid rgba(232,184,109,0.1)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full" style={baseStyle} />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/3 rounded" style={baseStyle} />
            <div className="h-2 w-1/3 rounded" style={baseStyle} />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded" style={baseStyle} />
          <div className="h-2 w-5/6 rounded" style={baseStyle} />
          <div className="h-2 w-4/6 rounded" style={baseStyle} />
        </div>
        {lore && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mt-3 text-[11px] font-serif italic text-center"
            style={{ color: "#F5F0E860" }}
          >
            {lore}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === "circle") {
    return <div className={className} style={{ ...baseStyle, width: 40, height: 40 }} />;
  }

  if (variant === "hexagram") {
    return (
      <div className={`flex flex-col items-center gap-1 ${className ?? ""}`}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: [0.3, 0.7, 0.3], scaleX: 1 }}
            transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity }}
            className="w-20 h-2 rounded-sm"
            style={{ background: "#E8B86D40" }}
          />
        ))}
        {lore && (
          <p className="mt-2 text-[11px] font-serif italic" style={{ color: "#F5F0E860" }}>{lore}</p>
        )}
      </div>
    );
  }

  return <div className={className} style={{ ...baseStyle, height: 12, width: "100%" }} />;
}

export function CosmicSkeletonList({ count = 3, lore }: { count?: number; lore?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CosmicSkeleton key={i} variant="card" lore={i === count - 1 ? lore : undefined} />
      ))}
    </div>
  );
}

export default CosmicSkeleton;
