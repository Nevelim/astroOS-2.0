/**
 * GET /api/b2b/analysis — proxy to b2b_hr :3006 team analysis.
 *
 * Returns the advisory team analysis (role suitabilities, compatibility
 * matrix, declined count, disclaimers) for an org. The consent/seat data
 * lives in the Python service; this route is a thin pass-through.
 */
import { NextRequest, NextResponse } from "next/server";

const B2B_URL = process.env.B2B_ENGINE_URL ?? "http://127.0.0.1:3006";

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("org_id");
  if (!orgId) {
    return NextResponse.json(
      { error: "'org_id' query parameter is required" },
      { status: 422 },
    );
  }
  try {
    const resp = await fetch(
      `${B2B_URL}/v1/b2b/orgs/${encodeURIComponent(orgId)}/analysis`,
      { headers: { Accept: "application/json" } },
    );
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: "B2B engine error", detail: text },
        { status: resp.status },
      );
    }
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json(
      { error: "B2B service unavailable" },
      { status: 503 },
    );
  }
}
