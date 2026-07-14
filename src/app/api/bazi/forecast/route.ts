/**
 * GET /api/bazi/forecast — annual BaZi forecast (clashes / risk) for a stored chart.
 * Proxies to Python bazi_engine :3002 GET /v1/charts/bazi/{hash}/forecast.
 */
import { NextRequest, NextResponse } from "next/server";

const BAZI_ENGINE_URL = process.env.BAZI_ENGINE_URL ?? "http://127.0.0.1:3002";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const birth_data_hash = searchParams.get("birth_data_hash");
  const yearsParam = searchParams.get("years");
  const years = yearsParam ? Number.parseInt(yearsParam, 10) : 3;

  if (!birth_data_hash) {
    return NextResponse.json(
      { error: "Query param 'birth_data_hash' is required" },
      { status: 422 },
    );
  }

  try {
    const resp = await fetch(
      `${BAZI_ENGINE_URL}/v1/charts/bazi/${birth_data_hash}/forecast?years=${years}`,
    );
    if (!resp.ok) return NextResponse.json(await resp.text(), { status: resp.status });
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json({ error: "BaZi service unavailable" }, { status: 503 });
  }
}
