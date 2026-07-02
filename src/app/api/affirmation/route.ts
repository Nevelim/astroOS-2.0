/**
 * GET /api/affirmation?sign=Scorpio — AI-generated affirmation по знаку.
 * Uses ZAI SDK для personalized affirmation based on sign + current moon sign.
 *
 * Caching + graceful 429 fallback strategy:
 *   - 1st request of the day for a (sign, locale): calls ZAI LLM, caches the
 *     affirmation for 12 hours. Response header `X-Cache: MISS`.
 *   - Subsequent requests within the TTL window: served from cache, no LLM
 *     call. Response header `X-Cache: HIT`.
 *   - LLM call fails (429 / 5xx / network) AND a stale cache entry exists:
 *     serve the stale affirmation. Response header `X-Cache: STALE`.
 *   - LLM call fails AND no cache exists: serve a hand-written per-sign
 *     fallback from affirmation-fallbacks.ts. Response header `X-Cache: FALLBACK`.
 *
 * Clean Architecture: interface adapter, orchestrates ZAI + transits + cache.
 */
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { loadEngine } from "@/infrastructure/external-services/astronomy/AstronomyEngineChartCalculator";
import { getOrComputeWithStatus, buildDailyKey, TTL } from "@/lib/astroos/real/llm-cache";
import { getAffirmationFallback } from "@/lib/astroos/real/affirmation-fallbacks";
import { getPlanetEclipticLongitude, type AstronomyEngineLike } from "@/lib/astroos/real/ecliptic";

const VALID_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

const SIGN_TRAITS: Record<string, { element: string; gift: string }> = {
  Aries: { element: "Fire", gift: "courage and initiative" },
  Taurus: { element: "Earth", gift: "stability and sensuality" },
  Gemini: { element: "Air", gift: "curiosity and communication" },
  Cancer: { element: "Water", gift: "nurturing and intuition" },
  Leo: { element: "Fire", gift: "creativity and warmth" },
  Virgo: { element: "Earth", gift: "precision and service" },
  Libra: { element: "Air", gift: "harmony and partnership" },
  Scorpio: { element: "Water", gift: "depth and transformation" },
  Sagittarius: { element: "Fire", gift: "exploration and wisdom" },
  Capricorn: { element: "Earth", gift: "discipline and ambition" },
  Aquarius: { element: "Air", gift: "innovation and vision" },
  Pisces: { element: "Water", gift: "compassion and imagination" },
};

type AffirmationText = { en: string; ru: string; hi: string };
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

    if (!VALID_SIGNS.includes(sign)) {
      return NextResponse.json({ error: `Invalid sign. Valid: ${VALID_SIGNS.join(", ")}` }, { status: 400 });
    }

    const traits = SIGN_TRAITS[sign];

    // AI affirmation via ZAI — cached per (sign, locale, day) with 12h TTL.
    // 429 / 5xx / network errors degrade gracefully: stale → hand-written.
    const cacheKey = buildDailyKey("affirmation", sign, locale);
    let affirmation: AffirmationText;
    let cacheStatus: CacheStatus;

    try {
      const result = await getOrComputeWithStatus<AffirmationText>(
        cacheKey,
        TTL.AFFIRMATION,
        () => computeAffirmation(sign, traits)
      );
      affirmation = result.value;
      cacheStatus = result.status;
      if (result.status === "STALE") {
        console.warn(`[affirmation] LLM call failed — serving stale cache for ${cacheKey}`);
      }
    } catch (err) {
      console.warn(`[affirmation] LLM unavailable, no cache — serving hand-written fallback for ${sign}. Error:`, err instanceof Error ? err.message : String(err));
      affirmation = getAffirmationFallback(sign);
      cacheStatus = "FALLBACK";
    }

    const response = NextResponse.json({
      sign,
      date: new Date().toISOString().slice(0, 10),
      affirmation,
      locale,
      traits,
    });
    response.headers.set("X-Cache", cacheStatus);
    return response;
  } catch (error) {
    console.error("[affirmation] error:", error);
    return NextResponse.json({ error: "Affirmation failed" }, { status: 500 });
  }
}

/** Calls the ZAI LLM to generate today's affirmation. Throws on any failure. */
async function computeAffirmation(
  sign: string,
  traits: { element: string; gift: string }
): Promise<AffirmationText> {
  const zai = await getZAI();

  // Get current moon sign for context (best-effort; non-fatal if it fails)
  let moonContext = "";
  try {
    const Astro = (await loadEngine()) as AstronomyEngineLike;
    const moonLon = getPlanetEclipticLongitude(Astro, "Moon", new Date());
    if (moonLon !== null) {
      const moonSign = VALID_SIGNS[Math.floor(moonLon / 30)];
      moonContext = `The Moon is currently in ${moonSign}.`;
    }
  } catch { void moonContext; }

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are the AstroOS Mentor. Generate a single powerful affirmation for a ${sign} (${traits.element}, gift: ${traits.gift}). ${moonContext}
Rules: First person ("I"). No fear-mongering. Empowering but grounded. One sentence (max 2). Metaphor from nature/cosmos.
Respond in JSON: {"en": "...", "ru": "...", "hi": "..."}`,
      },
      { role: "user", content: `Generate today's affirmation for ${sign}.` },
    ],
    thinking: { type: "disabled" },
  });

  const content = completion.choices[0]?.message?.content ?? "";
  // Strip markdown code fences if present (```json ... ```)
  const cleanContent = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleanContent) as AffirmationText;
  } catch {
    return { en: cleanContent, ru: cleanContent, hi: cleanContent };
  }
}
