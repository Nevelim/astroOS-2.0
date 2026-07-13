/**
 * GET /api/retrograde-schedule — upcoming retrograde cycles for all planets.
 *
 * Returns the next 2 retrograde cycles per planet (Mercury..Saturn), each with
 * start/end dates, duration, zodiac sign at the Rx station, and whether the
 * cycle is currently active. Also a flat sorted list of upcoming stations.
 *
 * Uses the retrograde-schedule helper (SearchRelativeLongitude for inferior
 * planets, delta-sign-change scanning for superior planets). No auth required.
 *
 * Clean Architecture: interface adapter (HTTP) over infrastructure (astronomy).
 */
import { NextResponse } from "next/server";
import { loadEngine } from "@/infrastructure/external-services/astronomy/AstronomyEngineChartCalculator";
import {
  findUpcomingRetrogradeCycles,
  cyclesToStations,
  type AstronomyEngineSearchLike,
} from "@/lib/astroos/real/retrograde-schedule";
import type { AstronomyEngineLike } from "@/lib/astroos/real/ecliptic";

const PLANETS = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"] as const;

export const dynamic = "force-dynamic";

/** 1-hour in-memory cache (Rx stations change at most daily; no need to recompute on every load). */
let cache: { value: unknown; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    // Serve from cache if fresh.
    if (cache && Date.now() < cache.expiresAt) {
      return NextResponse.json(cache.value, { headers: { "X-Cache": "HIT" } });
    }

    const Astro = (await loadEngine()) as AstronomyEngineLike & AstronomyEngineSearchLike;
    const now = new Date();

    const byPlanet = PLANETS.map((planet) => ({
      planet,
      cycles: findUpcomingRetrogradeCycles(Astro, planet, now, 2),
    }));

    // Flat sorted list of upcoming stations across all planets.
    const allCycles = byPlanet.flatMap((p) => p.cycles);
    const stations = cyclesToStations(allCycles, now).filter((s) => s.daysFromNow >= -1);

    const result = {
      generatedAt: now.toISOString(),
      byPlanet,
      stations,
    };

    cache = { value: result, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("[retrograde-schedule] error:", error);
    return NextResponse.json(
      { error: "Retrograde schedule failed", message: (error as Error).message },
      { status: 500 },
    );
  }
}
