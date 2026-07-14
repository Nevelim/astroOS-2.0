/**
 * POST /api/local-space — Local Space azimuth lines (planet compass directions).
 *
 * Takes birth data (RA/Dec for each planet, observer lat/lng, LST) and calls
 * the Python astro_engine POST /v1/local-space to compute azimuth/altitude.
 * Returns the radial-line data the frontend compass expects.
 *
 * The frontend RealLocalSpacePanel fetches this endpoint and renders the
 * compass rose with planet markers at their azimuth positions.
 */
import { NextRequest, NextResponse } from "next/server";

const ASTRO_URL = process.env.ASTRO_URL ?? "http://127.0.0.1:3001";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { planets, observer_lat, observer_lng, lst_deg } = body;

  if (!planets || observer_lat === undefined || lst_deg === undefined) {
    return NextResponse.json(
      { error: "Required: planets (with ra/dec), observer_lat, lst_deg" },
      { status: 422 },
    );
  }

  try {
    const resp = await fetch(`${ASTRO_URL}/v1/local-space`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planets, observer_lat, observer_lng, lst_deg }),
    });
    if (!resp.ok) {
      return NextResponse.json(
        { error: "Astro engine error", detail: await resp.text() },
        { status: resp.status },
      );
    }
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "Astro service unavailable", detail: (e as Error).message },
      { status: 503 },
    );
  }
}
