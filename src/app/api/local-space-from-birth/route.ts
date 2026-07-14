/**
 * POST /api/local-space-from-birth — local space (compass directions) computed
 * server-side from birth data for an arbitrary observer point.
 *
 * Unlike /api/local-space (which needs pre-computed RA/Dec + LST), this route
 * only needs UTC + lat/lng. The Python astro_engine resolves planet positions
 * via skyfield and computes azimuth/altitude/sector. Used by the unified
 * Astro Travel screen for both the user's birthplace and any candidate city.
 *
 * Proxies to astro_engine :3001 POST /v1/local-space-from-birth.
 */
import { NextRequest, NextResponse } from "next/server";

const ASTRO_URL = process.env.ASTRO_URL ?? "http://127.0.0.1:3001";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { utc, lat, lng } = body;

  if (!utc || lat === undefined || lng === undefined) {
    return NextResponse.json(
      { error: "'utc', 'lat', and 'lng' are all required" },
      { status: 422 },
    );
  }

  try {
    const resp = await fetch(`${ASTRO_URL}/v1/local-space-from-birth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utc, lat, lng }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: "Astro engine error", detail: text },
        { status: resp.status },
      );
    }
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Astro service unavailable" },
      { status: 503 },
    );
  }
}
