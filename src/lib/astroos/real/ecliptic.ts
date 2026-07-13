/**
 * Ecliptic longitude helper — single source of truth for planet positions.
 *
 * IMPORTANT — geocentric vs heliocentric:
 *   astronomy-engine's `EclipticLongitude(body, date)` returns HELIOCENTRIC
 *   longitude (Sun-centered), which is WRONG for astrology. Astrology needs
 *   GEOCENTRIC positions (Earth-centered apparent ecliptic longitude). This
 *   helper uses `Equator(body, date, Observer(0,0,0), ofdate=true, aberration=true)`
 *   to obtain apparent geocentric RA/DEC, then converts to ecliptic longitude
 *   via the obliquity of the ecliptic. The result matches the `Elongation`
 *   function's ecliptic_separation values (verified: Mercury within 28° of Sun,
 *   Venus within 47° — impossible with heliocentric data).
 *
 *   - Sun   → `SunPosition(date).elon` (already geocentric ecliptic, degrees)
 *   - Moon  → `EclipticGeoMoon(date).lon` (already geocentric ecliptic, degrees)
 *   - other → `Equator(...)` RA/DEC → spherical → ecliptic lon/lat (degrees)
 *
 * Clean Architecture: infrastructure-layer utility (depends on astronomy-engine
 * lazy-loaded module). No framework deps. Pure functions over the engine handle.
 */

/** Obliquity of the ecliptic (mean, J2000) in degrees. */
const OBLIQUITY_DEG = 23.4392911;

/** Minimal shape of astronomy-engine we depend on for geocentric positions. */
export type AstronomyEngineLike = {
  EclipticGeoMoon?: (date: Date) => { lon: number; lat: number; dist: number };
  SunPosition?: (date: Date) => { elon?: number; elat?: number; lon?: number; lat?: number };
  Body?: Record<string, string>;
  Equator?: (
    body: string,
    date: Date,
    observer: { lat: number; lng: number; height?: number },
    ofdate: boolean,
    aberration: boolean,
  ) => { ra: number; dec: number; dist: number };
  Observer?: new (lat: number, lng: number, height: number) => unknown;
};

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/**
 * Convert equatorial coordinates (RA in hours, DEC in degrees) to ecliptic
 * longitude in degrees [0, 360). Uses the standard spherical rotation with the
 * mean obliquity of the ecliptic.
 */
function equatorialToEclipticLon(raHours: number, decDeg: number): number {
  const raRad = raHours * Math.PI / 12;
  const decRad = decDeg * Math.PI / 180;
  const epsRad = OBLIQUITY_DEG * Math.PI / 180;
  const lonRad = Math.atan2(
    Math.sin(raRad) * Math.cos(epsRad) + Math.tan(decRad) * Math.sin(epsRad),
    Math.cos(raRad),
  );
  return ((lonRad * 180 / Math.PI) % 360 + 360) % 360;
}

/**
 * Compute the geocentric apparent ecliptic longitude (0–360°) of a planet.
 *
 * - Sun  → `SunPosition(date).elon`
 * - Moon → `EclipticGeoMoon(date).lon`
 * - other planets → `Equator(body, date, geocenter, true, true)` then RA/DEC → ecliptic
 *
 * Returns `null` if the engine lacks the required function or the body enum
 * entry is missing. Callers should treat `null` as "position unavailable".
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
    if (!Astro.Equator || !Astro.Body || !Astro.Observer) return null;
    const bodyVal = Astro.Body[planet];
    if (!bodyVal) return null;
    const observer = new Astro.Observer(0, 0, 0);
    const eq = Astro.Equator(bodyVal, date, observer as never, true, true);
    return equatorialToEclipticLon(eq.ra, eq.dec);
  } catch {
    return null;
  }
}

/**
 * Compute geocentric apparent ecliptic longitude AND latitude of a planet.
 * Returns `{ lonDeg, latDeg }` or `null`. Useful for natal charts that need
 * ecliptic latitude for certain calculations.
 */
export function getPlanetGeocentricEcliptic(
  Astro: AstronomyEngineLike,
  planet: string,
  date: Date,
): { lonDeg: number; latDeg: number } | null {
  try {
    if (planet === "Moon") {
      if (!Astro.EclipticGeoMoon) return null;
      const m = Astro.EclipticGeoMoon(date);
      return { lonDeg: ((m.lon % 360) + 360) % 360, latDeg: m.lat };
    }
    if (planet === "Sun") {
      if (!Astro.SunPosition) return null;
      const sun = Astro.SunPosition(date);
      const lon = sun.elon ?? sun.lon ?? 0;
      const lat = sun.elat ?? sun.lat ?? 0;
      return { lonDeg: ((lon % 360) + 360) % 360, latDeg: lat };
    }
    if (!Astro.Equator || !Astro.Body || !Astro.Observer) return null;
    const bodyVal = Astro.Body[planet];
    if (!bodyVal) return null;
    const observer = new Astro.Observer(0, 0, 0);
    const eq = Astro.Equator(bodyVal, date, observer as never, true, true);
    const raRad = eq.ra * Math.PI / 12;
    const decRad = eq.dec * Math.PI / 180;
    const epsRad = OBLIQUITY_DEG * Math.PI / 180;
    const lonRad = Math.atan2(
      Math.sin(raRad) * Math.cos(epsRad) + Math.tan(decRad) * Math.sin(epsRad),
      Math.cos(raRad),
    );
    const latRad = Math.asin(
      Math.sin(decRad) * Math.cos(epsRad) - Math.cos(decRad) * Math.sin(epsRad) * Math.sin(raRad),
    );
    return {
      lonDeg: ((lonRad * 180 / Math.PI) % 360 + 360) % 360,
      latDeg: (latRad * 180 / Math.PI),
    };
  } catch {
    return null;
  }
}

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

/**
 * Whether a planet is currently in apparent retrograde motion (geocentric).
 *
 * The Sun and Moon never go retrograde — returns `false` immediately.
 * For all other bodies, compares the geocentric ecliptic longitude now vs
 * 24 hours ago: if the longitude decreased (after wraparound normalization to
 * [-180,180]), the planet is retrograde. This is the standard astrological
 * definition of apparent retrograde motion.
 *
 * NOTE: this only works with GEOCENTRIC longitudes. Heliocentric planets never
 * go retrograde (they always orbit forward around the Sun), which is why the
 * old heliocentric `EclipticLongitude` always returned false here.
 *
 * Returns `null` if the engine lacks the required functions (cannot determine).
 */
export function isPlanetRetrograde(
  Astro: AstronomyEngineLike,
  planet: string,
  date: Date,
): boolean | null {
  if (planet === "Sun" || planet === "Moon") return false;
  const now = getPlanetEclipticLongitude(Astro, planet, date);
  const yesterday = getPlanetEclipticLongitude(Astro, planet, new Date(date.getTime() - 24 * 3600_000));
  if (now === null || yesterday === null) return null;
  let diff = now - yesterday;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}
