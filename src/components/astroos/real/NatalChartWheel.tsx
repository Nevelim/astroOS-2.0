"use client";
/**
 * NatalChartWheel — enhanced production-quality SVG natal chart wheel.
 * Features: zodiac ring with degree ticks, aspect lines, planet markers,
 * ASC/DSC + MC/IC axes, interactive hover, animated draw-in.
 * Hades 2 cosmic dark theme.
 */
import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ─── Constants ─── */
const ZODIAC_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const ZODIAC_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

const PLANET_GLYPHS: Record<string,string> = {
  Sun:"☉", Moon:"☾", Mercury:"☿", Venus:"♀", Mars:"♂",
  Jupiter:"♃", Saturn:"♄", Uranus:"♅", Neptune:"♆", Pluto:"♇",
  NorthNode:"☊", SouthNode:"☋", Chiron:"⚷",
};

const PLANET_COLORS: Record<string,string> = {
  Sun:"#FBBF24", Moon:"#C4D3E0", Mercury:"#60A5FA", Venus:"#F472B6",
  Mars:"#EF4444", Jupiter:"#A78BFA", Saturn:"#94A3B8",
  Uranus:"#22D3EE", Neptune:"#2DD4BF", Pluto:"#9333EA",
  NorthNode:"#5BB89C", SouthNode:"#D98E7A", Chiron:"#5E8FA8",
};

const MAIN_PLANETS = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"];

/* Aspect definitions */
const ASPECT_DEFS = [
  { name:"conjunction", angle:0, orb:8, symbol:"☌", color:"#E8B86D", dash:"" },
  { name:"sextile",    angle:60, orb:6, symbol:"⚹", color:"#5BB89C", dash:"6 4" },
  { name:"square",     angle:90, orb:7, symbol:"□", color:"#EF4444", dash:"" },
  { name:"trine",      angle:120,orb:8, symbol:"△", color:"#5BB89C", dash:"6 4" },
  { name:"opposition", angle:180,orb:8, symbol:"☍", color:"#D98E7A", dash:"" },
];

interface PlanetPos { planet:string; eclipticLonDeg:number; eclipticLatDeg:number; }

interface ComputedAspect {
  p1:string; p2:string; name:string; symbol:string; angleDiff:number;
  exactAngle:number; orb:number; color:string; dash:string;
}

function computeAspects(planets: PlanetPos[]): ComputedAspect[] {
  const out: ComputedAspect[] = [];
  const main = planets.filter(p => MAIN_PLANETS.includes(p.planet));
  for (let i=0; i<main.length; i++) {
    for (let j=i+1; j<main.length; j++) {
      let diff = Math.abs(main[i].eclipticLonDeg - main[j].eclipticLonDeg);
      if (diff > 180) diff = 360 - diff;
      for (const ad of ASPECT_DEFS) {
        const orbDiff = Math.abs(diff - ad.angle);
        if (orbDiff <= ad.orb) {
          out.push({ p1:main[i].planet, p2:main[j].planet, name:ad.name, symbol:ad.symbol,
            angleDiff:diff, exactAngle:ad.angle, orb:orbDiff, color:ad.color, dash:ad.dash });
          break;
        }
      }
    }
  }
  return out;
}

/* ─── Component ─── */
export interface NatalChartWheelProps {
  planetPositions: PlanetPos[];
  ascendantLonDeg: number;
  midheavenLonDeg?: number;
  size?: number;
  locale?: "ru"|"en"|"hi";
  className?: string;
  showAspects?: boolean;
  onPlanetClick?: (planet: string) => void;
}

