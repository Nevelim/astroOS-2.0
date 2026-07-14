/**
 * GET /api/remedies — favorable-element remedy recommendations (Python :3005).
 *
 * Calls the Python Remedies service which maps BaZi favorable elements to
 * stones/colors/metals/scents with whitelisted marketplace listings.
 * The Python service enforces the REMED-4 ethics invariant (sort by rating,
 * NOT affiliate) and the whitelist (rating ≥ 4.0).
 */
import { NextRequest, NextResponse } from "next/server";

const REMEDIES_URL = process.env.REMEDIES_URL ?? "http://127.0.0.1:3005";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dayMaster = searchParams.get("day_master");
  const lang = searchParams.get("lang") ?? "en";
  const favorable = searchParams.get("favorable");

  if (!dayMaster) {
    return NextResponse.json(
      { error: "Missing 'day_master' parameter", valid: ["wood", "fire", "earth", "metal", "water"] },
      { status: 422 },
    );
  }

  const params = new URLSearchParams({ day_master: dayMaster, lang });
  if (favorable) params.set("favorable", favorable);

  try {
    const resp = await fetch(
      `${REMEDIES_URL}/v1/remedies/recommendations?${params}`,
      { cache: "default" },
    );
    if (!resp.ok) {
      const body = await resp.text();
      return NextResponse.json(
        { error: "Remedies service error", detail: body },
        { status: resp.status },
      );
    }
    const data = await resp.json();
    // Forward ETag for client-side caching.
    const etag = resp.headers.get("etag");
    const headers: Record<string, string> = {};
    if (etag) headers["etag"] = etag;
    return NextResponse.json(data, { headers });
  } catch (e) {
    return NextResponse.json(
      { error: "Remedies service unavailable", detail: (e as Error).message },
      { status: 503 },
    );
  }
}
