"use client";
/**
 * AspectGrid — triangular aspect matrix (planet × planet).
 * Classic astrology grid visualization with aspect symbols at intersections.
 * Hades 2 cosmic dark theme with hover interactivity.
 */
import { useMemo, useState } from "react";
import { GlassCard, Pill, FadeIn } from "../ui";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const PLANET_GLYPHS: Record<string,string> = {
  Sun:"☉", Moon:"☾", Mercury:"☿", Venus:"♀", Mars:"♂",
  Jupiter:"♃", Saturn:"♄", Uranus:"♅", Neptune:"♆", Pluto:"♇",
};
const PLANET_COLORS: Record<string,string> = {
  Sun:"#FBBF24", Moon:"#C4D3E0", Mercury:"#60A5FA", Venus:"#F472B6",
  Mars:"#EF4444", Jupiter:"#A78BFA", Saturn:"#94A3B8",
  Uranus:"#22D3EE", Neptune:"#2DD4BF", Pluto:"#9333EA",
};
const MAIN_PLANETS = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"];

const ASPECT_DEFS = [
  { name:"conjunction", angle:0, orb:8, symbol:"☌", color:"#E8B86D" },
  { name:"sextile",    angle:60, orb:6, symbol:"⚹", color:"#5BB89C" },
  { name:"square",     angle:90, orb:7, symbol:"□", color:"#EF4444" },
  { name:"trine",      angle:120,orb:8, symbol:"△", color:"#5BB89C" },
  { name:"opposition", angle:180,orb:8, symbol:"☍", color:"#D98E7A" },
];

const ASPECT_MEANINGS: Record<string,{en:string;ru:string;hi:string}> = {
  conjunction:{ en:"Fusion · intensity", ru:"Слияние · интенсивность", hi:"विलय · तीव्रता" },
  sextile:   { en:"Opportunity · flow", ru:"Возможность · поток", hi:"अवसर · प्रवाह" },
  square:    { en:"Tension · growth", ru:"Напряжение · рост", hi:"तनाव · विकास" },
  trine:     { en:"Ease · talent", ru:"Лёгкость · талант", hi:"सहज · प्रतिभा" },
  opposition:{ en:"Polarity · balance", ru:"Полярность · баланс", hi:"ध्रुवीकरण · संतुलन" },
};

interface PlanetPos { planet:string; eclipticLonDeg:number; eclipticLatDeg:number; }

interface AspectCell {
  p1:string; p2:string; name:string; symbol:string; color:string;
  angleDiff:number; exactAngle:number; orb:number;
}

function computeGrid(planets: PlanetPos[]): AspectCell[][] {
  const main = planets.filter(p => MAIN_PLANETS.includes(p.planet));
  const grid: AspectCell[][] = [];
  for (let i = 0; i < main.length; i++) {
    const row: AspectCell[] = [];
    for (let j = 0; j <= i; j++) {
      if (i === j) { row.push({ p1:main[i].planet, p2:main[j].planet, name:"—", symbol:"", color:"#2A2A35", angleDiff:0, exactAngle:0, orb:0 }); continue; }
      let diff = Math.abs(main[i].eclipticLonDeg - main[j].eclipticLonDeg);
      if (diff > 180) diff = 360 - diff;
      let found: AspectCell | null = null;
      for (const ad of ASPECT_DEFS) {
        const orbDiff = Math.abs(diff - ad.angle);
        if (orbDiff <= ad.orb) {
          found = { p1:main[i].planet, p2:main[j].planet, name:ad.name, symbol:ad.symbol, color:ad.color,
            angleDiff:diff, exactAngle:ad.angle, orb:orbDiff };
          break;
        }
      }
      row.push(found ?? { p1:main[i].planet, p2:main[j].planet, name:"none", symbol:"", color:"#1C1C26",
        angleDiff:diff, exactAngle:0, orb:999 });
    }
    grid.push(row);
  }
  return grid;
}

export interface AspectGridProps {
  planetPositions: PlanetPos[];
  locale?: "ru"|"en"|"hi";
}