export function NatalChartWheel({
  planetPositions, ascendantLonDeg, midheavenLonDeg, size = 500,
  locale = "en", className, showAspects = true, onPlanetClick,
}: NatalChartWheelProps) {
  const [hoveredPlanet, setHoveredPlanet] = useState<string|null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<string|null>(null);

  const asc = ascendantLonDeg;
  const mc = midheavenLonDeg ?? (asc + 90);

  // SVG geometry
  const C = size / 2;
  const OUTER_R = size * 0.47;
  const ZODIAC_R = size * 0.40;
  const DEG_OUTER_R = size * 0.385;
  const DEG_INNER_R = size * 0.365;
  const HOUSE_R = size * 0.33;
  const PLANET_R = size * 0.24;
  const CENTER_R = size * 0.10;

  // Coordinate converter
  const lonToXY = useCallback((lon: number, r: number) => {
    const angle = ((lon - asc) * Math.PI) / 180;
    return { x: C + r * Math.cos(angle), y: C - r * Math.sin(angle) };
  }, [C, asc]);

  // Compute aspects
  const aspects = useMemo(() => showAspects ? computeAspects(planetPositions) : [], [planetPositions, showAspects]);

  // Filter aspects involving hovered/selected planet
  const highlightedAspects = useMemo(() => {
    const key = hoveredPlanet || selectedPlanet;
    if (!key) return aspects;
    return aspects.filter(a => a.p1 === key || a.p2 === key);
  }, [aspects, hoveredPlanet, selectedPlanet]);

  // Determine planet sign
  const lonToSign = (lon: number) => {
    const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
    return { name: ZODIAC_NAMES[idx], glyph: ZODIAC_GLYPHS[idx], deg: Math.floor(lon % 30) };
  };

  const handlePlanetClick = (planet: string) => {
    setSelectedPlanet(prev => prev === planet ? null : planet);
    onPlanetClick?.(planet);
  };

  /* ─── Render ─── */
  return (
    <div className={cn("relative", className)}>
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-full astro-wheel-glow"
        role="img"
        aria-label={locale === "ru" ? "Натальная карта" : locale === "hi" ? "जन्म कुंडली" : "Natal chart wheel"}
      >
        <defs>
          {/* Gradient filters */}
          <radialGradient id="centerGlow">
            <stop offset="0%" stopColor="rgba(232,184,109,0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="planetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
        </defs>

        {/* ─── Outer decorative ring ─── */}
        <circle cx={C} cy={C} r={OUTER_R + 2} fill="none" stroke="rgba(232,184,109,0.08)" strokeWidth="3" />
        <circle cx={C} cy={C} r={OUTER_R} fill="none" stroke="rgba(232,184,109,0.25)" strokeWidth="1" />

        {/* ─── Zodiac segments ─── */}
        {ZODIAC_GLYPHS.map((glyph, i) => {
          const s = lonToXY(i * 30, OUTER_R);
          const e = lonToXY((i + 1) * 30, OUTER_R);
          const si = lonToXY(i * 30, ZODIAC_R);
          const ei = lonToXY((i + 1) * 30, ZODIAC_R);
          const mid = lonToXY(i * 30 + 15, (OUTER_R + ZODIAC_R) / 2);
          const d = `M${s.x} ${s.y} A${OUTER_R} ${OUTER_R} 0 0 0 ${e.x} ${e.y} L${ei.x} ${ei.y} A${ZODIAC_R} ${ZODIAC_R} 0 0 1 ${si.x} ${si.y}Z`;
          const isAscSign = i === Math.floor((((asc % 360) + 360) % 360) / 30);
          return (
            <g key={i}>
              <motion.path
                d={d}
                fill={isAscSign ? "rgba(217,142,122,0.08)" : i % 2 === 0 ? "rgba(232,184,109,0.04)" : "rgba(91,184,156,0.03)"}
                stroke="rgba(232,184,109,0.15)"
                strokeWidth="0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              />
              <text x={mid.x} y={mid.y} fontSize={size * 0.032} fill={isAscSign ? "#D98E7A" : "#E8B86D"}
                textAnchor="middle" dominantBaseline="central" style={{ fontFamily:"serif" }}>
                {glyph}
              </text>
            </g>
          );
        })}

        {/* ─── Degree tick marks ─── */}
        {Array.from({ length: 72 }).map((_, i) => {
          const lon = i * 5;
          const isMajor = lon % 30 === 0;
          const outer = lonToXY(lon, DEG_OUTER_R);
          const inner = lonToXY(lon, DEG_INNER_R + (isMajor ? 0 : 4));
          return (
            <line key={`tick-${i}`}
              x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
              stroke={isMajor ? "rgba(232,184,109,0.4)" : "rgba(245,240,232,0.12)"}
              strokeWidth={isMajor ? 1 : 0.5}
            />
          );
        })}

        {/* ─── House cusp lines ─── */}
        {Array.from({ length: 12 }).map((_, i) => {
          const lon = asc + i * 30;
          const outer = lonToXY(lon, DEG_INNER_R);
          const isAxis = i === 0 || i === 3 || i === 6 || i === 9;
          return (
            <motion.line key={`house-${i}`}
              x1={outer.x} y1={outer.y} x2={C} y2={C}
              stroke={isAxis ? "rgba(245,240,232,0.2)" : "rgba(245,240,232,0.07)"}
              strokeWidth={isAxis ? 1 : 0.5}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4 + i * 0.03, duration: 0.4 }}
            />
          );
        })}

        {/* ─── House numbers ─── */}
        {Array.from({ length: 12 }).map((_, i) => {
          const mid = lonToXY(asc + i * 30 + 15, HOUSE_R);
          return (
            <text key={`hn-${i}`} x={mid.x} y={mid.y}
              fontSize={size * 0.02} fill="rgba(245,240,232,0.25)"
              textAnchor="middle" dominantBaseline="central"
              style={{ fontFamily:"monospace" }}>
              {i + 1}
            </text>
          );
        })}

        {/* ─── Inner circle boundary ─── */}
        <circle cx={C} cy={C} r={DEG_INNER_R} fill="none" stroke="rgba(245,240,232,0.1)" strokeWidth="0.5" />
        <circle cx={C} cy={C} r={PLANET_R + size * 0.04} fill="none" stroke="rgba(232,184,109,0.06)" strokeWidth="0.5" strokeDasharray="2 3" />

        {/* ─── Aspect lines (between planets) ─── */}
        {highlightedAspects.map((a, i) => {
          const p1 = planetPositions.find(p => p.planet === a.p1);
          const p2 = planetPositions.find(p => p.planet === a.p2);
          if (!p1 || !p2) return null;
          const pos1 = lonToXY(p1.eclipticLonDeg, PLANET_R);
          const pos2 = lonToXY(p2.eclipticLonDeg, PLANET_R);
          const isActive = hoveredPlanet || selectedPlanet;
          return (
            <motion.line key={`asp-${a.p1}-${a.p2}`}
              x1={pos1.x} y1={pos1.y} x2={pos2.x} y2={pos2.y}
              stroke={a.color}
              strokeWidth={isActive ? 1.5 : 0.8}
              strokeDasharray={a.dash}
              opacity={isActive ? 0.7 : 0.3}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: isActive ? 0.7 : 0.3 }}
              transition={{ delay: 1 + i * 0.03, duration: 0.4 }}
            />
          );
        })}

        {/* ─── ASC / DSC axis ─── */}
        {(() => {
          const ascP = lonToXY(asc, DEG_INNER_R);
          const dscP = lonToXY(asc + 180, DEG_INNER_R);
          return (
            <g>
              <line x1={ascP.x} y1={ascP.y} x2={dscP.x} y2={dscP.y}
                stroke="rgba(217,142,122,0.25)" strokeWidth="1" />
              {/* ASC label */}
              <circle cx={ascP.x} cy={ascP.y} r={size * 0.014} fill="#D98E7A"
                style={{ filter:"drop-shadow(0 0 4px rgba(217,142,122,0.6))" }} />
              <text x={ascP.x + (ascP.x > C ? size*0.02 : -size*0.02)} y={ascP.y}
                fontSize={size * 0.02} fill="#D98E7A"
                textAnchor={ascP.x > C ? "start" : "end"}
                dominantBaseline="central" style={{ fontFamily:"monospace" }}>ASC</text>
              {/* DSC label */}
              <circle cx={dscP.x} cy={dscP.y} r={size * 0.01} fill="rgba(217,142,122,0.5)" />
              <text x={dscP.x + (dscP.x > C ? size*0.015 : -size*0.015)} y={dscP.y}
                fontSize={size * 0.018} fill="rgba(217,142,122,0.6)"
                textAnchor={dscP.x > C ? "start" : "end"}
                dominantBaseline="central" style={{ fontFamily:"monospace" }}>DSC</text>
            </g>
          );
        })()}

        {/* ─── MC / IC axis ─── */}
        {(() => {
          const mcP = lonToXY(mc, DEG_INNER_R);
          const icP = lonToXY(mc + 180, DEG_INNER_R);
          return (
            <g>
              <line x1={mcP.x} y1={mcP.y} x2={icP.x} y2={icP.y}
                stroke="rgba(91,184,156,0.2)" strokeWidth="0.8" strokeDasharray="3 2" />
              <circle cx={mcP.x} cy={mcP.y} r={size * 0.012} fill="#5BB89C"
                style={{ filter:"drop-shadow(0 0 4px rgba(91,184,156,0.5))" }} />
              <text x={mcP.x} y={mcP.y - size*0.02}
                fontSize={size * 0.02} fill="#5BB89C" textAnchor="middle"
                style={{ fontFamily:"monospace" }}>MC</text>
              <circle cx={icP.x} cy={icP.y} r={size * 0.008} fill="rgba(91,184,156,0.4)" />
              <text x={icP.x} y={icP.y + size*0.025}
                fontSize={size * 0.016} fill="rgba(91,184,156,0.5)" textAnchor="middle"
                style={{ fontFamily:"monospace" }}>IC</text>
            </g>
          );
        })()}

        {/* ─── Center mandala ─── */}
        <circle cx={C} cy={C} r={CENTER_R} fill="url(#centerGlow)" />
        <circle cx={C} cy={C} r={CENTER_R} fill="none" stroke="rgba(232,184,109,0.15)" strokeWidth="0.5" />
        {/* Decorative inner rings */}
        <circle cx={C} cy={C} r={CENTER_R * 0.6} fill="none" stroke="rgba(91,184,156,0.1)" strokeWidth="0.5" />
        <circle cx={C} cy={C} r={CENTER_R * 0.3} fill="none" stroke="rgba(217,142,122,0.08)" strokeWidth="0.5" />
        {/* Center dot */}
        <circle cx={C} cy={C} r={size * 0.008} fill="#E8B86D"
          style={{ filter:"drop-shadow(0 0 6px rgba(232,184,109,0.6))" }} />

        {/* ─── Planet markers ─── */}
        {planetPositions.filter(p => PLANET_GLYPHS[p.planet]).map((p, i) => {
          const pos = lonToXY(p.eclipticLonDeg, PLANET_R);
          const color = PLANET_COLORS[p.planet] ?? "#E8B86D";
          const glyph = PLANET_GLYPHS[p.planet] ?? "•";
          const isHovered = hoveredPlanet === p.planet;
          const isSelected = selectedPlanet === p.planet;
          const isHighlighted = isHovered || isSelected;
          const sign = lonToSign(p.eclipticLonDeg);
          const r = isHighlighted ? size * 0.032 : size * 0.024;
          const fs = isHighlighted ? size * 0.034 : size * 0.026;

          return (
            <motion.g key={p.planet}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + i * 0.06, type:"spring", stiffness:200, damping:18 }}
              onMouseEnter={() => setHoveredPlanet(p.planet)}
              onMouseLeave={() => setHoveredPlanet(null)}
              onClick={() => handlePlanetClick(p.planet)}
              style={{ cursor:"pointer" }}
            >
              {/* Glow ring on hover/select */}
              {isHighlighted && (
                <circle cx={pos.x} cy={pos.y} r={r + 4} fill="none"
                  stroke={color} strokeWidth="1.5" opacity="0.4"
                  style={{ filter:`drop-shadow(0 0 6px ${color}60)` }} />
              )}
              {/* Planet background */}
              <circle cx={pos.x} cy={pos.y} r={r} fill="#0B0B0F"
                stroke={color} strokeWidth="1.2"
                style={{ filter:`drop-shadow(0 0 ${isHighlighted ? 6 : 3}px ${color}80)` }} />
              {/* Planet glyph */}
              <text x={pos.x} y={pos.y} fontSize={fs} fill={color}
                textAnchor="middle" dominantBaseline="central" style={{ fontFamily:"serif" }}>
                {glyph}
              </text>
              {/* Tooltip */}
              <title>{`${p.planet} ${sign.deg}° ${sign.name} (${p.eclipticLonDeg.toFixed(1)}°)`}</title>
            </motion.g>
          );
        })}
      </svg>

      {/* ─── Aspect legend ─── */}
      {showAspects && aspects.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-[#6B6B78]">
          {ASPECT_DEFS.map(ad => (
            <span key={ad.name} className="flex items-center gap-1">
              <svg width="16" height="4" className="shrink-0">
                <line x1="0" y1="2" x2="16" y2="2" stroke={ad.color} strokeWidth="1.5"
                  strokeDasharray={ad.dash || "none"} />
              </svg>
              <span>{ad.symbol}</span>
              <span>{ad.name}</span>
            </span>
          ))}
          <span className="ml-2 text-[#9A9AA8]">
            {aspects.length} {locale === "ru" ? "аспектов" : locale === "hi" ? "पहलू" : "aspects"}
          </span>
        </div>
      )}

      {/* ─── Selected planet detail popup ─── */}
      {selectedPlanet && (() => {
        const p = planetPositions.find(pp => pp.planet === selectedPlanet);
        if (!p) return null;
        const sign = lonToSign(p.eclipticLonDeg);
        const color = PLANET_COLORS[p.planet] ?? "#E8B86D";
        const planetAspects = aspects.filter(a => a.p1 === p.planet || a.p2 === p.planet);
        return (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-xl border p-3"
            style={{ background:`${color}08`, borderColor:`${color}25` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color, fontFamily:"serif" }} className="text-xl">{PLANET_GLYPHS[p.planet]}</span>
              <span style={{ color }} className="font-medium text-sm">{p.planet}</span>
              <span className="text-[#F5F0E8] text-sm">{sign.deg}° {sign.name}</span>
              <span className="text-[10px] text-[#6B6B78] ml-auto">{sign.glyph}</span>
              <button onClick={() => setSelectedPlanet(null)} className="text-[#6B6B78] hover:text-[#F5F0E8] text-xs ml-2">✕</button>
            </div>
            {planetAspects.length > 0 && (
              <div className="space-y-1">
                {planetAspects.map(a => {
                  const otherPlanet = a.p1 === p.planet ? a.p2 : a.p1;
                  const otherColor = PLANET_COLORS[otherPlanet] ?? "#E8B86D";
                  return (
                    <div key={`${a.p1}-${a.p2}`} className="flex items-center gap-1.5 text-[11px]">
                      <span style={{ color:otherColor, fontFamily:"serif" }}>{PLANET_GLYPHS[otherPlanet]}</span>
                      <span style={{ color:a.color }} className="font-medium">{a.symbol} {a.name}</span>
                      <span className="text-[#6B6B78]">{a.exactAngle}° orb {a.orb.toFixed(1)}°</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      })()}
    </div>
  );
}

export default NatalChartWheel;
