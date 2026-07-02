/**
 * POST /api/cosmic-match — совместимость двух людей (Western + BaZi).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CosmicMatch } from "@/domain/services/CosmicMatch";

const cosmicMatch = new CosmicMatch();

const Schema = z.object({
  a: z.object({
    sunSign: z.string(),
    moonSign: z.string(),
    venusSign: z.string().optional(),
    dayMasterElement: z.string().optional(),
  }),
  b: z.object({
    sunSign: z.string(),
    moonSign: z.string(),
    venusSign: z.string().optional(),
    dayMasterElement: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const result = cosmicMatch.compute(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cosmic-match] error:", error);
    return NextResponse.json({ error: "Match failed" }, { status: 500 });
  }
}
