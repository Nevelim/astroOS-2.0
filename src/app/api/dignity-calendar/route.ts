/**
 * GET /api/dignity-calendar — upcoming essential dignity transitions.
 *
 * Scans the next 30 days and returns:
 *   - current: each planet's current dignity state (sign + dignity + score)
 *   - transitions: chronological list of dignity changes (planet, date, from, to)
 *   - monthSummary: days each planet spends in each dignity over the window
 *
 * No auth required. Uses the dignity-calendar helper (1-day step scan over
 * ecliptic longitudes + planetary-dignity tables). Results change daily, so a
 * 1-hour in-memory cache is applied.
 *
 * Clean Architecture: interface adapter (HTTP) over infrastructure (astronomy).
 */
import { NextResponse } from "next/server";
import { loadEngine } from "@/infrastructure/external-services/astronomy/AstronomyEngineChartCalculator";
import { computeDignityCalendar, type DignityCalendarResult } from "@/lib/astroos/real/dignity-calendar";
import type { AstronomyEngineLike } from "@/lib/astroos/real/ecliptic";

export const dynamic = "force-dynamic";

/** 1-hour in-memory cache (dignity transitions change at most daily). */
let cache: { value: DignityCalendarResult; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function GET() {
  try {
    if (cache && Date.now() < cache.expiresAt) {
      return NextResponse.json(cache.value, { headers: { "X-Cache": "HIT" } });
    }

    const Astro = await loadEngine() as AstronomyEngineLike;
    const result = computeDignityCalendar(Astro, new Date(), 30);

    cache = { value: result, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("[dignity-calendar] error:", error);
    return NextResponse.json(
      { error: "Dignity calendar failed", message: (error as Error).message },
      { status: 500 },
    );
  }
}
