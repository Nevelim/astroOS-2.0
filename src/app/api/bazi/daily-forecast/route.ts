/**
 * GET /api/bazi/daily-forecast — daily BaZi forecast for a day-master stem.
 * Proxies to Python bazi_engine :3002 GET /v1/bazi/daily-forecast.
 */
import { NextRequest, NextResponse } from "next/server";

const BAZI_ENGINE_URL = process.env.BAZI_ENGINE_URL ?? "http://127.0.0.1:3002";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const day_master_stem = searchParams.get("day_master_stem");
  const target_date = searchParams.get("target_date");

  if (!day_master_stem) {
    return NextResponse.json(
      { error: "Query param 'day_master_stem' is required" },
      { status: 422 },
    );
  }

  const params = new URLSearchParams({ day_master_stem });
  if (target_date) params.set("target_date", target_date);

  try {
    const resp = await fetch(
      `${BAZI_ENGINE_URL}/v1/bazi/daily-forecast?${params}`,
    );
    if (!resp.ok) return NextResponse.json(await resp.text(), { status: resp.status });
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json({ error: "BaZi service unavailable" }, { status: 503 });
  }
}
