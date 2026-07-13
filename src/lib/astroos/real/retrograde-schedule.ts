/**
 * Retrograde schedule helper — finds upcoming retrograde stations for planets.
 *
 * Astronomy background:
 *   - A planet is retrograde (apparent backward motion, geocentric) around its
 *     conjunction/opposition with the Sun:
 *       * Inferior planets (Mercury, Venus): Rx is centered on INFERIOR
 *         conjunction (rel longitude 0, planet between Earth and Sun).
 *       * Superior planets (Mars..Pluto): Rx is centered on OPPOSITION
 *         (rel longitude 180, Earth between planet and Sun).
 *   - The Rx period is bracketed by two "stations" (standstill points) where
 *     the planet's geocentric ecliptic longitude velocity crosses zero:
 *       * Rx station (start): planet stops moving forward, begins retrograde.
 *       * Direct station (end): planet stops retrograding, resumes forward.
 *
 * This helper uses astronomy-engine's `SearchRelativeLongitude` to find the
 * center of each Rx cycle, then scans day-by-day around it to find the exact
 * stations (the days where the geocentric longitude delta flips sign).
 *
 * Clean Architecture: infrastructure-layer utility. Depends on astronomy-engine
 * + the ecliptic.ts helper for geocentric longitudes.
 */

import type { AstronomyEngineLike } from "./ecliptic";
import { getPlanetEclipticLongitude } from "./ecliptic";

/** Inferior planets (orbit inside Earth's) — Rx centered on inferior conjunction (rel lon 0). */
const INFERIOR_PLANETS = new Set(["Mercury", "Venus"]);

export interface RetrogradeStation {
  /** Planet name. */
  planet: string;
  /** Type of station: "retrograde" (begins Rx) or "direct" (ends Rx). */
  type: "retrograde" | "direct";
  /** ISO date string of the station. */
  date: string;
  /** Days from now until the station (can be negative if in the past). */
  daysFromNow: number;
  /** Zodiac sign the planet is in at the station. */
  sign: string;
}

export interface RetrogradeCycle {
  planet: string;
  /** Start of the retrograde period (Rx station). */
  startDate: string;
  /** End of the retrograde period (direct station). */
  endDate: string;
  /** Duration in days. */
  durationDays: number;
  /** Center date (conjunction/opposition). */
  centerDate: string;
  /** Sign at the center. */
  sign: string;
  /** Whether this cycle is currently active (now is between start and end). */
  isActive: boolean;
  /** Pre-shadow start: when the planet first hits the degree it will retrograde back to. ISO date. */
  preShadowStart: string;
  /** Post-shadow end: when the planet finally leaves the degree where it stationed retrograde. ISO date. */
  postShadowEnd: string;
  /** Whether we are currently in the shadow (but not Rx itself). */
  isShadowActive: boolean;
}

type AstronomyEngineSearchLike = AstronomyEngineLike & {
  SearchRelativeLongitude?: (
    body: string,
    targetRelLon: number,
    startDate: Date,
    toleranceDays: number,
  ) => { date: string; ut: number; tt: number };
};

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function lonToSignName(lonDeg: number | null): string {
  if (lonDeg === null) return "Unknown";
  const norm = ((lonDeg % 360) + 360) % 360;
  return ZODIAC_SIGNS[Math.floor(norm / 30)] ?? "Unknown";
}

/**
 * Find the exact retrograde/direct stations for a planet by scanning its
 * geocentric longitude day-by-day. A station is where the daily longitude
 * delta crosses zero (changes sign).
 *
 * @param Astro engine handle
 * @param planet planet name
 * @param centerDate approximate center of the Rx cycle (conjunction/opposition)
 * @param halfWindowDays how many days before/after the center to scan (default 25)
 * @returns { retrogradeStart, directEnd } or null if no station found in window
 */
