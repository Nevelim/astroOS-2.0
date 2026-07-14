/**
 * GET /api/bazi/admin — proxy to bazi_engine :3002 reference catalogs.
 * Read-only view of directions/professions/famous-people counts.
 */
import { NextResponse } from "next/server";

const BAZI_ENGINE_URL = process.env.BAZI_ENGINE_URL ?? "http://127.0.0.1:3002";

export async function GET() {
  try {
    const resp = await fetch(`${BAZI_ENGINE_URL}/v1/bazi/admin/catalog`, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) {
      return NextResponse.json(
        { error: "BaZi engine error" },
        { status: resp.status },
      );
    }
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json(
      { error: "BaZi service unavailable" },
      { status: 503 },
    );
  }
}
