/**
 * POST /api/astrocartography — planetary lines for the world map.
 * Proxies to Python astro_engine :3001 POST /v1/astrocartography.
 */
import { NextRequest, NextResponse } from "next/server";

const ASTRO_URL = process.env.ASTRO_URL ?? "http://127.0.0.1:3001";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { utc, planets, latitudes } = body;

  if (!utc || !planets) {
    return NextResponse.json(
      { error: "Both 'utc' and 'planets' (with ra/dec) are required" },
      { status: 422 },
    );
  }

  try {
    const resp = await fetch(`${ASTRO_URL}/v1/astrocartography`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utc, planets, latitudes }),
    });
    if (!resp.ok) return NextResponse.json(await resp.text(), { status: resp.status });
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json({ error: "Astro service unavailable" }, { status: 503 });
  }
}
