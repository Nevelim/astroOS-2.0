/**
 * GET /api/horoscope?sign=Scorpio — ежедневный гороскоп на основе реальных транзитов.
 * Uses /api/transits data + ZAI SDK для narrative generation.
 *
 * Caching + graceful 429 fallback strategy:
 *   - 1st request of the day for a (sign, locale): calls ZAI LLM, caches the
 *     narrative for 6 hours. Response header `X-Cache: MISS`.
 *   - Subsequent requests within the TTL window: served from cache, no LLM
 *     call. Response header `X-Cache: HIT`.
 *   - LLM call fails (429 / 5xx / network) AND a stale cache entry exists:
 *     serve the stale narrative. Response header `X-Cache: STALE`.
 *   - LLM call fails AND no cache exists: serve a hand-written per-sign
 *     fallback from horoscope-fallbacks.ts. Response header `X-Cache: FALLBACK`.
 *
 * Only the AI narrative is cached. Real planet transits are recomputed on
 * every request (cheap astronomy-engine calls, reflect the current sky).
 *
 * Clean Architecture: interface adapter, orchestrates transits + AI + cache.
 */
import { NextRequest, NextResponse } from "next/server";
import { loadEngine } from "@/infrastructure/external-services/astronomy/AstronomyEngineChartCalculator";
import ZAI from "z-ai-web-dev-sdk";
import { getOrComputeWithStatus, buildDailyKey, TTL } from "@/lib/astroos/real/llm-cache";
import { getHoroscopeFallback } from "@/lib/astroos/real/horoscope-fallbacks";
import { getPlanetEclipticLongitude, isPlanetRetrograde, lonToSignName, type AstronomyEngineLike } from "@/lib/astroos/real/ecliptic";
import { computeMoonVoC } from "@/lib/astroos/real/moon-voc";
import { getPlanetDignity, type DignityType } from "@/lib/astroos/real/planetary-dignity";

const ZODIAC_TRAITS: Record<string, { element: string; ruler: string; qualities: string }> = {
  Aries: { element: "Fire", ruler: "Mars", qualities: "courage, initiative, pioneering" },
  Taurus: { element: "Earth", ruler: "Venus", qualities: "stability, sensuality, patience" },
  Gemini: { element: "Air", ruler: "Mercury", qualities: "curiosity, adaptability, communication" },
  Cancer: { element: "Water", ruler: "Moon", qualities: "nurturing, emotional, intuitive" },
  Leo: { element: "Fire", ruler: "Sun", qualities: "creativity, leadership, warmth" },
  Virgo: { element: "Earth", ruler: "Mercury", qualities: "analysis, service, precision" },
  Libra: { element: "Air", ruler: "Venus", qualities: "harmony, partnership, aesthetics" },
  Scorpio: { element: "Water", ruler: "Pluto", qualities: "depth, transformation, intensity" },
  Sagittarius: { element: "Fire", ruler: "Jupiter", qualities: "exploration, wisdom, freedom" },
  Capricorn: { element: "Earth", ruler: "Saturn", qualities: "discipline, ambition, structure" },
  Aquarius: { element: "Air", ruler: "Uranus", qualities: "innovation, independence, vision" },
  Pisces: { element: "Water", ruler: "Neptune", qualities: "compassion, mysticism, imagination" },
};

const ZODIAC_SIGNS = Object.keys(ZODIAC_TRAITS);

type Narrative = { en: string; ru: string; hi: string };
type CacheStatus = "HIT" | "MISS" | "STALE" | "FALLBACK";

