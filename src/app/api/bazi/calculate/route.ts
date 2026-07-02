/**
 * POST /api/bazi/calculate — BaZi расчёт с withFallback (Python → TS → static).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateBaZiUseCase } from "@/infrastructure/composition-root";
import { BirthData } from "@/domain/value-objects/BirthData";

const BaZiSchema = z.object({
  birthDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  birthLat: z.number().min(-90).max(90),
  birthLng: z.number().min(-180).max(180),
  birthTzOffset: z.number().min(-14).max(14),
  birthPlaceName: z.string().min(1).max(200),
  gender: z.union([z.literal(0), z.literal(1)]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BaZiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const birth = BirthData.create({
      dateTimeLocal: data.birthDateTime,
      lat: data.birthLat,
      lng: data.birthLng,
      timezoneOffsetHours: data.birthTzOffset,
      gender: data.gender,
      placeName: data.birthPlaceName,
    });

    const result = await calculateBaZiUseCase.execute(birth);

    return NextResponse.json({
      bazi: result.bazi,
      source: result.source,
      latencyMs: result.latencyMs,
      recommendations: result.bazi.elementRecommendation(),
    });
  } catch (error) {
    console.error("[bazi/calculate] error:", error);
    return NextResponse.json({ error: "BaZi calculation failed", message: (error as Error).message }, { status: 500 });
  }
}
