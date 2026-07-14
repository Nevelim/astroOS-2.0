/**
 * POST /api/family-astro — family astrocartography & synergy ranking.
 * Proxies to Python astro_engine :3001 POST /v1/family-abundance.
 *
 * Request body:
 *   {
 *     "members": [ { "key": "igor", "name": "Игорь",
 *                    "birthUtc": "1989-04-15T09:40:00Z",
 *                    "lat": 52.2833, "lng": 76.9667 } ],
 *     "cities":  [ { "name": "...", "lat": 60.25, "lng": 74.8167, ... } ],  // optional
 *     "limit":   50,                                                       // optional
 *     "region":  "🇷🇺 Славянская"                                            // optional filter
 *   }
 *
 * Cities: if omitted or empty, we load all 682 family-catalogue cities from
 * Prisma (the customer reference set). Pass `region` to filter by cultural
 * region. Members are forwarded in mode B (birthUtc/lat/lng) so the Python
 * engine computes planet longitudes via the skyfield ephemeris.
 *
 * Response mirrors the Python /v1/family-abundance DTO (topCitiesBySynergy,
 * bestBySynergyType, counts).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ASTRO_URL = process.env.ASTRO_URL ?? "http://127.0.0.1:3001";

type MemberIn = {
  key: string;
  name?: string;
  birthUtc?: string;
  lat?: number;
  lng?: number;
  // Mode A (precomputed) — forwarded as-is if present.
  planets?: Record<string, number>;
  gst_deg?: number;
};

type CityIn = {
  name: string;
  country?: string;
  lat: number;
  lng: number;
  region?: string;
};

async function loadCities(region?: string): Promise<CityIn[]> {
  const where = region ? { region } : {};
  const rows = await db.city.findMany({ where });
  return rows.map((c) => ({
    name: c.name,
    country: c.country,
    lat: c.lat,
    lng: c.lng,
    region: c.region ?? undefined,
  }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const membersIn = body.members as MemberIn[] | undefined;
  const citiesIn = body.cities as CityIn[] | undefined;
  const limit = body.limit ?? 50;
  const region = body.region as string | undefined;

  if (!Array.isArray(membersIn) || membersIn.length === 0) {
    return NextResponse.json(
      { error: "'members' (non-empty array) is required" },
      { status: 422 },
    );
  }

  // Validate + normalize members to the Python engine's schema.
  const members: Record<string, unknown>[] = [];
  for (const m of membersIn) {
    const key = m.key ?? "member";
    const name = m.name ?? key;
    if (m.planets && m.gst_deg !== undefined) {
      // Mode A — precomputed longitudes.
      members.push({ key, name, planets: m.planets, gst_deg: m.gst_deg });
    } else if (m.birthUtc && m.lat !== undefined && m.lng !== undefined) {
      // Mode B — engine computes longitudes.
      members.push({
        key,
        name,
        birth_utc: m.birthUtc,
        lat: m.lat,
        lng: m.lng,
      });
    } else {
      return NextResponse.json(
        {
          error: `Member '${key}' needs either planets+gst_deg or birthUtc+lat+lng`,
        },
        { status: 422 },
      );
    }
  }

  // Resolve cities: explicit list, else load from DB (optionally by region).
  let cities: CityIn[];
  if (Array.isArray(citiesIn) && citiesIn.length > 0) {
    cities = citiesIn;
  } else {
    try {
      cities = await loadCities(region);
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to load cities from database" },
        { status: 500 },
      );
    }
  }
  if (cities.length === 0) {
    return NextResponse.json(
      { error: "No cities available to rank" },
      { status: 422 },
    );
  }

  try {
    const resp = await fetch(`${ASTRO_URL}/v1/family-abundance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ members, cities, limit }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: "Astro engine error", detail: text },
        { status: resp.status },
      );
    }
    return NextResponse.json(await resp.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Astro service unavailable" },
      { status: 503 },
    );
  }
}
