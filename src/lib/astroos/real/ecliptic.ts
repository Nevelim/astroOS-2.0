/**
 * Ecliptic longitude helper — single source of truth for planet positions.
 *
 * Why this file exists:
 *   Several API routes (transits, horoscope, affirmation) previously used a
 *   non-existent `bodyObj.Equator(date)` pattern that silently fell into the
 *   catch branch and returned "Unknown" for every planet. The correct
 *   astronomy-engine API is already used in `transit-forecast/route.ts` and
 *   `AstronomyEngineChartCalculator`; this helper consolidates that proven
 *   pattern so every route computes ecliptic longitude identically.
 *
 * Clean Architecture: infrastructure-layer utility (depends on astronomy-engine
 * lazy-loaded module). No framework deps. Pure function over the engine handle.
 */

/** Minimal shape of astronomy-engine we depend on. */
export type AstronomyEngineLike = {
  EclipticLongitude?: (body: string, date: Date) => number;
  EclipticGeoMoon?: (date: Date) => { lon: number; lat: number; dist: number };
  SunPosition?: (date: Date) => { elon?: number; elat?: number; lon?: number; lat?: number };
  Body?: Record<string, string>;
};

/**
 * Compute the geocentric ecliptic longitude (0–360°) of a planet at a given date.
 *
 * - Moon  → `EclipticGeoMoon(date).lon` (degrees)
 * - Sun   → `SunPosition(date).elon` (degrees, geocentric ecliptic)
 * - other → `EclipticLongitude(Body[planet], date)` (degrees)
 *
 * Returns `null` if the engine lacks the required function or the body enum
 * entry is missing. Callers should treat `null` as "position unavailable"
 * (rather than 0°) so downstream sign resolution does not fabricate "Aries".
 */
export function getPlanetEclipticLongitude(
  Astro: AstronomyEngineLike,
  planet: string,
  date: Date,
): number | null {
  try {
    if (planet === "Moon") {
      if (!Astro.EclipticGeoMoon) return null;
      const lon = Astro.EclipticGeoMoon(date).lon;
      return ((lon % 360) + 360) % 360;
    }
    if (planet === "Sun") {
      if (!Astro.SunPosition) return null;
      const sun = Astro.SunPosition(date);
      const raw = sun.elon ?? sun.lon ?? 0;
      return ((raw % 360) + 360) % 360;
    }
    // Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
    if (!Astro.EclipticLongitude || !Astro.Body) return null;
    const bodyVal = Astro.Body[planet];
    if (!bodyVal) return null;
    const raw = Astro.EclipticLongitude(bodyVal, date);
    return ((raw % 360) + 360) % 360;
  } catch {
    return null;
  }
}

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/** Convert an ecliptic longitude (degrees) to a zodiac sign + degree/min within sign. */
export function lonToZodiacSign(lonDeg: number): { sign: string; deg: number; min: number } {
  const normalized = ((lonDeg % 360) + 360) % 360;
  const signIdx = Math.floor(normalized / 30);
  const inSign = normalized - signIdx * 30;
  const deg = Math.floor(inSign);
  const min = Math.floor((inSign - deg) * 60);
  return { sign: ZODIAC_SIGNS[signIdx] ?? "Unknown", deg, min };
}

/** Just the sign name from a longitude, with a safe fallback. */
export function lonToSignName(lonDeg: number | null): string {
  if (lonDeg === null) return "Unknown";
  return lonToZodiacSign(lonDeg).sign;
}