export function AspectGrid({ planetPositions, locale = "en" }: AspectGridProps) {
  const [hoveredCell, setHoveredCell] = useState<AspectCell|null>(null);
  const grid = useMemo(() => computeGrid(planetPositions), [planetPositions]);
  const t = (ru:string, en:string, hi:string) => locale === "ru" ? ru : locale === "hi" ? hi : en;

  const cellSize = 38;
  const labelSize = 42;
  const totalSize = labelSize + cellSize * MAIN_PLANETS.length;
  const mainPlanets = planetPositions.filter(p => MAIN_PLANETS.includes(p.planet));

  return (
    <FadeIn>
      <GlassCard variant="jade" className="p-5 relative" ornamental glow>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none" style={{
          background:"radial-gradient(circle, rgba(91,184,156,0.06) 0%, transparent 70%)",
        }} />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color:"#5BB89C" }} />
            <h3 className="font-serif text-lg text-[#F5F0E8]">
              {t("Матрица аспектов", "Aspect Matrix", "पहलू मैट्रिक्स")}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded ml-auto" style={{ background:"#5BB89C20", color:"#5BB89C" }}>
              {t("Наведите для деталей", "Hover for details", "विवरण के लिए होवर करें")}
            </span>
          </div>

          <div className="overflow-x-auto scrollbar-astro">
            <svg width={totalSize} height={totalSize} viewBox={`0 0 ${totalSize} ${totalSize}`} className="max-w-full">
              {/* Column headers (top) */}
              {mainPlanets.map((p, j) => {
                const x = labelSize + j * cellSize + cellSize / 2;
                const color = PLANET_COLORS[p.planet] ?? "#E8B86D";
                return (
                  <g key={`col-${p.planet}`}>
                    <text x={x} y={labelSize - 8} fontSize="13" fill={color} textAnchor="middle"
                      style={{ fontFamily:"serif" }}>{PLANET_GLYPHS[p.planet]}</text>
                  </g>
                );
              })}

              {/* Rows */}
              {grid.map((row, i) => {
                const y = labelSize + i * cellSize;
                const planetColor = PLANET_COLORS[MAIN_PLANETS[i]] ?? "#E8B86D";
                return (
                  <g key={`row-${i}`}>
                    {/* Row header */}
                    <text x={labelSize - 8} y={y + cellSize / 2 + 4} fontSize="13" fill={planetColor}
                      textAnchor="end" style={{ fontFamily:"serif" }}>
                      {PLANET_GLYPHS[MAIN_PLANETS[i]]}
                    </text>

                    {/* Cells */}
                    {row.map((cell, j) => {
                      const cx = labelSize + j * cellSize + cellSize / 2;
                      const cy = y + cellSize / 2;
                      const isAspect = cell.name !== "—" && cell.name !== "none";
                      const isHovered = hoveredCell && hoveredCell.p1 === cell.p1 && hoveredCell.p2 === cell.p2;
                      return (
                        <g key={`cell-${i}-${j}`}
                          onMouseEnter={() => isAspect && setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{ cursor: isAspect ? "pointer" : "default" }}
                        >
                          {/* Cell background */}
                          <rect x={labelSize + j * cellSize + 1} y={y + 1}
                            width={cellSize - 2} height={cellSize - 2} rx={4}
                            fill={isAspect ? `${cell.color}10` : "rgba(28,28,38,0.3)"}
                            stroke={isHovered ? cell.color : isAspect ? `${cell.color}25` : "transparent"}
                            strokeWidth={isHovered ? 1.5 : 0.5}
                          />
                          {/* Aspect symbol */}
                          {isAspect && (
                            <text x={cx} y={cy + 1} fontSize="14" fill={cell.color}
                              textAnchor="middle" dominantBaseline="central"
                              style={{ fontFamily:"serif" }}>
                              {cell.symbol}
                            </text>
                          )}
                          {/* Diagonal (same planet) */}
                          {i === j && (
                            <text x={cx} y={cy + 1} fontSize="10" fill="rgba(42,42,53,0.6)"
                              textAnchor="middle" dominantBaseline="central"
                              style={{ fontFamily:"serif" }}>·</text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Hovered aspect detail */}
          {hoveredCell && hoveredCell.name !== "—" && hoveredCell.name !== "none" && (() => {
            const meaning = ASPECT_MEANINGS[hoveredCell.name];
            const p1Color = PLANET_COLORS[hoveredCell.p1] ?? "#E8B86D";
            const p2Color = PLANET_COLORS[hoveredCell.p2] ?? "#E8B86D";
            return (
              <motion.div
                initial={{ opacity:0, y:4 }}
                animate={{ opacity:1, y:0 }}
                className="mt-3 rounded-lg border p-3 flex items-center gap-3"
                style={{ background:`${hoveredCell.color}08`, borderColor:`${hoveredCell.color}25` }}
              >
                <div className="flex items-center gap-1.5 text-base">
                  <span style={{ color:p1Color, fontFamily:"serif" }}>{PLANET_GLYPHS[hoveredCell.p1]}</span>
                  <span style={{ color:hoveredCell.color }} className="font-bold">{hoveredCell.symbol}</span>
                  <span style={{ color:p2Color, fontFamily:"serif" }}>{PLANET_GLYPHS[hoveredCell.p2]}</span>
                </div>
                <div>
                  <div className="text-[12px] font-medium text-[#F5F0E8]">
                    {hoveredCell.p1} – {hoveredCell.p2}
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded capitalize"
                      style={{ background:`${hoveredCell.color}20`, color:hoveredCell.color }}>
                      {hoveredCell.name}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#9A9AA8] mt-0.5">
                    {hoveredCell.exactAngle}° · orb {hoveredCell.orb.toFixed(1)}°
                    {meaning && <span className="ml-2" style={{ color:`${hoveredCell.color}CC` }}>
                      {locale === "ru" ? meaning.ru : locale === "hi" ? meaning.hi : meaning.en}
                    </span>}
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-[#8A8A96]">
            {ASPECT_DEFS.map(ad => (
              <span key={ad.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background:ad.color }} />
                <span style={{ color:ad.color, fontFamily:"serif" }}>{ad.symbol}</span>
                <span>{ad.name}</span>
              </span>
            ))}
          </div>
        </div>
      </GlassCard>
    </FadeIn>
  );
}

export default AspectGrid;
