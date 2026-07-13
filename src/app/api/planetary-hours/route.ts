/**
 * GET /api/planetary-hours — real-time planetary hours calculation.
 *
 * Planetary hours are an ancient system that divides daylight and nighttime
 * into 12 equal segments each, with each segment ruled by one of the 7
 * classical planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn).
 *
 * The order follows the Chaldean sequence: Saturn, Jupiter, Mars, Sun,
 * Venus, Mercury, Moon — then repeats.
 *
 * Day rulers (by weekday):
 *   Sunday=Sun, Monday=Moon, Tuesday=Mars, Wednesday=Mercury,
 *   Thursday=Jupiter, Friday=Venus, Saturday=Saturn
 *
 * Uses astronomy-engine for precise sunrise/sunset via SearchRiseSet.
 * No auth required (public endpoint).
 */
import { NextResponse } from "next/server";
import { loadEngine } from "@/infrastructure/external-services/astronomy/AstronomyEngineChartCalculator";

const PLANETS = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"] as const;
type PlanetName = (typeof PLANETS)[number];

const PLANET_GLYPHS: Record<PlanetName, string> = {
  Sun: "☉", Moon: "☾", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄",
};

const PLANET_COLORS: Record<PlanetName, string> = {
  Sun: "#FBBF24", Moon: "#C4D3E0", Mercury: "#60A5FA", Venus: "#F472B6",
  Mars: "#EF4444", Jupiter: "#A78BFA", Saturn: "#94A3B8",
};

const PLANET_KEYWORDS: Record<PlanetName, { en: string; ru: string; hi: string }> = {
  Sun: { en: "vitality · leadership · clarity", ru: "жизненность · лидерство · ясность", hi: "जीवनशक्ति · नेतृत्व · स्पष्टता" },
  Moon: { en: "emotions · intuition · dreams", ru: "эмоции · интуиция · сны", hi: "भावनाएँ · अंतर्ज्ञान · सपने" },
  Mercury: { en: "communication · learning · trade", ru: "общение · обучение · торговля", hi: "संवाद · अधिगम · व्यापार" },
  Venus: { en: "love · beauty · harmony", ru: "любовь · красота · гармония", hi: "प्रेम · सौंदर्य · सामंजस्य" },
  Mars: { en: "action · courage · conflict", ru: "действие · смелость · конфликт", hi: "कर्म · साहस · संघर्ष" },
  Jupiter: { en: "wisdom · expansion · luck", ru: "мудрость · расширение · удача", hi: "ज्ञान · विस्तार · भाग्य" },
  Saturn: { en: "discipline · structure · karma", ru: "дисциплина · структура · карма", hi: "अनुशासन · संरचना · कर्म" },
};

const WEEKDAY_RULERS: PlanetName[] = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
];

function getStartPlanetIndex(weekday: number): number {
  return PLANETS.indexOf(WEEKDAY_RULERS[weekday]);
}

interface HourSlot {
  hour: number;
  planet: PlanetName;
  glyph: string;
  color: string;
  startISO: string;
  endISO: string;
  keywords: { en: string; ru: string; hi: string };
  period: "day" | "night";
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const latParam = url.searchParams.get("lat");
    const lngParam = url.searchParams.get("lng");

