/**
 * POST /api/synastry-pro — advanced synastry with soulmate indicators.
 * Proxies to Python astro_engine :3001 POST /v1/synastry.
 * Unlike the existing /api/synastry (JS-based), this uses the Python engine
 * with nodal-contact soulmate detection + weighted cross-chart aspects.
 */
import { NextRequest, NextResponse } from "next/server";

const ASTRO_URL = process.env.ASTRO_URL ?? "http://127.0.0.1:3001";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { planets_a, planets_b, nodes_a, nodes_b } = body;

  if (!planets_a || !planets_b) {
    return NextResponse.json(
      { error: "Both 'planets_a' and 'planets_b' are required" },
      { status: 422 },
    );
  }

  try {
    const resp = await fetch(`${ASTRO_URL}/v1/synastry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planets_a, planets_b, nodes_a, nodes_b }),
    });
    if (!resp.ok) return NextResponse.json(await resp.text(), { status: resp.status });
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json({ error: "Astro service unavailable" }, { status: 503 });
  }
}