let zaiPromise: Promise<ZAI> | null = null;
async function getZAI(): Promise<ZAI> {
  if (!zaiPromise) zaiPromise = ZAI.create();
  return zaiPromise;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sign = searchParams.get("sign") ?? "Scorpio";
    const locale = searchParams.get("locale") ?? "en";

    if (!ZODIAC_TRAITS[sign]) {
      return NextResponse.json({ error: `Invalid sign. Valid: ${ZODIAC_SIGNS.join(", ")}` }, { status: 400 });
    }

    // Real transits — recomputed every request (cheap, reflects current sky).
    const transits = await computeRealTransits();
    const traits = ZODIAC_TRAITS[sign];

    // Moon Void of Course + retrograde list + dignity — for richer LLM context.
    const Astro = (await loadEngine()) as AstronomyEngineLike;
    const now = new Date();
    const moonVoC = computeMoonVoC(Astro, now);
    const retrogradePlanets = transits.positions
      .filter((p) => p.retrograde)
      .map((p) => p.planet);
    // Non-neutral dignities — for the LLM prompt and the response.
    const dignityHighlights = transits.positions
      .filter((p) => p.dignity && p.dignity !== "Neutral")
      .map((p) => ({ planet: p.planet, sign: p.sign, dignity: p.dignity as DignityType, score: p.dignityScore }));

    // Build a single rich context string for the LLM prompt.
    const astroContext = buildAstroContext(transits, moonVoC, retrogradePlanets, dignityHighlights);

    // AI narrative via ZAI — cached per (sign, locale, day) with 6h TTL.
    // 429 / 5xx / network errors degrade gracefully: stale → hand-written.
    const cacheKey = buildDailyKey("horoscope", sign, locale);
    let narrative: Narrative;
    let cacheStatus: CacheStatus;

    try {
      const result = await getOrComputeWithStatus<Narrative>(
        cacheKey,
        TTL.HOROSCOPE,
        () => computeHoroscopeNarrative(sign, traits, astroContext)
      );
      narrative = result.value;
      cacheStatus = result.status;
      if (result.status === "STALE") {
        console.warn(`[horoscope] LLM call failed — serving stale cache for ${cacheKey}`);
      }
    } catch (err) {
      // No fresh cache, no stale cache, LLM threw — use hand-written fallback.
      console.warn(`[horoscope] LLM unavailable, no cache — serving hand-written fallback for ${sign}. Error:`, err instanceof Error ? err.message : String(err));
      narrative = getHoroscopeFallback(sign);
      cacheStatus = "FALLBACK";
    }

    const response = NextResponse.json({
      sign,
      date: new Date().toISOString().slice(0, 10),
      traits,
      transits: transits.summary,
      moonPhase: transits.moonPhase,
      keyAspects: transits.aspects.slice(0, 3),
      retrogradePlanets,
      dignityHighlights,
      moonVoC: {
        isVoC: moonVoC.isVoC,
        nextVoCStart: moonVoC.currentOrNext?.startTime ?? null,
        nextVoCEnd: moonVoC.currentOrNext?.endTime ?? null,
        durationHours: moonVoC.currentOrNext?.durationHours ?? null,
        sign: moonVoC.currentOrNext?.sign ?? null,
        nextSign: moonVoC.currentOrNext?.nextSign ?? null,
      },
      narrative,
      locale,
    });
    response.headers.set("X-Cache", cacheStatus);
    return response;
  } catch (error) {
    console.error("[horoscope] error:", error);
    return NextResponse.json({ error: "Horoscope failed" }, { status: 500 });
  }
}

/** Calls the ZAI LLM to generate today's horoscope narrative. Throws on any failure. */
async function computeHoroscopeNarrative(
  sign: string,
  traits: { element: string; ruler: string; qualities: string },
  astroContext: string,
): Promise<Narrative> {
  const zai = await getZAI();
  const systemPrompt = `You are the AstroOS Mentor. Generate a daily horoscope for ${sign} (${traits.element}, ruled by ${traits.ruler}, qualities: ${traits.qualities}).

Today's real astrological context:
${astroContext}

Rules:
- No fear-mongering. No paywall traps.
- Cite the REAL transits, retrogrades, and Moon phase above. If the Moon is Void of Course, mention it and advise deferring new commitments.
- If a planet is retrograde (marked "in Sign (R)"), weave its theme (review, revisit, reframe) into the narrative.
- If a planet has a non-neutral dignity (Ruler/Exalted/Detriment/Fall), reflect its strength: strong planets (Ruler/Exalted) favor their domains; weak planets (Detriment/Fall) suggest caution or delays in their domains. Mention this qualitatively — don't just list the dignity label.
- End with a gentle, actionable reflection.
- 2-3 paragraphs max.

Respond in JSON: {"en": "...", "ru": "...", "hi": "..."}`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate today's horoscope for ${sign}. Today is ${new Date().toDateString()}.` },
    ],
    thinking: { type: "disabled" },
  });

  const content = completion.choices[0]?.message?.content ?? "";
  // Strip markdown code fences if present (```json ... ```)
  const cleanContent = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleanContent) as Narrative;
  } catch {
    // If still not JSON, use content as-is for all locales
    return { en: cleanContent, ru: cleanContent, hi: cleanContent };
  }
}

