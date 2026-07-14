/**
 * POST /api/bazi/compatibility — day-master compatibility between two charts.
 * Proxies to Python bazi_engine :3002 POST /v1/bazi/compatibility.
 */
import { NextRequest, NextResponse } from "next/server";

const BAZI_ENGINE_URL = process.env.BAZI_ENGINE_URL ?? "http://127.0.0.1:3002";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const day_master_stem_a = body?.day_master_stem_a;
  const day_master_stem_b = body?.day_master_stem_b;

  if (!day_master_stem_a || !day_master_stem_b) {
    return NextResponse.json(
      { error: "Body fields 'day_master_stem_a' and 'day_master_stem_b' are required" },
      { status: 422 },
    );
  }

  try {
    const resp = await fetch(`${BAZI_ENGINE_URL}/v1/bazi/compatibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day_master_stem_a, day_master_stem_b }),
    });
    if (!resp.ok) return NextResponse.json(await resp.text(), { status: resp.status });
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json({ error: "BaZi service unavailable" }, { status: 503 });
  }
}
