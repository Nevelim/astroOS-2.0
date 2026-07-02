"use client";
/**
 * RealLocalSpacePanel — Local Space compass visualization.
 * Shows planetary lines projected on local horizon (azimuth/altitude).
 * Clean Architecture: Interface Adapter.
 * Hades 2 визуал: compass rose, planet lines, above/below horizon.
 */
import { useState, useEffect } from "react";
import { GlassCard, FadeIn } from "../ui";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Compass } from "lucide-react";
import { useMember, mockMember } from "@/lib/astroos/real/useMember";

interface PlanetLine {
  planet: string;
  glyph: string;
  color: string;
  azimuth: number;
  altitude: number;
  sector: string;
  above: boolean;
}

interface LocalSpaceData {
  birth: { lat: number; lng: number; placeName: string };
  planetLines: PlanetLine[];
  sectors: Array<{ sector: string; planets: PlanetLine[] }>;
  totalAbove: number;
  totalBelow: number;
}

const COMPASS_DIRS: Record<string, string> = {
  N: "С", NNE: "ССВ", NE: "СВ", ENE: "ВСВ",
  E: "В", ESE: "ВЮВ", SE: "ЮВ", SSE: "ЮЮВ",
  S: "Ю", SSW: "ЮЮЗ", SW: "ЮЗ", WSW: "ЗЮЗ",
  W: "З", WNW: "ЗСЗ", NW: "СЗ", NNW: "ССЗ",
};