function findStationsAround(
  Astro: AstronomyEngineLike,
  planet: string,
  centerDate: Date,
  halfWindowDays = 25,
  stepDays = 1,
): { retrogradeStart: Date; directEnd: Date } | null {
  const samples: Array<{ date: Date; lon: number | null }> = [];
  for (let d = -halfWindowDays; d <= halfWindowDays; d += stepDays) {
    const date = new Date(centerDate.getTime() + d * 86400000);
    const lon = getPlanetEclipticLongitude(Astro, planet, date);
    samples.push({ date, lon });
  }
  // Compute daily deltas (normalized to [-180,180]) and their signs.
  // A station is a sign change in the delta. The Rx cycle is:
  //   ... forward (+) → [Rx station] → retrograde (-) → [center] → retrograde (-) → [Direct station] → forward (+) ...
  // We look for the LAST forward→retro transition BEFORE the center, and the
  // FIRST retro→forward transition AFTER the center.
  const deltas: Array<{ date: Date; sign: number }> = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i].lon;
    const b = samples[i + 1].lon;
    if (a === null || b === null) continue;
    let delta = b - a;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    deltas.push({ date: samples[i + 1].date, sign: Math.sign(delta) });
  }
  if (deltas.length < 2) return null;

  const centerMs = centerDate.getTime();
  let retroStart: Date | null = null;
  let directEnd: Date | null = null;

  // Rx station: last forward(+)/zero → retro(-) transition at or before center.
  for (let i = 1; i < deltas.length; i++) {
    if (deltas[i - 1].sign >= 0 && deltas[i].sign < 0 && deltas[i].date.getTime() <= centerMs) {
      retroStart = deltas[i].date; // keep updating — we want the last one before center
    }
  }
  // Direct station: first retro(-) → forward(+)/zero transition after center.
  for (let i = 1; i < deltas.length; i++) {
    if (deltas[i - 1].sign < 0 && deltas[i].sign >= 0 && deltas[i].date.getTime() > centerMs) {
      directEnd = deltas[i].date;
      break;
    }
  }
  if (!retroStart || !directEnd) return null;
  return { retrogradeStart: retroStart, directEnd: directEnd };
}

/**
 * Find the shadow period bounds for a retrograde cycle.
 *
 * The pre-shadow starts when the planet first passes the DIRECT-station
 * degree (the longitude where it will eventually end its retrograde) while
 * moving forward — this is the moment the planet enters the "zone" it will
 * later retrace during Rx. The post-shadow ends when the planet finally
 * leaves the RX-station degree (the longitude where it began retrograding)
 * while moving forward again after the Rx period.
 *
 * We scan backward from retrogradeStart to find when the planet last crossed
 * the direct-station longitude (pre-shadow start), and forward from directEnd
 * to find when the planet next crosses the rx-station longitude (post-shadow end).
 *
 * Returns ISO date strings for preShadowStart and postShadowEnd.
 */
function findShadowBounds(
  Astro: AstronomyEngineLike,
  planet: string,
  retrogradeStart: Date,
  directEnd: Date,
): { preShadowStart: string; postShadowEnd: string } {
  const rxStationLon = getPlanetEclipticLongitude(Astro, planet, retrogradeStart);
  const directStationLon = getPlanetEclipticLongitude(Astro, planet, directEnd);

  // Pre-shadow: scan backward from retrogradeStart to find when the planet
  // last crossed the DIRECT-station longitude (entering the Rx zone).
  let preShadowStart: Date = retrogradeStart;
  if (directStationLon !== null) {
    let prevLon = getPlanetEclipticLongitude(Astro, planet, retrogradeStart);
    for (let d = 1; d <= 90; d++) {
      const date = new Date(retrogradeStart.getTime() - d * 86400000);
      const lon = getPlanetEclipticLongitude(Astro, planet, date);
      if (lon === null || prevLon === null) break;
      let delta = prevLon - lon; // forward motion = positive
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      if (delta > 0) {
        let crossed = false;
        if (lon <= prevLon) {
          crossed = directStationLon >= lon && directStationLon <= prevLon;
        } else {
          crossed = directStationLon >= lon || directStationLon <= prevLon;
        }
        if (crossed) {
          preShadowStart = date;
          break;
        }
      }
      prevLon = lon;
    }
  }

  // Post-shadow: scan forward from directEnd to find when the planet next
  // crosses the RX-station longitude (leaving the Rx zone for good).
  let postShadowEnd: Date = directEnd;
  if (rxStationLon !== null) {
    let prevLon = getPlanetEclipticLongitude(Astro, planet, directEnd);
    for (let d = 1; d <= 90; d++) {
      const date = new Date(directEnd.getTime() + d * 86400000);
      const lon = getPlanetEclipticLongitude(Astro, planet, date);
      if (lon === null || prevLon === null) break;
      let delta = lon - prevLon;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      if (delta > 0) {
        let crossed = false;
        if (prevLon <= lon) {
          crossed = rxStationLon >= prevLon && rxStationLon <= lon;
        } else {
          crossed = rxStationLon >= prevLon || rxStationLon <= lon;
        }
        if (crossed) {
          postShadowEnd = date;
          break;
        }
      }
      prevLon = lon;
    }
  }

  return {
    preShadowStart: preShadowStart.toISOString(),
    postShadowEnd: postShadowEnd.toISOString(),
  };
}

