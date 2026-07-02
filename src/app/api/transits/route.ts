/**
 * GET /api/transits — текущие астрологические транзиты (real astronomy-engine).
 * Для AI Mentor RAG citations и Today screen.
 * Clean Architecture: использует astronomy-engine через ChartCalculator.
 */
import { NextResponse } from "next/server";
import { loadEngine } from "@/infrastructure/external-services/astronomy/AstronomyEngineChartCalculator";
import {
  getPlanetEclipticLongitude,
  lonToZodiacSign,
  type AstronomyEngineLike,
} from "@/lib/astroos/real/ecliptic";

const TRANSIT_PLANETS = [
  { key: "Sun", symbol: "☉", color: "#FBBF24" },
  { key: "Moon", symbol: "☾", color: "#94A3B8" },
  { key: "Mercury", symbol: "☿", color: "#60A5FA" },
  { key: "Venus", symbol: "♀", color: "#F472B6" },
  { key: "Mars", symbol: "♂", color: "#EF4444" },
  { key: "Jupiter", symbol: "♃", color: "#A78BFA" },
  { key: "Saturn", symbol: "♄", color: "#94A3B8" },
];

export async function GET() {
  try {
    const Astro = (await loadEngine()) as AstronomyEngineLike;
    const now = new Date();

    const transits = TRANSIT_PLANETS.map(({ key, symbol, color }) => {
      const lonDeg = getPlanetEclipticLongitude(Astro, key, now);
      if (lonDeg === null) {
        return { planet: key, symbol, color, sign: "Unknown", deg: 0, min: 0, lonDeg: 0 };
      }
      const { sign, deg, min } = lonToZodiacSign(lonDeg);
      return { planet: key, symbol, color, sign, deg, min, lonDeg: Math.round(lonDeg * 100) / 100 };
    });

    // Detect major aspects (conjunction 0°, trine 120°, square 90°, sextile 60°, opposition 180°)
    const aspects: Array<{ a: string; b: string; type: string; orb: number }> = [];
    const aspectDefs = [
      { type: "conjunct", angle: 0, orb: 8 },
      { type: "sextile", angle: 60, orb: 6 },
      { type: "square", angle: 90, orb: 8 },
      { type: "trine", angle: 120, orb: 8 },
      { type: "opposite", angle: 180, orb: 8 },
    ];
    for (let i = 0; i < transits.length; i++) {
      for (let j = i + 1; j < transits.length; j++) {
        const diff = Math.abs(transits[i].lonDeg - transits[j].lonDeg);
        const normalized = Math.min(diff, 360 - diff);
        for (const def of aspectDefs) {
          const orb = Math.abs(normalized - def.angle);
          if (orb <= def.orb) {
            aspects.push({ a: transits[i].planet, b: transits[j].planet, type: def.type, orb: Math.round(orb * 10) / 10 });
            break;
          }
        }
      }
    }

    return NextResponse.json({
      timestamp: now.toISOString(),
      transits,
      aspects: aspects.slice(0, 12),
      moonPhase: computeMoonPhase(Astro, now),
    });
  } catch (error) {
    console.error("[transits] error:", error);
    return NextResponse.json({ error: "Transits failed" }, { status: 500 });
  }
}

function computeMoonPhase(Astro: unknown, date: Date): { phase: string; illumination: number } {
  try {
    const phaseAngle = (Astro as { MoonPhase?: (d: Date) => number }).MoonPhase?.(date) ?? 0;
    const illumination = (1 - Math.cos(phaseAngle)) / 2;
    let phase: string;
    if (phaseAngle < 0.5) phase = "New Moon";
    else if (phaseAngle < Math.PI / 2) phase = "Waxing Crescent";
    else if (phaseAngle < Math.PI - 0.5) phase = "First Quarter";
    else if (phaseAngle < Math.PI) phase = "Waxing Gibbous";
    else if (phaseAngle < Math.PI + 0.5) phase = "Full Moon";
    else if (phaseAngle < 3 * Math.PI / 2) phase = "Waning Gibbous";
    else if (phaseAngle < 2 * Math.PI - 0.5) phase = "Last Quarter";
    else phase = "Waning Crescent";
    return { phase, illumination: Math.round(illumination * 100) / 100 };
  } catch {
    return { phase: "Unknown", illumination: 0 };
  }
}
