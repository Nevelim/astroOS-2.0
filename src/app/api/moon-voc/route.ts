/**
 * GET /api/moon-voc — Moon Void of Course periods (current + next).
 *
 * Returns whether the Moon is currently VoC, the current/next VoC period
 * with its start/end times, duration, the last aspect that preceded it, and
 * the following VoC period for planning. No auth required.
 *
 * Uses the moon-voc helper (hourly scan + aspect detection). Results change
 * hourly, so a 1-hour in-memory cache is applied to avoid recompute on every
 * page load.
 *
 * Clean Architecture: interface adapter (HTTP) over infrastructure (astronomy).
 */
import { NextResponse } from "next/server";
import { loadEngine } from "@/infrastructure/external-services/astronomy/AstronomyEngineChartCalculator";
import { computeMoonVoC, type MoonVoCResult } from "@/lib/astroos/real/moon-voc";
import type { AstronomyEngineLike } from "@/lib/astroos/real/ecliptic";

export const dynamic = "force-dynamic";

/** 1-hour in-memory cache (Moon VoC status changes at most hourly). */
let cache: { value: MoonVoCResult; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    // Serve from cache if fresh.
    if (cache && Date.now() < cache.expiresAt) {
      return NextResponse.json(cache.value, { headers: { "X-Cache": "HIT" } });
    }

    const Astro = await loadEngine() as AstronomyEngineLike;
    const result = computeMoonVoC(Astro, new Date());

    cache = { value: result, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("[moon-voc] error:", error);
    return NextResponse.json(
      { error: "Moon VoC failed", message: (error as Error).message },
      { status: 500 },
    );
  }
}
