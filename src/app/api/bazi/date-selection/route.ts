/**
 * POST /api/bazi/date-selection — auspicious date picker based on day master.
 * Proxies to Python bazi_engine :3002 POST /v1/bazi/date-selection.
 */
import { NextRequest, NextResponse } from "next/server";

const BAZI_ENGINE_URL = process.env.BAZI_ENGINE_URL ?? "http://127.0.0.1:3002";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { day_master_stem, goal, days_ahead, top_n, start_date } = body;

  if (!day_master_stem) {
    return NextResponse.json(
      { error: "Body field 'day_master_stem' is required" },
      { status: 422 },
    );
  }

  try {
    const resp = await fetch(`${BAZI_ENGINE_URL}/v1/bazi/date-selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day_master_stem, goal, days_ahead, top_n, start_date }),
    });
    if (!resp.ok) return NextResponse.json(await resp.text(), { status: resp.status });
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json({ error: "BaZi service unavailable" }, { status: 503 });
  }
}
