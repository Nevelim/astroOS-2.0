/**
 * GET /api/moon-phase — текущая фаза Луны на основе реальной астрономии.
 * Uses astronomy-engine directly: MoonPhase(), EclipticGeoMoon(), SearchMoonPhase().
 * Clean Architecture: interface adapter, no auth required (public endpoint).
 *
 * Phase angle convention (degrees, 0..360):
 *   0   = New Moon
 *   90  = First Quarter
 *   180 = Full Moon
 *   270 = Last Quarter (Third Quarter)
 *
 * Illumination fraction = (1 - cos(phaseAngle)) / 2, range [0, 1].
 */
import { NextResponse } from "next/server";
import { loadEngine } from "@/infrastructure/external-services/astronomy/AstronomyEngineChartCalculator";

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

type PhaseName =
  | "new"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

function getPhaseName(phaseAngle: number): PhaseName {
  const a = ((phaseAngle % 360) + 360) % 360;
  if (a < 22.5 || a >= 337.5) return "new";
  if (a < 67.5) return "waxing-crescent";
  if (a < 112.5) return "first-quarter";
  if (a < 157.5) return "waxing-gibbous";
  if (a < 202.5) return "full";
  if (a < 247.5) return "waning-gibbous";
  if (a < 292.5) return "last-quarter";
  return "waning-crescent";
}

function lonToZodiac(lon: number): string {
  const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
  return ZODIAC_SIGNS[idx] ?? "Aries";
}

export async function GET() {
  try {
    const Astro = await loadEngine();
    const now = new Date();

    // astronomy-engine MoonPhase returns the angle in DEGREES [0, 360)
    // — the geocentric ecliptic longitude difference (Moon − Sun).
    const MoonPhaseFn = (Astro as { MoonPhase?: (d: Date) => number }).MoonPhase;
    const EclipticGeoMoonFn = (Astro as {
      EclipticGeoMoon?: (d: Date) => { lon: number; lat: number; dist: number };
    }).EclipticGeoMoon;
    const SearchMoonPhaseFn = (Astro as {
      SearchMoonPhase?: (targetLon: number, dateStart: Date, limitDays: number) =>
        { date: Date } | null;
    }).SearchMoonPhase;

    if (!MoonPhaseFn || !EclipticGeoMoonFn || !SearchMoonPhaseFn) {
      return NextResponse.json(
        { error: "astronomy-engine functions unavailable" },
        { status: 500 },
      );
    }

    const phaseAngleRaw = MoonPhaseFn(now);
    const phaseAngle = ((phaseAngleRaw % 360) + 360) % 360;
    const phaseName = getPhaseName(phaseAngle);

    // Moon ecliptic longitude (geocentric, true ecliptic of date).
    const moonSph = EclipticGeoMoonFn(now);
    const moonLongitude = ((moonSph.lon % 360) + 360) % 360;

    // Derive Sun ecliptic longitude:
    //   phaseAngle = (moonLon − sunLon) mod 360  ⇒  sunLon = (moonLon − phaseAngle) mod 360
    const sunLongitude = (((moonLongitude - phaseAngle) % 360) + 360) % 360;

    // Illuminated fraction of the Moon's visible disc.
    const phaseRad = (phaseAngle * Math.PI) / 180;
    const illumination = (1 - Math.cos(phaseRad)) / 2;

    // Zodiac sign the Moon is currently passing through.
    const zodiacSign = lonToZodiac(moonLongitude);

    // Days until next Full Moon (targetLon = 180) and New Moon (targetLon = 0).
    // 35-day search window is enough for any phase.
    const fullMoonTime = SearchMoonPhaseFn(180, now, 35);
    const newMoonTime = SearchMoonPhaseFn(0, now, 35);
    const daysUntilFullMoon = fullMoonTime
      ? (fullMoonTime.date.getTime() - now.getTime()) / 86_400_000
      : 0;
    const daysUntilNewMoon = newMoonTime
      ? (newMoonTime.date.getTime() - now.getTime()) / 86_400_000
      : 0;

    return NextResponse.json({
      phaseAngle: Math.round(phaseAngle * 100) / 100,
      phaseName,
      illumination: Math.round(illumination * 10_000) / 10_000,
      moonLongitude: Math.round(moonLongitude * 100) / 100,
      sunLongitude: Math.round(sunLongitude * 100) / 100,
      zodiacSign,
      daysUntilFullMoon: Math.round(daysUntilFullMoon * 100) / 100,
      daysUntilNewMoon: Math.round(daysUntilNewMoon * 100) / 100,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[moon-phase] error:", error);
    return NextResponse.json(
      { error: "Moon phase calculation failed", message: (error as Error).message },
      { status: 500 },
    );
  }
}
