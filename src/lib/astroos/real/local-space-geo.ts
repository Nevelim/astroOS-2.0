/**
 * local-space-geo — convert local-space azimuths into map geometry.
 *
 * The Python local-space engine returns each planet's azimuth (compass bearing
 * from North, clockwise, 0–360°) and altitude (above/below horizon). To draw
 * these as radial lines on a leaflet map originating at a city, we convert an
 * azimuth + length into a destination lat/lng via the spherical "destination
 * point" formula. Above-horizon planets get a longer, brighter spoke; below-
 * horizon planets get a shorter, dimmer dashed spoke.
 *
 * Pure math — no React, no leaflet dependency. The map component consumes the
 * returned polyline points.
 */

export interface LocalSpaceSpoke {
  planet: string;
  /** Two lat/lng endpoints: [origin, destination]. */
  points: [[number, number], [number, number]];
  azimuthDeg: number;
  altitudeDeg: number;
  aboveHorizon: boolean;
  sector: string;
}

const EARTH_RADIUS_KM = 6371.0;

/**
 * Destination point given a start, bearing (azimuth), and distance.
 * Standard spherical formula (e.g. Movable Type scripts).
 * Returns [lat, lng] in degrees.
 */
export function destinationPoint(
  latDeg: number,
  lngDeg: number,
  bearingDeg: number,
  distanceKm: number,
): [number, number] {
  const lat1 = (latDeg * Math.PI) / 180;
  const lng1 = (lngDeg * Math.PI) / 180;
  const brng = (bearingDeg * Math.PI) / 180;
  const dByR = distanceKm / EARTH_RADIUS_KM;

  const sinLat2 = Math.sin(lat1) * Math.cos(dByR) +
    Math.cos(lat1) * Math.sin(dByR) * Math.cos(brng);
  const lat2 = Math.asin(sinLat2);
  const y = Math.sin(brng) * Math.sin(dByR) * Math.cos(lat1);
  const x = Math.cos(dByR) - Math.sin(lat1) * sinLat2;
  const lng2 = lng1 + Math.atan2(y, x);

  return [
    (lat2 * 180) / Math.PI,
    (((lng2 * 180) / Math.PI + 540) % 360) - 180,
  ];
}

/**
 * Build radial spokes for a set of planet azimuths from an origin point.
 *
 * @param originLat, @param originLng — the city/observer point.
 * @param planets — planet_lines from the local-space response.
 * @param aboveLengthKm — spoke length for above-horizon planets (default 120).
 * @param belowLengthKm — spoke length for below-horizon planets (default 60).
 */
export function buildLocalSpaceSpokes(
  originLat: number,
  originLng: number,
  planets: Array<{
    planet: string;
    azimuth_deg: number;
    altitude_deg: number;
    above_horizon: boolean;
    sector: string;
  }>,
  aboveLengthKm = 120,
  belowLengthKm = 60,
): LocalSpaceSpoke[] {
  return planets.map((p) => {
    const len = p.above_horizon ? aboveLengthKm : belowLengthKm;
    const dest = destinationPoint(originLat, originLng, p.azimuth_deg, len);
    return {
      planet: p.planet,
      points: [[originLat, originLng], dest] as [[number, number], [number, number]],
      azimuthDeg: p.azimuth_deg,
      altitudeDeg: p.altitude_deg,
      aboveHorizon: p.above_horizon,
      sector: p.sector,
    };
  });
}

/** Compass-sector interpretation for the "best direction per sphere" UI. */
export const SECTOR_LABELS: Record<string, { ru: string; en: string; hi: string }> = {
  N: { ru: "Север", en: "North", hi: "उत्तर" },
  NE: { ru: "Северо-восток", en: "Northeast", hi: "उत्तर-पूर्व" },
  E: { ru: "Восток", en: "East", hi: "पूर्व" },
  SE: { ru: "Юго-восток", en: "Southeast", hi: "दक्षिण-पूर्व" },
  S: { ru: "Юг", en: "South", hi: "दक्षिण" },
  SW: { ru: "Юго-запад", en: "Southwest", hi: "दक्षिण-पश्चिम" },
  W: { ru: "Запад", en: "West", hi: "पश्चिम" },
  NW: { ru: "Северо-запад", en: "Northwest", hi: "उत्तर-पश्चिम" },
};