export function RealLocalSpacePanel({ locale }: { locale: "ru" | "en" | "hi" }) {
  const [data, setData] = useState<LocalSpaceData | null>(null);
  const [loading, setLoading] = useState(true);

  const t = (ru: string, en: string, hi: string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  const { member } = useMember();

  useEffect(() => {
    const m = member ?? mockMember();
    fetch("/api/local-space", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDateTime: m.birth.isoDateTime,
        birthLat: m.birth.lat,
        birthLng: m.birth.lng,
        birthTzOffset: m.birth.tzOffset,
      }),
    })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [member]);

  const SIZE = 300;
  const CENTER = SIZE / 2;
  const OUTER_R = 140;
  const HORIZON_R = 95;
  const INNER_R = 45;

  // Convert azimuth to SVG coordinates (N at top, clockwise)
  const azToXY = (az: number, radius: number) => {
    const angle = ((az - 90) * Math.PI) / 180; // N=0 at top
    return {
      x: CENTER + radius * Math.cos(angle),
      y: CENTER + radius * Math.sin(angle),
    };
  };

  if (loading) {
    return (
      <GlassCard variant="jade" className="p-5" ornamental glow>
        <div className="flex flex-col items-center py-8">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12">
            <Compass className="w-full h-full" style={{ color: "#5BB89C" }} />
          </motion.div>
          <p className="mt-3 text-sm font-serif italic" style={{ color: "#F5F0E8" }}>
            {t("Вычисляю локальное пространство...", "Computing local space...", "स्थानीय अंतरिक्ष गणना...")}
          </p>
        </div>
      </GlassCard>
    );
  }

  if (!data) return null;

  return (
    <FadeIn>
      <GlassCard variant="jade" className="p-5 relative" ornamental glow>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none" style={{
          background: "radial-gradient(circle, rgba(91,184,156,0.12) 0%, transparent 70%)",
        }} />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="w-4 h-4" style={{ color: "#5BB89C" }} />
            <h3 className="font-serif text-lg" style={{ color: "#F5F0E8" }}>
              {t("Локальное пространство", "Local Space", "स्थानीय अंतरिक्ष")}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background: "#5BB89C20", color: "#5BB89C" }}>
              {data.totalAbove}↑ {data.totalBelow}↓
            </span>
          </div>

          <div className="flex justify-center mb-4">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              {/* Outer compass ring */}
              <circle cx={CENTER} cy={CENTER} r={OUTER_R} fill="none" stroke="rgba(91,184,156,0.2)" strokeWidth="1" />
              <circle cx={CENTER} cy={CENTER} r={OUTER_R - 2} fill="none" stroke="rgba(91,184,156,0.4)" strokeWidth="0.5" />

              {/* Horizon line (above/below) */}
              <circle cx={CENTER} cy={CENTER} r={HORIZON_R} fill="none" stroke="rgba(232,184,109,0.3)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={CENTER} y={CENTER - HORIZON_R + 12} fontSize="8" fill="#E8B86D60" textAnchor="middle" style={{ fontFamily: "monospace" }}>
                {t("горизонт", "horizon", "क्षितिज")}
              </text>

              {/* Inner circle */}
              <circle cx={CENTER} cy={CENTER} r={INNER_R} fill="none" stroke="rgba(245,240,232,0.1)" strokeWidth="0.5" />

              {/* Cardinal directions */}
              {[
                { dir: "N", label: locale === "ru" ? "С" : "N", angle: 0 },
                { dir: "E", label: locale === "ru" ? "В" : "E", angle: 90 },
                { dir: "S", label: locale === "ru" ? "Ю" : "S", angle: 180 },
                { dir: "W", label: locale === "ru" ? "З" : "W", angle: 270 },
              ].map((d) => {
                const pos = azToXY(d.angle, OUTER_R + 12);
                return (
                  <text key={d.dir} x={pos.x} y={pos.y} fontSize="12" fontWeight="bold" fill="#5BB89C" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "serif" }}>
                    {d.label}
                  </text>
                );
              })}

              {/* Sector lines (8 main) */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                const inner = azToXY(deg, INNER_R);
                const outer = azToXY(deg, OUTER_R);
                return (
                  <line key={deg} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                    stroke="rgba(91,184,156,0.1)" strokeWidth="0.5" />
                );
              })}

              {/* Center */}
              <circle cx={CENTER} cy={CENTER} r="3" fill="#5BB89C" style={{ filter: "drop-shadow(0 0 4px #5BB89C)" }} />

              {/* Planet lines from center to azimuth position */}
              {data.planetLines.map((p, i) => {
                const radius = p.above ? HORIZON_R + 15 : INNER_R + 10;
                const pos = azToXY(p.azimuth, radius);
                return (
                  <motion.g key={p.planet}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    {/* Line from center to planet */}
                    <line x1={CENTER} y1={CENTER} x2={pos.x} y2={pos.y}
                      stroke={p.color} strokeWidth="1" opacity="0.4" strokeDasharray={p.above ? "none" : "2 2"} />
                    {/* Planet marker */}
                    <circle cx={pos.x} cy={pos.y} r="8" fill="#0B0B0F" stroke={p.color} strokeWidth="1"
                      style={{ filter: `drop-shadow(0 0 3px ${p.color}80)` }} />
                    <text x={pos.x} y={pos.y} fontSize="10" fill={p.color} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "serif" }}>
                      {p.glyph}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
          </div>

          {/* Planet list with azimuth/altitude */}
          <div className="grid grid-cols-2 gap-1.5">
            {data.planetLines.slice(0, 8).map((p) => (
              <div key={p.planet} className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px]"
                style={{ background: `${p.color}10`, border: `1px solid ${p.color}25` }}>
                <span style={{ color: p.color, fontFamily: "serif" }} className="text-sm">{p.glyph}</span>
                <span style={{ color: "#F5F0E8" }}>{p.planet}</span>
                <span className="ml-auto font-mono text-[10px]" style={{ color: p.above ? "#5BB89C" : "#9A9AA8" }}>
                  {p.azimuth}° {p.above ? "↑" : "↓"}
                </span>
              </div>
            ))}
          </div>

          {/* Above/below summary */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg text-center" style={{ background: "#5BB89C10" }}>
              <div className="font-mono text-lg" style={{ color: "#5BB89C" }}>{data.totalAbove}</div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
                {t("Над горизонтом", "Above horizon", "क्षितिज से ऊपर")}
              </div>
            </div>
            <div className="p-2 rounded-lg text-center" style={{ background: "#9A9AA810" }}>
              <div className="font-mono text-lg" style={{ color: "#9A9AA8" }}>{data.totalBelow}</div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: "#F5F0E860" }}>
                {t("Под горизонтом", "Below horizon", "क्षितिज से नीचे")}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default RealLocalSpacePanel;
