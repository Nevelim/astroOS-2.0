/**
 * POST /api/geo/resolve-birth — resolves local birth time to true UTC
 * using IANA timezone database (DST + historical accuracy).
 *
 * Input:
 *   - cityId: string (preferred — direct DB lookup)
 *   - OR cityName + country: string (fallback — DB search)
 *   - birthDateTime: string (ISO local "1989-07-15T12:00")
 *
 * Output:
 *   - city: { id, name, country, lat, lng, timezone, tzOffsetHours, ... }
 *   - birth: { utcISO, offsetHours, dstActive, ianaTimezone, standardOffsetHours, offsetLabel, tzAbbr }
 *   - calculatePayload: ready-to-use object for /api/calculate
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { seedCitiesIfEmpty } from "@/lib/astroos/real/city-seeds";
import { resolveBirthTime } from "@/lib/astroos/real/utc-resolver";

const ResolveBirthSchema = z.object({
  cityId: z.string().optional(),
  cityName: z.string().optional(),
  country: z.string().optional(),
  birthDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
});

export async function POST(req: NextRequest) {
  try {
    await seedCitiesIfEmpty();

    const body = await req.json();
    const parsed = ResolveBirthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // 1. Find the city
    let city: {
      id: string; name: string; country: string;
      lat: number; lng: number; timezone: string;
      tzOffsetHours: number; population: number | null;
      qolIndex: number | null; costIndex: number | null;
      climate: string | null; iso2: string | null;
    } | null = null;

    if (data.cityId) {
      city = await db.city.findUnique({ where: { id: data.cityId } });
    }

    if (!city && data.cityName) {
      // Search by name (case-insensitive)
      const cities = await db.city.findMany({
        where: {
          name: {
            contains: data.cityName,
          },
          ...(data.country ? { country: { contains: data.country } } : {}),
        },
        take: 1,
      });
      city = cities[0] ?? null;
    }

    if (!city) {
      return NextResponse.json(
        { error: "City not found", hint: "Try /api/cities?q= to find the correct city" },
        { status: 404 },
      );
    }

    // 2. Resolve UTC using IANA timezone
    const resolved = resolveBirthTime(data.birthDateTime, city.timezone);

    // 3. Build the response
    return NextResponse.json({
      city: {
        id: city.id,
        name: city.name,
        country: city.country,
        lat: city.lat,
        lng: city.lng,
        timezone: city.timezone,
        tzOffsetHours: city.tzOffsetHours,
        population: city.population,
        qolIndex: city.qolIndex,
        costIndex: city.costIndex,
        climate: city.climate,
        iso2: city.iso2,
        displayName: `${city.name}, ${city.iso2 ?? city.country}`,
      },
      birth: {
        utcISO: resolved.utcISO,
        offsetHours: resolved.offsetHours,
        dstActive: resolved.dstActive,
        ianaTimezone: resolved.ianaTimezone,
        standardOffsetHours: resolved.standardOffsetHours,
        offsetLabel: resolved.offsetLabel,
        tzAbbr: resolved.tzAbbr,
      },
      /** Ready-to-use payload for /api/calculate */
      calculatePayload: {
        birthDateTime: data.birthDateTime,
        birthLat: city.lat,
        birthLng: city.lng,
        birthTzOffset: resolved.offsetHours,
        birthPlaceName: `${city.name}, ${city.iso2 ?? city.country}`,
      },
    });
  } catch (error) {
    console.error("[geo/resolve-birth] error:", error);
    return NextResponse.json(
      { error: "Resolution failed", message: (error as Error).message },
      { status: 500 },
    );
  }
}