    // Default to Greenwich if no coords provided
    const lat = latParam ? parseFloat(latParam) : 51.4769;
    const lng = lngParam ? parseFloat(lngParam) : 0.0005;

    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Invalid lat/lng" }, { status: 400 });
    }

    const Astro = await loadEngine() as {
      SearchRiseSet?: (body: string, observer: { latitude: number; longitude: number; height: number }, direction: number, dateStart: Date, limitDays: number, meters?: number) => { date: Date } | null;
      Observer?: new (latitude: number, longitude: number, height: number) => { latitude: number; longitude: number; height: number };
    };

    if (!Astro?.SearchRiseSet || !Astro.Observer) {
      return NextResponse.json({ error: "astronomy-engine unavailable" }, { status: 500 });
    }

    const now = new Date();
    const ObserverClass = Astro.Observer;
    const observer = new ObserverClass(lat, lng, 0);

    const RISE = +1;
    const SET = -1;

    // Use string "Sun" — astronomy-engine Body enum is a string enum
    // Get next sunrise and next sunset from now
    const nextSunriseResult = Astro.SearchRiseSet("Sun", observer, RISE, now, 2, 0);
    const nextSunsetResult = Astro.SearchRiseSet("Sun", observer, SET, now, 2, 0);

    if (!nextSunriseResult?.date || !nextSunsetResult?.date) {
      return NextResponse.json({ error: "Could not compute sunrise/sunset (polar region?)" }, { status: 422 });
    }

    const nextSunrise = nextSunriseResult.date;
    const nextSunset = nextSunsetResult.date;

    // Determine current period and find the relevant sunrise/sunset boundaries
    // Day period: between sunrise and sunset (same day)
    // Night period: between sunset and next sunrise

    let sunriseDate: Date;
    let sunsetDate: Date;
    let isDayPeriod: boolean;

    if (nextSunrise < nextSunset) {
      // Next event is sunrise → we're in nighttime now
      // Night started at previous sunset, ends at nextSunrise
      isDayPeriod = false;
      // Find previous sunset (search backwards from a day ago)
      const yesterday = new Date(now.getTime() - 86400000);
      const prevSetResult = Astro.SearchRiseSet("Sun", observer, SET, yesterday, 2, 0);
      sunsetDate = prevSetResult?.date ?? new Date(nextSunset.getTime() - 86400000);
      sunriseDate = nextSunrise;
    } else {
      // Next event is sunset → we're in daytime now
      // Day started at previous sunrise, ends at nextSunset
      isDayPeriod = true;
      // Find previous sunrise (search backwards from a day ago)
      const yesterday = new Date(now.getTime() - 86400000);
      const prevRiseResult = Astro.SearchRiseSet("Sun", observer, RISE, yesterday, 2, 0);
      sunriseDate = prevRiseResult?.date ?? new Date(nextSunrise.getTime() - 86400000);
      sunsetDate = nextSunset;
    }

    // For night period, "next sunrise" is the one that ends the night
    const nextDaySunrise = isDayPeriod
      ? nextSunrise // during day, next sunrise is tomorrow's
      : nextSunrise; // during night, nextSunrise is the one that ends this night

    const dayDurationMs = sunsetDate.getTime() - sunriseDate.getTime();
    const nightDurationMs = nextSunrise.getTime() - sunsetDate.getTime();
    const dayHourMs = dayDurationMs / 12;
    const nightHourMs = nightDurationMs / 12;

    const weekday = sunriseDate.getDay();
    const startIdx = getStartPlanetIndex(weekday);

    const dayHours: HourSlot[] = [];
    const nightHours: HourSlot[] = [];

    for (let i = 0; i < 12; i++) {
      const planetIdx = (startIdx + i) % 7;
      const planet = PLANETS[planetIdx];
      const start = new Date(sunriseDate.getTime() + i * dayHourMs);
      const end = new Date(sunriseDate.getTime() + (i + 1) * dayHourMs);
      dayHours.push({
        hour: i + 1, planet, glyph: PLANET_GLYPHS[planet], color: PLANET_COLORS[planet],
        startISO: start.toISOString(), endISO: end.toISOString(),
        keywords: PLANET_KEYWORDS[planet], period: "day",
      });
    }

    const nightStartIdx = (startIdx + 3) % 7;
    for (let i = 0; i < 12; i++) {
      const planetIdx = (nightStartIdx + i) % 7;
      const planet = PLANETS[planetIdx];
      const start = new Date(sunsetDate.getTime() + i * nightHourMs);
      const end = new Date(sunsetDate.getTime() + (i + 1) * nightHourMs);
      nightHours.push({
        hour: i + 1, planet, glyph: PLANET_GLYPHS[planet], color: PLANET_COLORS[planet],
        startISO: start.toISOString(), endISO: end.toISOString(),
        keywords: PLANET_KEYWORDS[planet], period: "night",
      });
    }

    const allHours = [...dayHours, ...nightHours];

    const current = allHours.find(h => {
      const startMs = new Date(h.startISO).getTime();
      const endMs = new Date(h.endISO).getTime();
      return now.getTime() >= startMs && now.getTime() < endMs;
    }) ?? allHours[0];

    const currentIdx = allHours.indexOf(current);
    const next = allHours[(currentIdx + 1) % allHours.length];

    return NextResponse.json({
      current: {
        planet: current.planet, glyph: current.glyph, color: current.color,
        hour: current.hour, period: current.period,
        startISO: current.startISO, endISO: current.endISO,
        startTime: fmtTime(current.startISO), endTime: fmtTime(current.endISO),
        keywords: current.keywords,
      },
      next: next ? {
        planet: next.planet, glyph: next.glyph, color: next.color,
        hour: next.hour, period: next.period,
        startISO: next.startISO, endISO: next.endISO,
        startTime: fmtTime(next.startISO), endTime: fmtTime(next.endISO),
        keywords: next.keywords,
      } : null,
      dayHours: dayHours.map(h => ({ ...h, startTime: fmtTime(h.startISO), endTime: fmtTime(h.endISO) })),
      nightHours: nightHours.map(h => ({ ...h, startTime: fmtTime(h.startISO), endTime: fmtTime(h.endISO) })),
      sunrise: sunriseDate.toISOString(),
      sunset: sunsetDate.toISOString(),
      sunriseTime: fmtTime(sunriseDate.toISOString()),
      sunsetTime: fmtTime(sunsetDate.toISOString()),
      dayRuler: WEEKDAY_RULERS[weekday],
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[planetary-hours] error:", error);
    return NextResponse.json(
      { error: "Planetary hours calculation failed", message: (error as Error).message },
      { status: 500 },
    );
  }
}