/**
 * Find the next N retrograde cycles for a planet, starting from `now`.
 *
 * Two strategies:
 *   - Inferior planets (Mercury, Venus): use `SearchRelativeLongitude` to find
 *     the next inferior conjunction (rel lon 0), which is the center of each
 *     Rx cycle, then refine stations via day-by-day scanning. Short cycles.
 *   - Superior planets (Mars..Pluto): Rx cycles are long (75–140 days) and the
 *     opposition can be far in the future. Scan forward from `now` with a 3-day
 *     step over ~3 synodic periods, collecting all delta sign-changes, then
 *     pair them into (Rx-start, Direct-end) cycles. This reliably catches an
 *     already-active cycle without depending on finding the opposition first.
 */
export function findUpcomingRetrogradeCycles(
  Astro: AstronomyEngineSearchLike,
  planet: string,
  now: Date,
  maxCycles = 2,
): RetrogradeCycle[] {
  if (!Astro.SearchRelativeLongitude || !Astro.Body) return [];
  if (planet === "Sun" || planet === "Moon") return [];
  const bodyVal = Astro.Body[planet];
  if (!bodyVal) return [];

  const isInferior = INFERIOR_PLANETS.has(planet);

  if (isInferior) {
    return findInferiorCycles(Astro, planet, bodyVal, now, maxCycles);
  }
  return findSuperiorCycles(Astro, planet, now, maxCycles);
}

function findInferiorCycles(
  Astro: AstronomyEngineSearchLike,
  planet: string,
  bodyVal: string,
  now: Date,
  maxCycles: number,
): RetrogradeCycle[] {
  const cycles: RetrogradeCycle[] = [];
  let cursor = new Date(now.getTime() - 40 * 86400000);
  const maxIters = maxCycles + 2;

  for (let i = 0; i < maxIters && cycles.length < maxCycles; i++) {
    let centerRes: { date: string; ut: number; tt: number } | null = null;
    try {
      centerRes = Astro.SearchRelativeLongitude!(bodyVal, 0, cursor, 400) ?? null;
    } catch {
      break;
    }
    if (!centerRes) break;
    const centerDate = new Date(centerRes.date);
    const stations = findStationsAround(Astro, planet, centerDate, 30, 1);
    cursor = new Date(centerDate.getTime() + 10 * 86400000);

    if (!stations) continue;
    if (stations.directEnd.getTime() < now.getTime() - 86400000) continue;

    const startLon = getPlanetEclipticLongitude(Astro, planet, new Date(stations.retrogradeStart));
    const isActive = now >= stations.retrogradeStart && now <= stations.directEnd;
    const shadow = findShadowBounds(Astro, planet, stations.retrogradeStart, stations.directEnd);
    const isShadowActive = !isActive && now >= new Date(shadow.preShadowStart) && now <= new Date(shadow.postShadowEnd);
    cycles.push({
      planet,
      startDate: stations.retrogradeStart.toISOString(),
      endDate: stations.directEnd.toISOString(),
      durationDays: Math.round((stations.directEnd.getTime() - stations.retrogradeStart.getTime()) / 86400000),
      centerDate: centerDate.toISOString(),
      sign: lonToSignName(startLon),
      isActive,
      preShadowStart: shadow.preShadowStart,
      postShadowEnd: shadow.postShadowEnd,
      isShadowActive,
    });
  }
  return cycles;
}

