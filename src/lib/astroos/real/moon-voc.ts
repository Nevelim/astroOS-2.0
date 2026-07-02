/**
 * Moon Void of Course (VoC) helper.
 *
 * In astrology, the Moon is "Void of Course" when it makes no major aspect
 * (conjunction, sextile, square, trine, opposition) to any other planet
 * before leaving its current zodiac sign. VoC periods typically last minutes
 * to ~26 hours and are traditionally considered unfavorable for starting new
 * ventures (decisions made during VoC tend to unravel).
 *
 * This helper scans hourly from `now` to find:
 *   1. The Moon's next sign change (end of the current sign transit).
 *   2. The last major aspect the Moon makes before that sign change.
 *   3. The VoC period = [lastAspect, signChange].
 *
 * It returns both the current/next VoC period and whether the Moon is VoC now.
 *
 * Clean Architecture: infrastructure-layer utility over astronomy-engine.
 */

import type { AstronomyEngineLike } from "./ecliptic";
import { getPlanetEclipticLongitude } from "./ecliptic";

/** Planets the Moon can aspect (Sun + 5 visible planets). */
const ASPECT_PLANETS = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

/** Major aspect angles in degrees. */
const ASPECTS: Array<{ name: string; angle: number }> = [
  { name: "conjunction", angle: 0 },
  { name: "sextile", angle: 60 },
  { name: "square", angle: 90 },
  { name: "trine", angle: 120 },
  { name: "opposition", angle: 180 },
];

/** Orb (tolerance) in degrees for aspect detection. */
const ORB_DEG = 1.5;

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export interface MoonAspectEvent {
  /** ISO time of the aspect's closest approach. */
  time: string;
  /** Planet the Moon aspects. */
  planet: string;
  /** Aspect type: conjunction/sextile/square/trine/opposition. */
  aspect: string;
  /** Orb at closest approach (degrees). */
  orb: number;
}

export interface VoCPeriod {
  /** Start of VoC (ISO) — the last aspect's exact time. */
  startTime: string;
  /** End of VoC (ISO) — the Moon's sign ingress. */
  endTime: string;
  /** Duration in hours. */
  durationHours: number;
  /** Sign the Moon is in during this VoC. */
  sign: string;
  /** Next sign the Moon enters at VoC end. */
  nextSign: string;
  /** The aspect that ended just before VoC started (last applying aspect). */
  lastAspect: MoonAspectEvent;
}

export interface MoonVoCResult {
  /** Whether the Moon is Void of Course right now. */
  isVoC: boolean;
  /** The current/next VoC period (null if none found in the scan window). */
  currentOrNext: VoCPeriod | null;
  /** The VoC period after `currentOrNext` (for planning ahead). */
  following: VoCPeriod | null;
  /** Moon's current sign. */
  currentSign: string;
  /** Moon's current ecliptic longitude (degrees). */
  moonLonDeg: number;
  /** ISO timestamp of generation. */
  generatedAt: string;
}

/**
 * Find the next Moon VoC period starting from `startTime`. Scans hourly up to
 * `maxHours` (default 72). Returns the first VoC period that ends after `startTime`,
 * plus the last aspect that precedes it. Returns null if no VoC found.
 */
function findNextVoC(
  Astro: AstronomyEngineLike,
  startTime: Date,
  maxHours = 72,
): VoCPeriod | null {
  // Determine the Moon's sign at startTime.
  const startMoonLon = getPlanetEclipticLongitude(Astro, "Moon", startTime);
  if (startMoonLon === null) return null;
  const startSignIdx = Math.floor(startMoonLon / 30);

  // Scan hourly. Track the last aspect time and find the sign change.
  let lastAspect: MoonAspectEvent | null = null;
  let signChangeTime: Date | null = null;

  for (let h = 0; h <= maxHours; h++) {
    const t = new Date(startTime.getTime() + h * 3600000);
    const moonLon = getPlanetEclipticLongitude(Astro, "Moon", t);
    if (moonLon === null) continue;

    // Check for sign change (Moon enters next sign).
    const curSignIdx = Math.floor(moonLon / 30);
    if (curSignIdx !== startSignIdx) {
      signChangeTime = t;
      break;
    }

    // Check aspects to each planet. Track the minimum-orb aspect at this hour
    // to avoid logging the same aspect multiple times within its orb window.
    let bestAspectThisHour: { planet: string; aspect: string; orb: number; angle: number } | null = null;
    for (const planet of ASPECT_PLANETS) {
      const pLon = getPlanetEclipticLongitude(Astro, planet, t);
      if (pLon === null) continue;
      let diff = Math.abs(moonLon - pLon);
      if (diff > 180) diff = 360 - diff;
      for (const { name, angle } of ASPECTS) {
        const orb = Math.abs(diff - angle);
        if (orb <= ORB_DEG) {
          if (!bestAspectThisHour || orb < bestAspectThisHour.orb) {
            bestAspectThisHour = { planet, aspect: name, orb, angle };
          }
        }
      }
    }
    if (bestAspectThisHour) {
      // Update lastAspect. We want the LAST aspect before sign change, so keep
      // overwriting as we scan forward.
      lastAspect = {
        time: t.toISOString(),
        planet: bestAspectThisHour.planet,
        aspect: bestAspectThisHour.aspect,
        orb: bestAspectThisHour.orb,
      };
    }
  }

  if (!signChangeTime || !lastAspect) return null;
  // VoC exists only if the last aspect is before the sign change.
  const lastAspectDate = new Date(lastAspect.time);
  if (lastAspectDate.getTime() >= signChangeTime.getTime()) return null;

  const durationHours = Math.round(((signChangeTime.getTime() - lastAspectDate.getTime()) / 3600000) * 10) / 10;
  const nextSignIdx = startSignIdx === 11 ? 0 : startSignIdx + 1;

  return {
    startTime: lastAspect.time,
    endTime: signChangeTime.toISOString(),
    durationHours,
    sign: ZODIAC_SIGNS[startSignIdx] ?? "Unknown",
    nextSign: ZODIAC_SIGNS[nextSignIdx] ?? "Unknown",
    lastAspect,
  };
}

/**
 * Compute the current and next Moon VoC periods.
 *
 * Strategy: find the next VoC period from `now`. If `now` falls within it,
 * the Moon is currently VoC — also find the following period. Otherwise,
 * `currentOrNext` is the upcoming VoC.
 */
export function computeMoonVoC(
  Astro: AstronomyEngineLike,
  now: Date,
): MoonVoCResult {
  const moonLon = getPlanetEclipticLongitude(Astro, "Moon", now);
  const currentSignIdx = moonLon !== null ? Math.floor(moonLon / 30) : 0;

  const first = findNextVoC(Astro, now, 72);
  let isVoC = false;
  let following: VoCPeriod | null = null;

  if (first) {
    const startMs = new Date(first.startTime).getTime();
    const endMs = new Date(first.endTime).getTime();
    if (now.getTime() >= startMs && now.getTime() <= endMs) {
      isVoC = true;
      // Look for the next VoC after this one ends.
      following = findNextVoC(Astro, new Date(endMs + 3600000), 72);
    }
  }

  return {
    isVoC,
    currentOrNext: first,
    following,
    currentSign: ZODIAC_SIGNS[currentSignIdx] ?? "Unknown",
    moonLonDeg: moonLon ?? 0,
    generatedAt: now.toISOString(),
  };
}
