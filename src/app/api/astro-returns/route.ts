/**
 * GET /api/astro-returns — planetary returns (Saturn/Jupiter/Nodal milestones).
 * Proxies to Python astro_engine :3001 GET /v1/returns.
 */
import { NextRequest, NextResponse } from "next/server";

const ASTRO_URL = process.env.ASTRO_URL ?? "http://127.0.0.1:3001";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const birthYear = searchParams.get("birth_year");
  const maxAge = searchParams.get("max_age") ?? "100";

  if (!birthYear) {
    return NextResponse.json({ error: "Missing 'birth_year'" }, { status: 422 });
  }

  try {
    const resp = await fetch(
      `${ASTRO_URL}/v1/returns?birth_year=${birthYear}&max_age=${maxAge}`,
    );
    if (!resp.ok) return NextResponse.json(await resp.text(), { status: resp.status });
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json({ error: "Astro service unavailable" }, { status: 503 });
  }
}