function findSuperiorCycles(
  Astro: AstronomyEngineSearchLike,
  planet: string,
  now: Date,
  maxCycles: number,
): RetrogradeCycle[] {
  // Scan forward from 120 days before now (to catch an already-active cycle)
  // for up to 3 synodic periods (Mars ~780d, Jupiter ~399d, Saturn ~378d).
  // Use a 3-day step to handle slow daily motion without numerical noise.
  const scanStart = new Date(now.getTime() - 120 * 86400000);
  const scanEnd = new Date(now.getTime() + 900 * 86400000);
  const stepDays = 3;

  const samples: Array<{ date: Date; lon: number | null }> = [];
  for (let t = scanStart.getTime(); t <= scanEnd.getTime(); t += stepDays * 86400000) {
    const date = new Date(t);
    samples.push({ date, lon: getPlanetEclipticLongitude(Astro, planet, date) });
  }
  const deltas: Array<{ date: Date; sign: number }> = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i].lon;
    const b = samples[i + 1].lon;
    if (a === null || b === null) continue;
    let delta = b - a;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    deltas.push({ date: samples[i + 1].date, sign: Math.sign(delta) });
  }

  // Collect transitions: forward(+)/zero → retro(-) = Rx start; retro(-) → forward(+)/zero = Direct end.
  const rxStarts: Date[] = [];
  const directEnds: Date[] = [];
  for (let i = 1; i < deltas.length; i++) {
    const prev = deltas[i - 1].sign;
    const curr = deltas[i].sign;
    if (prev >= 0 && curr < 0) rxStarts.push(deltas[i].date);
    else if (prev < 0 && curr >= 0) directEnds.push(deltas[i].date);
  }

  // If already retrograde at scan start, prepend a synthetic rxStart so the
  // currently-active cycle is captured even though its real Rx station is
  // before our scan window.
  if (deltas[0]?.sign < 0) {
    rxStarts.unshift(scanStart);
  }

  const cycles: RetrogradeCycle[] = [];
  let startIdx = 0;
  for (let i = 0; i < rxStarts.length && cycles.length < maxCycles; i++) {
    const rs = rxStarts[i];
    let de: Date | null = null;
    for (let j = startIdx; j < directEnds.length; j++) {
      if (directEnds[j].getTime() > rs.getTime()) {
        de = directEnds[j];
        startIdx = j + 1;
        break;
      }
    }
    if (!de) continue;
    // Skip cycles fully in the past.
    if (de.getTime() < now.getTime() - 86400000) continue;
    const startLon = getPlanetEclipticLongitude(Astro, planet, rs);
    const centerDate = new Date((rs.getTime() + de.getTime()) / 2);
    const isActive = now >= rs && now <= de;
    const shadow = findShadowBounds(Astro, planet, rs, de);
    const isShadowActive = !isActive && now >= new Date(shadow.preShadowStart) && now <= new Date(shadow.postShadowEnd);
    cycles.push({
      planet,
      startDate: rs.toISOString(),
      endDate: de.toISOString(),
      durationDays: Math.round((de.getTime() - rs.getTime()) / 86400000),
      centerDate: centerDate.toISOString(),
      sign: lonToSignName(startLon),
      isActive,
      preShadowStart: shadow.preShadowStart,
      postShadowEnd: shadow.postShadowEnd,
      isShadowActive,
    });
  }
  return cycles;
}

/**
 * Convenience: build a flat list of upcoming stations (sorted by date) from
 * the cycles. Each cycle contributes a "retrograde" station (start) and a
 * "direct" station (end).
 */
export function cyclesToStations(
  cycles: RetrogradeCycle[],
  now: Date,
): RetrogradeStation[] {
  const stations: RetrogradeStation[] = [];
  for (const c of cycles) {
    const startDate = new Date(c.startDate);
    const endDate = new Date(c.endDate);
    stations.push({
      planet: c.planet,
      type: "retrograde",
      date: c.startDate,
      daysFromNow: Math.round((startDate.getTime() - now.getTime()) / 86400000),
      sign: c.sign,
    });
    stations.push({
      planet: c.planet,
      type: "direct",
      date: c.endDate,
      daysFromNow: Math.round((endDate.getTime() - now.getTime()) / 86400000),
      sign: c.sign,
    });
  }
  return stations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
