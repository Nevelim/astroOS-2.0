/**
 * GET /api/cities — список всех городов (331) с social proof.
 * GET /api/cities?q= — debounced autocomplete (case-insensitive, name+country+iso2).
 * POST /api/cities/match — фильтрация по climate/continent/sphere.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedCitiesIfEmpty } from "@/lib/astroos/real/city-seeds";

export async function GET(req: NextRequest) {
  try {
    await seedCitiesIfEmpty();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 331);

    let cities;
    if (q.length >= 1) {
      // SQLite case-insensitive search using raw query with LIKE
      // LIKE in SQLite is case-insensitive for ASCII by default
      const pattern = `%${q}%`;

      if (q.length === 2 && q.toUpperCase() === q) {
        // Exact ISO2 country code match (e.g., "RU", "US", "IN")
        cities = await db.$queryRaw<Array<{
          id: string; name: string; country: string;
          lat: number; lng: number; timezone: string; tzOffsetHours: number;
          population: number | null; qolIndex: number | null; costIndex: number | null;
          climate: string | null; iso2: string | null;
          createdAt: string;
        }>>`
          SELECT * FROM City
          WHERE name LIKE ${pattern} COLLATE NOCASE
             OR country LIKE ${pattern} COLLATE NOCASE
             OR iso2 = ${q.toUpperCase()}
          ORDER BY name ASC
          LIMIT ${limit}
        `;
      } else {
        cities = await db.$queryRaw<Array<{
          id: string; name: string; country: string;
          lat: number; lng: number; timezone: string; tzOffsetHours: number;
          population: number | null; qolIndex: number | null; costIndex: number | null;
          climate: string | null; iso2: string | null;
          createdAt: string;
        }>>`
          SELECT * FROM City
          WHERE name LIKE ${pattern} COLLATE NOCASE
             OR country LIKE ${pattern} COLLATE NOCASE
          ORDER BY name ASC
          LIMIT ${limit}
        `;
      }

      // Post-sort: prioritize name prefix matches over country matches
      const qLower = q.toLowerCase();
      cities.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStartsWith = aName.startsWith(qLower) ? 0 : aName.includes(qLower) ? 1 : 2;
        const bStartsWith = bName.startsWith(qLower) ? 0 : bName.includes(qLower) ? 1 : 2;
        if (aStartsWith !== bStartsWith) return aStartsWith - bStartsWith;
        return a.name.localeCompare(b.name);
      });
    } else {
      cities = await db.city.findMany({
        take: limit,
        orderBy: { name: "asc" },
      });
    }

    // Social proof
    const socialProofs = await db.citySocialProof.findMany();
    const proofMap = new Map(socialProofs.map((p) => [p.cityId, p]));

    return NextResponse.json({
      cities: cities.map((c) => ({
        ...c,
        displayName: `${c.name}, ${c.iso2 ?? c.country}`,
        socialProof: proofMap.get(c.id) ?? null,
      })),
      total: cities.length,
    });
  } catch (error) {
    console.error("[cities GET] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await seedCitiesIfEmpty();
    const body = await req.json();
    const { climate, continent, minQol, maxCost } = body as {
      climate?: string;
      continent?: string;
      minQol?: number;
      maxCost?: number;
    };

    const where: Record<string, unknown> = {};
    if (climate) where.climate = climate;
    if (typeof minQol === "number") where.qolIndex = { gte: minQol };
    if (typeof maxCost === "number") where.costIndex = { lte: maxCost };

    const cities = await db.city.findMany({ where, take: 100, orderBy: { name: "asc" } });
    return NextResponse.json({ cities, total: cities.length });
  } catch (error) {
    console.error("[cities POST] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