async function computeRealTransits() {
  const Astro = (await loadEngine()) as AstronomyEngineLike;
  const now = new Date();
  const planets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  const positions = planets.map((p) => {
    const lonDeg = getPlanetEclipticLongitude(Astro, p, now);
    if (lonDeg === null) return { planet: p, lonDeg: 0, sign: "Unknown", retrograde: false, dignity: "Neutral" as DignityType, dignityScore: 0 };
    const retrograde = isPlanetRetrograde(Astro, p, now) ?? false;
    const sign = lonToSignName(lonDeg);
    const { dignity, score } = getPlanetDignity(p, sign);
    return { planet: p, lonDeg: Math.round(lonDeg * 100) / 100, sign, retrograde, dignity, dignityScore: score };
  });

  // Summary includes retrograde marker (℞) for retrograde planets.
  const summary = positions
    .map((p) => `${p.planet} in ${p.sign}${p.retrograde ? " (R)" : ""}`)
    .join(", ");

  // Simple aspects — now include orb for richer LLM context.
  const aspects: Array<{ a: string; b: string; type: string; orb: number }> = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const diff = Math.abs(positions[i].lonDeg - positions[j].lonDeg);
      const norm = Math.min(diff, 360 - diff);
      if (norm < 8) aspects.push({ a: positions[i].planet, b: positions[j].planet, type: "conjunct", orb: Math.round(norm * 10) / 10 });
      else if (Math.abs(norm - 60) < 6) aspects.push({ a: positions[i].planet, b: positions[j].planet, type: "sextile", orb: Math.round(Math.abs(norm - 60) * 10) / 10 });
      else if (Math.abs(norm - 90) < 8) aspects.push({ a: positions[i].planet, b: positions[j].planet, type: "square", orb: Math.round(Math.abs(norm - 90) * 10) / 10 });
      else if (Math.abs(norm - 120) < 8) aspects.push({ a: positions[i].planet, b: positions[j].planet, type: "trine", orb: Math.round(Math.abs(norm - 120) * 10) / 10 });
      else if (Math.abs(norm - 180) < 8) aspects.push({ a: positions[i].planet, b: positions[j].planet, type: "opposite", orb: Math.round(Math.abs(norm - 180) * 10) / 10 });
    }
  }

  let moonPhase = "Unknown";
  try {
    const phaseAngle = (Astro as { MoonPhase?: (d: Date) => number }).MoonPhase?.(now) ?? 0;
    if (phaseAngle < 0.5) moonPhase = "New Moon";
    else if (phaseAngle < Math.PI / 2) moonPhase = "Waxing Crescent";
    else if (phaseAngle < Math.PI - 0.5) moonPhase = "First Quarter";
    else if (phaseAngle < Math.PI) moonPhase = "Waxing Gibbous";
    else if (phaseAngle < Math.PI + 0.5) moonPhase = "Full Moon";
    else if (phaseAngle < 3 * Math.PI / 2) moonPhase = "Waning Gibbous";
    else if (phaseAngle < 2 * Math.PI - 0.5) moonPhase = "Last Quarter";
    else moonPhase = "Waning Crescent";
  } catch { void moonPhase; }

  return { positions, summary, aspects, moonPhase };
}

/** Build a rich astrological context string for the LLM prompt. */
function buildAstroContext(
  transits: { summary: string; aspects: Array<{ a: string; b: string; type: string; orb: number }>; moonPhase: string },
  moonVoC: { isVoC: boolean; currentOrNext: { startTime: string; endTime: string; durationHours: number; sign: string; nextSign: string } | null },
  retrogradePlanets: string[],
  dignityHighlights: Array<{ planet: string; sign: string; dignity: DignityType; score: number }>,
): string {
  const lines: string[] = [];
  lines.push(`Current transits: ${transits.summary}.`);
  lines.push(`Moon phase: ${transits.moonPhase}.`);
  if (transits.aspects.length > 0) {
    const aspectStr = transits.aspects
      .slice(0, 5)
      .map((a) => `${a.a} ${a.type} ${a.b} (orb ${a.orb}°)`)
      .join(", ");
    lines.push(`Major aspects: ${aspectStr}.`);
  }
  if (retrogradePlanets.length > 0) {
    lines.push(`Retrograde planets: ${retrogradePlanets.join(", ")}. Reflect their themes (review, revisit, reframe) rather than initiating new endeavors in those domains.`);
  }
  if (dignityHighlights.length > 0) {
    const dignityStr = dignityHighlights
      .map((d) => `${d.planet} in ${d.sign} is ${d.dignity} (score ${d.score > 0 ? "+" : ""}${d.score})`)
      .join(", ");
    lines.push(`Essential dignity highlights: ${dignityStr}.`);
    // Add qualitative guidance for the LLM.
    const strong = dignityHighlights.filter((d) => d.score > 0);
    const weak = dignityHighlights.filter((d) => d.score < 0);
    if (strong.length > 0) {
      lines.push(`Strong planets today (${strong.map((d) => d.planet).join(", ")}): their energies flow freely and authentically — favor their domains.`);
    }
    if (weak.length > 0) {
      lines.push(`Weak planets today (${weak.map((d) => d.planet).join(", ")}): their energies are diminished or blocked — expect friction or delays in their domains, and plan accordingly.`);
    }
  }
  if (moonVoC.currentOrNext) {
    if (moonVoC.isVoC) {
      const end = new Date(moonVoC.currentOrNext.endTime);
      lines.push(`The Moon is currently Void of Course (until ${end.toISOString().slice(0, 16)} UTC, then enters ${moonVoC.currentOrNext.nextSign}). Traditionally a time to rest, reflect, and complete existing tasks rather than start new things.`);
    } else {
      const start = new Date(moonVoC.currentOrNext.startTime);
      lines.push(`The Moon is NOT Void of Course now. Next VoC: ${start.toISOString().slice(0, 16)} UTC for ${moonVoC.currentOrNext.durationHours}h (Moon in ${moonVoC.currentOrNext.sign} → ${moonVoC.currentOrNext.nextSign}).`);
    }
  }
  return lines.join("\n");
}
