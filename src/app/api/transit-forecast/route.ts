/**
 * GET /api/transit-forecast — 7-day planetary transit forecast.
 *
 * Computes current planetary positions and their movement over the next 7 days.
 * For each day, returns each planet's ecliptic longitude, sign, and any sign
 * changes (ingresses) during the period.
 *
 * Uses astronomy-engine: EclipticLongitude, EclipticGeoMoon, SunPosition.
 * No auth required (public endpoint).
 */
import { NextResponse } from "next/server";
import { loadEngine } from "@/infrastructure/external-services/astronomy/AstronomyEngineChartCalculator";

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
    const Astro = await loadEngine() as {
      EclipticLongitude?: (body: string, date: Date) => number;
      EclipticGeoMoon?: (date: Date) => { lon: number; lat: number; dist: number };
      SunPosition?: (date: Date) => { elon?: number; lon?: number };
      Body?: Record<string, string>;
    };

    if (!Astro?.EclipticLongitude || !Astro?.EclipticGeoMoon || !Astro?.Body) {
      return NextResponse.json({ error: "astronomy-engine unavailable" }, { status: 500 });
    }

    const BodyEnum = Astro.Body;
    const now = new Date();

    // Compute 7-day forecast
    const forecast: DayForecast[] = [];

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now.getTime() + dayOffset * 86400000);
      const planets: PlanetPosition[] = [];
      const ingresses: DayForecast["ingresses"] = [];

      for (const planet of PLANETS) {
        let lon: number;
        try {
          if (planet === "Moon") {
            const moon = Astro.EclipticGeoMoon!(date);
            lon = ((moon.lon % 360) + 360) % 360;
          } else if (planet === "Sun") {
            const sun = Astro.SunPosition!(date);
            const rawLon = sun.elon ?? sun.lon ?? 0;
            lon = ((rawLon % 360) + 360) % 360;
          } else {
            const bodyVal = BodyEnum[planet];
            if (!bodyVal) continue;
            const rawLon = Astro.EclipticLongitude!(bodyVal, date);
            lon = ((rawLon % 360) + 360) % 360;
          }
        } catch {
          continue;
        }

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
          // Compare with tomorrow
          const tomorrow = new Date(date.getTime() + 86400000);
          try {
            let tomorrowLon: number;
            if (planet === "Moon") {
              tomorrowLon = (((Astro.EclipticGeoMoon!(tomorrow).lon % 360) + 360) % 360);
            } else if (planet === "Sun") {
              const sun = Astro.SunPosition!(tomorrow);
              tomorrowLon = (((sun.elon ?? sun.lon ?? 0) % 360) + 360) % 360;
            } else {
              const bodyVal = BodyEnum[planet];
              if (!bodyVal) continue;
              tomorrowLon = (((Astro.EclipticLongitude!(bodyVal, tomorrow) % 360) + 360) % 360);
            }
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
          } catch {
            // skip
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
