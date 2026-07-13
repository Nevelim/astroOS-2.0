/**
 * GET /api/transit-forecast — 7-day planetary transit forecast.
 *
 * Computes current planetary positions and their movement over the next 7 days.
 * For each day, returns each planet's ecliptic longitude, sign, and any sign
 * changes (ingresses) during the period.
 *
 * Uses geocentric apparent ecliptic longitudes (via the ecliptic.ts helper:
 * Equator + obliquity conversion for planets, SunPosition for Sun,
 * EclipticGeoMoon for Moon). No auth required (public endpoint).
 */
import { NextResponse } from "next/server";
import { loadEngine } from "@/infrastructure/external-services/astronomy/AstronomyEngineChartCalculator";
import { getPlanetEclipticLongitude, type AstronomyEngineLike } from "@/lib/astroos/real/ecliptic";

const ZODIAC_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const ZODIAC_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];

const PLANETS = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"] as const;
type PlanetName = (typeof PLANETS)[number];

const PLANET_GLYPHS: Record<PlanetName, string> = {
  Sun: "☉", Moon: "☾", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
};

const PLANET_COLORS: Record<PlanetName, string> = {
  Sun: "#FBBF24", Moon: "#C4D3E0", Mercury: "#60A5FA", Venus: "#F472B6",
  Mars: "#EF4444", Jupiter: "#A78BFA", Saturn: "#94A3B8",
  Uranus: "#22D3EE", Neptune: "#2DD4BF", Pluto: "#9333EA",
};

// Approximate daily motion in degrees (for sign change detection)
const DAILY_MOTION: Record<PlanetName, number> = {
  Sun: 0.985,
  Moon: 13.176,
  Mercury: 1.383,
  Venus: 1.2,
  Mars: 0.524,
  Jupiter: 0.083,
  Saturn: 0.034,
  Uranus: 0.012,
  Neptune: 0.006,
  Pluto: 0.004,
};

function lonToSign(lon: number): { name: string; glyph: string; deg: number } {
  const norm = ((lon % 360) + 360) % 360;
  const idx = Math.floor(norm / 30);
  return {
    name: ZODIAC_NAMES[idx] ?? "Aries",
    glyph: ZODIAC_GLYPHS[idx] ?? "♈",
    deg: Math.floor(norm % 30),
  };
}

interface PlanetPosition {
  planet: PlanetName;
  glyph: string;
  color: string;
  lon: number;
  sign: string;
  signGlyph: string;
  deg: number;
}

interface DayForecast {
  date: string;
  dateLabel: string;
  planets: PlanetPosition[];
  ingresses: Array<{ planet: PlanetName; glyph: string; fromSign: string; toSign: string; fromGlyph: string; toGlyph: string }>;
  moonPhaseAngle: number;
}

export async function GET() {
  try {
    const Astro = (await loadEngine()) as AstronomyEngineLike;

    if (!Astro?.SunPosition || !Astro?.EclipticGeoMoon || !Astro?.Body || !Astro?.Equator || !Astro?.Observer) {
      return NextResponse.json({ error: "astronomy-engine unavailable" }, { status: 500 });
    }

    const now = new Date();

    // Compute 7-day forecast
    const forecast: DayForecast[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now.getTime() + dayOffset * 86400000);
      const planets: PlanetPosition[] = [];
      const ingresses: DayForecast["ingresses"] = [];

      for (const planet of PLANETS) {
        const lon = getPlanetEclipticLongitude(Astro, planet, date);
        if (lon === null) continue;

        const sign = lonToSign(lon);
        planets.push({
          planet,
          glyph: PLANET_GLYPHS[planet],
          color: PLANET_COLORS[planet],
          lon,
          sign: sign.name,
          signGlyph: sign.glyph,
          deg: sign.deg,
        });

        // Check for sign ingress (if planet moves into next sign during this day)
        if (dayOffset === 0) {
          const tomorrow = new Date(date.getTime() + 86400000);
          const tomorrowLon = getPlanetEclipticLongitude(Astro, planet, tomorrow);
          if (tomorrowLon !== null) {
            const todaySignIdx = Math.floor((((lon % 360) + 360) % 360) / 30);
            const tomorrowSignIdx = Math.floor((((tomorrowLon % 360) + 360) % 360) / 30);
            if (todaySignIdx !== tomorrowSignIdx) {
              const fromSign = lonToSign(lon);
              const toSign = lonToSign(tomorrowLon);
              ingresses.push({
                planet,
                glyph: PLANET_GLYPHS[planet],
                fromSign: fromSign.name,
                toSign: toSign.name,
                fromGlyph: fromSign.glyph,
                toGlyph: toSign.glyph,
              });
            }
          }
        }
      }

      // Moon phase angle (Sun - Moon longitude difference)
      const sunPos = planets.find(p => p.planet === "Sun");
      const moonPos = planets.find(p => p.planet === "Moon");
      const moonPhaseAngle = sunPos && moonPos
        ? ((moonPos.lon - sunPos.lon % 360) + 360) % 360
        : 0;

      const dateLabel = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

      forecast.push({
        date: date.toISOString(),
        dateLabel,
        planets,
        ingresses,
        moonPhaseAngle,
      });
    }

    // Summary: upcoming ingresses across the week
    const allIngresses: Array<{ day: number; planet: PlanetName; glyph: string; fromSign: string; toSign: string; fromGlyph: string; toGlyph: string; dateLabel: string }> = [];
    for (let i = 0; i < forecast.length - 1; i++) {
      const today = forecast[i];
      const tomorrow = forecast[i + 1];
      for (const planet of PLANETS) {
        const todayPos = today.planets.find(p => p.planet === planet);
        const tomorrowPos = tomorrow.planets.find(p => p.planet === planet);
        if (todayPos && tomorrowPos && todayPos.sign !== tomorrowPos.sign) {
          allIngresses.push({
            day: i,
            planet,
            glyph: PLANET_GLYPHS[planet],
            fromSign: todayPos.sign,
            toSign: tomorrowPos.sign,
            fromGlyph: todayPos.signGlyph,
            toGlyph: tomorrowPos.signGlyph,
            dateLabel: tomorrow.dateLabel,
          });
        }
      }
    }

    return NextResponse.json({
      forecast,
      upcomingIngresses: allIngresses,
      current: forecast[0],
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[transit-forecast] error:", error);
    return NextResponse.json(
      { error: "Transit forecast failed", message: (error as Error).message },
      { status: 500 },
    );
  }
}
