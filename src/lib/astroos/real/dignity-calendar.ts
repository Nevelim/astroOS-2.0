/**
 * Dignity calendar helper — finds upcoming essential dignity transitions.
 *
 * Scans forward day-by-day from `now` for `days` days. For each day, computes
 * each planet's geocentric ecliptic longitude + zodiac sign + dignity. Records
 * a "transition" whenever a planet's dignity changes (e.g. Neutral → Ruler,
 * Ruler → Neutral). Also records the current dignity state as the first entry.
 *
 * Returns:
 *   - transitions: chronological list of dignity changes (planet, date, from, to)
 *   - current: snapshot of each planet's current dignity
 *   - monthSummary: count of days each planet spends in each dignity over the window
 *
 * Clean Architecture: infrastructure-layer utility over astronomy-engine +
 * the ecliptic + planetary-dignity helpers.
 */

import type { AstronomyEngineLike } from "./ecliptic";
import { getPlanetEclipticLongitude, lonToSignName } from "./ecliptic";
import { getPlanetDignity, type DignityType } from "./planetary-dignity";

const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"] as const;

export interface DignityTransition {
  /** ISO date string of the day the transition is detected. */
  date: string;
  /** Planet whose dignity changed. */
  planet: string;
  /** Previous dignity (null for the initial snapshot). */
  from: DignityType | null;
  /** New dignity. */
  to: DignityType;
  /** Zodiac sign the planet is in on this date. */
  sign: string;
  /** Days from `now` (0 = today). */
  daysFromNow: number;
}

export interface PlanetDignityState {
  planet: string;
  sign: string;
  dignity: DignityType;
  score: number;
}

export interface DignityCalendarResult {
  generatedAt: string;
  current: PlanetDignityState[];
  transitions: DignityTransition[];
  /** Days each planet spends in each dignity over the scan window. */
  monthSummary: Array<{
    planet: string;
    byDignity: Partial<Record<DignityType, number>>;
  }>;
}

/**
 * Scan forward `days` days (default 30) and find all dignity transitions.
 * Uses a 1-day step. For each planet, records the initial dignity state, then
 * any day where the dignity changes.
 */
export function computeDignityCalendar(
  Astro: AstronomyEngineLike,
  now: Date,
  days = 30,
): DignityCalendarResult {
  // Compute initial dignities (day 0).
  const initialStates: Record<string, { sign: string; dignity: DignityType }> = {};
  for (const planet of PLANETS) {
    const lon = getPlanetEclipticLongitude(Astro, planet, now);
    const sign = lon !== null ? lonToSignName(lon) : "Unknown";
    const { dignity } = getPlanetDignity(planet, sign);
    initialStates[planet] = { sign, dignity };
  }

  const current: PlanetDignityState[] = PLANETS.map((planet) => {
    const { sign, dignity } = initialStates[planet];
    const { score } = getPlanetDignity(planet, sign);
    return { planet, sign, dignity, score };
  });

  const transitions: DignityTransition[] = [];
  // Month summary: count days in each dignity per planet.
  const monthSummary: Array<{ planet: string; byDignity: Partial<Record<DignityType, number>> }> = [];
  const counters: Record<string, Partial<Record<DignityType, number>>> = {};
  for (const planet of PLANETS) {
    counters[planet] = {};
    counters[planet][initialStates[planet].dignity] = 1;
  }

  let prevStates = initialStates;

  for (let d = 1; d <= days; d++) {
    const date = new Date(now.getTime() + d * 86400000);
    const dayStates: Record<string, { sign: string; dignity: DignityType }> = {};
    for (const planet of PLANETS) {
      const lon = getPlanetEclipticLongitude(Astro, planet, date);
      const sign = lon !== null ? lonToSignName(lon) : "Unknown";
      const { dignity } = getPlanetDignity(planet, sign);
      dayStates[planet] = { sign, dignity };

      // Count for month summary.
      counters[planet][dignity] = (counters[planet][dignity] ?? 0) + 1;

      // Check for transition.
      const prev = prevStates[planet];
      if (prev.dignity !== dignity) {
        transitions.push({
          date: date.toISOString(),
          planet,
          from: prev.dignity,
          to: dignity,
          sign,
          daysFromNow: d,
        });
      }
    }
    prevStates = dayStates;
  }

  for (const planet of PLANETS) {
    monthSummary.push({ planet, byDignity: counters[planet] });
  }

  return {
    generatedAt: now.toISOString(),
    current,
    transitions,
    monthSummary,
  };
}
