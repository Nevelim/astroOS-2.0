/**
 * POST /api/synastry — synastry chart overlay (two-person compatibility).
 *
 * Takes two birth datasets, calculates natal chart for each via astronomy-engine,
 * then computes cross-aspects: each planet of Person A aspecting each planet of Person B.
 *
 * Returns:
 *   - Both natal planet positions
 *   - All cross-aspects (conjunction, sextile, square, trine, opposition)
 *   - Compatibility score breakdown (elemental, modal, aspect-based)
 *   - Key synastry themes (Venus-Mars, Sun-Moon, Ascendant aspects)
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateChartUseCase } from "@/infrastructure/composition-root";
import { BirthData } from "@/domain/value-objects/BirthData";

const BirthSchema = z.object({
  birthDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  birthLat: z.number().min(-90).max(90),
  birthLng: z.number().min(-180).max(180),
  birthTzOffset: z.number().min(-14).max(14),
  birthPlaceName: z.string().min(1).max(200),
  gender: z.union([z.literal(0), z.literal(1)]),
});

const SynastrySchema = z.object({
  personA: z.object({
    name: z.string().min(1).max(100),
    birth: BirthSchema,
  }),
  personB: z.object({
    name: z.string().min(1).max(100),
    birth: BirthSchema,
  }),
});

const ASPECT_DEFS = [
  { name: "conjunction", angle: 0, orb: 8, symbol: "☌", tone: "gold" },
  { name: "sextile", angle: 60, orb: 6, symbol: "⚹", tone: "jade" },
  { name: "square", angle: 90, orb: 7, symbol: "□", tone: "rose" },
  { name: "trine", angle: 120, orb: 8, symbol: "△", tone: "jade" },
  { name: "opposition", angle: 180, orb: 8, symbol: "☍", tone: "rose" },
];

const MAIN_PLANETS = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"];

const ASPECT_MEANINGS: Record<string, { en: string; ru: string; hi: string }> = {
  conjunction: { en: "fusion · intensity", ru: "слияние · интенсивность", hi: "विलय · तीव्रता" },
  sextile: { en: "opportunity · harmony", ru: "возможность · гармония", hi: "अवसर · सामंजस्य" },
  square: { en: "tension · growth", ru: "напряжение · рост", hi: "तनाव · विकास" },
  trine: { en: "ease · flow", ru: "лёгкость · поток", hi: "सहज · प्रवाह" },
  opposition: { en: "polarity · attraction", ru: "полярность · притяжение", hi: "ध्रुवीकरण · आकर्षण" },
};

interface CrossAspect {
  planetA: string;
  planetB: string;
  aspectName: string;
  aspectSymbol: string;
  exactAngle: number;
  orb: number;
  tone: string;
  meaning: { en: string; ru: string; hi: string };
}

const ZODIAC_ELEMENTS: Record<string, string> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

const ZODIAC_MODALITIES: Record<string, string> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

const ZODIAC_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

function lonToSign(lon: number): string {
  const idx = Math.floor((((lon % 360) + 360) % 360) / 30);
  return ZODIAC_NAMES[idx] ?? "Aries";
}

function computeCrossAspects(
  planetsA: Array<{ planet: string; eclipticLonDeg: number }>,
  planetsB: Array<{ planet: string; eclipticLonDeg: number }>,
): CrossAspect[] {
  const aspects: CrossAspect[] = [];
  const mainA = planetsA.filter(p => MAIN_PLANETS.includes(p.planet));
  const mainB = planetsB.filter(p => MAIN_PLANETS.includes(p.planet));

  for (const pa of mainA) {
    for (const pb of mainB) {
      let diff = Math.abs(pa.eclipticLonDeg - pb.eclipticLonDeg);
      if (diff > 180) diff = 360 - diff;

      for (const ad of ASPECT_DEFS) {
        const orbDiff = Math.abs(diff - ad.angle);
        if (orbDiff <= ad.orb) {
          aspects.push({
            planetA: pa.planet, planetB: pb.planet,
            aspectName: ad.name, aspectSymbol: ad.symbol,
            exactAngle: ad.angle, orb: orbDiff, tone: ad.tone,
            meaning: ASPECT_MEANINGS[ad.name],
          });
          break;
        }
      }
    }
  }
  return aspects.sort((a, b) => a.orb - b.orb);
}

function computeCompatibilityScore(aspects: CrossAspect[], planetsA: Array<{ planet: string; eclipticLonDeg: number }>, planetsB: Array<{ planet: string; eclipticLonDeg: number }>) {
  let score = 50; // Start at neutral
  let harmonyPoints = 0;
  let tensionPoints = 0;

  for (const asp of aspects) {
    if (asp.tone === "jade") { harmonyPoints += 4; score += 4; }
    else if (asp.tone === "gold") { harmonyPoints += 3; score += 3; }
    else if (asp.tone === "rose") { tensionPoints += 2; score -= 2; }
  }

  // Key synastry aspects bonus
  const sunMoon = aspects.find(a => (a.planetA === "Sun" && a.planetB === "Moon") || (a.planetA === "Moon" && a.planetB === "Sun"));
  if (sunMoon) {
    if (sunMoon.tone === "jade" || sunMoon.tone === "gold") score += 8;
  }

  const venusMars = aspects.find(a => (a.planetA === "Venus" && a.planetB === "Mars") || (a.planetA === "Mars" && a.planetB === "Venus"));
  if (venusMars) {
    if (venusMars.tone === "jade" || venusMars.tone === "gold") score += 6;
  }

  // Elemental compatibility
  const sunA = planetsA.find(p => p.planet === "Sun");
  const sunB = planetsB.find(p => p.planet === "Sun");
  if (sunA && sunB) {
    const elemA = ZODIAC_ELEMENTS[lonToSign(sunA.eclipticLonDeg)];
    const elemB = ZODIAC_ELEMENTS[lonToSign(sunB.eclipticLonDeg)];
    if (elemA === elemB) score += 5;
    else if (
      (elemA === "Fire" && elemB === "Air") || (elemA === "Air" && elemB === "Fire") ||
      (elemA === "Earth" && elemB === "Water") || (elemA === "Water" && elemB === "Earth")
    ) score += 3;
  }

  return {
    overall: Math.max(0, Math.min(100, score)),
    harmony: harmonyPoints,
    tension: tensionPoints,
    balance: harmonyPoints - tensionPoints,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SynastrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { personA, personB } = parsed.data;

    // Calculate natal charts for both people
    const birthA = BirthData.create({
      dateTimeLocal: personA.birth.birthDateTime,
      lat: personA.birth.birthLat,
      lng: personA.birth.birthLng,
      timezoneOffsetHours: personA.birth.birthTzOffset,
      gender: personA.birth.gender,
      placeName: personA.birth.birthPlaceName,
    });
    const birthB = BirthData.create({
      dateTimeLocal: personB.birth.birthDateTime,
      lat: personB.birth.birthLat,
      lng: personB.birth.birthLng,
      timezoneOffsetHours: personB.birth.birthTzOffset,
      gender: personB.birth.gender,
      placeName: personB.birth.birthPlaceName,
    });

    const [chartA, chartB] = await Promise.all([
      calculateChartUseCase.execute(birthA),
      calculateChartUseCase.execute(birthB),
    ]);

    const planetsA = chartA.planetPositions;
    const planetsB = chartB.planetPositions;

    const crossAspects = computeCrossAspects(planetsA, planetsB);
    const compat = computeCompatibilityScore(crossAspects, planetsA, planetsB);

    // Determine tone
    let tone = "jade";
    if (compat.overall >= 75) tone = "gold";
    else if (compat.overall >= 55) tone = "jade";
    else if (compat.overall >= 40) tone = "rose";
    else tone = "rose";

    // Key themes (most important synastry aspects)
    const keyThemes = crossAspects.filter(a =>
      (a.planetA === "Sun" && a.planetB === "Moon") ||
      (a.planetA === "Moon" && a.planetB === "Sun") ||
      (a.planetA === "Venus" && a.planetB === "Mars") ||
      (a.planetA === "Mars" && a.planetB === "Venus") ||
      (a.planetA === "Sun" && a.planetB === "Venus") ||
      (a.planetA === "Venus" && a.planetB === "Sun") ||
      (a.planetA === "Moon" && a.planetB === "Venus") ||
      (a.planetA === "Venus" && a.planetB === "Moon")
    ).slice(0, 5);

    // Element distribution
    const elementsA = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    const elementsB = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    for (const p of planetsA.filter(p => MAIN_PLANETS.includes(p.planet))) {
      const el = ZODIAC_ELEMENTS[lonToSign(p.eclipticLonDeg)];
      if (el) (elementsA as any)[el]++;
    }
    for (const p of planetsB.filter(p => MAIN_PLANETS.includes(p.planet))) {
      const el = ZODIAC_ELEMENTS[lonToSign(p.eclipticLonDeg)];
      if (el) (elementsB as any)[el]++;
    }

    return NextResponse.json({
      personA: {
        name: personA.name,
        planetPositions: planetsA,
        ascendantLonDeg: chartA.ascendantLonDeg,
        midheavenLonDeg: chartA.midheavenLonDeg,
      },
      personB: {
        name: personB.name,
        planetPositions: planetsB,
        ascendantLonDeg: chartB.ascendantLonDeg,
        midheavenLonDeg: chartB.midheavenLonDeg,
      },
      crossAspects: crossAspects.map(a => ({
        ...a,
        planetA: a.planetA, planetB: a.planetB,
      })),
      compatibility: compat,
      tone,
      keyThemes,
      elementsA, elementsB,
      aspectCount: crossAspects.length,
    });
  } catch (error) {
    console.error("[synastry] error:", error);
    return NextResponse.json(
      { error: "Synastry calculation failed", message: (error as Error).message },
      { status: 500 },
    );
  }
}
