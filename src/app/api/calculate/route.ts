/**
 * POST /api/calculate — расчёт натальной карты (44 линии + планеты).
 * POST /api/calculate/great-circle — одна линия (batch endpoint).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateChartUseCase, rankCitiesUseCase } from "@/infrastructure/composition-root";
import { BirthData } from "@/domain/value-objects/BirthData";
import { db } from "@/lib/db";
import { seedCitiesIfEmpty } from "@/lib/astroos/real/city-seeds";

const CalculateSchema = z.object({
  birthDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  birthLat: z.number().min(-90).max(90),
  birthLng: z.number().min(-180).max(180),
  birthTzOffset: z.number().min(-14).max(14),
  birthPlaceName: z.string().min(1).max(200),
  gender: z.union([z.literal(0), z.literal(1)]),
  rankCities: z.boolean().default(false),
  cityLimit: z.number().min(1).max(331).default(50),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CalculateSchema.safeParse(body);
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

    const result = await calculateChartUseCase.execute(birth);

    if (!data.rankCities) {
      return NextResponse.json({
        lines: result.lines.map((l) => ({ ...l, id: l.id })),
        planetPositions: result.planetPositions,
        houseCusps: result.houseCusps,
        ascendantLonDeg: result.ascendantLonDeg,
        midheavenLonDeg: result.midheavenLonDeg,
        engineVersion: result.engineVersion,
        cached: result.cached,
      });
    }

    // Ранжирование городов
    await seedCitiesIfEmpty();
    const cities = await db.city.findMany({ take: 331 });
    const cityRecords = cities.map((c) => ({
      id: c.id,
      name: c.name,
      country: c.country,
      lat: c.lat,
      lng: c.lng,
      timezone: c.timezone,
      timezoneOffsetHours: c.tzOffsetHours,
      population: c.population ?? undefined,
      qolIndex: c.qolIndex ?? undefined,
      costIndex: c.costIndex ?? undefined,
      climate: c.climate ?? undefined,
      iso2: c.iso2 ?? undefined,
    }));

    const ranked = rankCitiesUseCase.execute({
      birth,
      chart: result,
      cities: cityRecords,
      limit: data.cityLimit,
    });

    return NextResponse.json({
      lines: result.lines.map((l) => ({ ...l, id: l.id })),
      planetPositions: result.planetPositions,
      ascendantLonDeg: result.ascendantLonDeg,
      midheavenLonDeg: result.midheavenLonDeg,
      engineVersion: result.engineVersion,
      cached: result.cached,
      rankedCities: ranked.map((r) => ({
        rank: r.rank,
        city: r.city,
        index: r.index,
        influences: r.influences,
        sandwichPosition: r.sandwichPosition,
      })),
    });
  } catch (error) {
    console.error("[calculate] error:", error);
    return NextResponse.json({ error: "Calculation failed", message: (error as Error).message }, { status: 500 });
  }
}
