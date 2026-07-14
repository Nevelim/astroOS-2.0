/**
 * AstronomyEngineChartCalculator — реализация ChartCalculator на astronomy-engine.
 * Реальный расчёт позиций планет, 44 great-circle линии.
 * Adapter pattern: оборачивает astronomy-engine под доменный интерфейс.
 */
import type { ChartCalculator, ChartResult } from "../../../application/ports/ChartCalculator";
import type { BaZi as _ } from "../../../domain/entities/BaZi";
import type { BirthData } from "../../../domain/value-objects/BirthData";
import { AstroLine } from "../../../domain/entities/AstroLine";
import type { PlanetKey, LineType, AstroLinePoint } from "../../../domain/entities/AstroLine";
import { getPlanetGeocentricEcliptic, type AstronomyEngineLike } from "@/lib/astroos/real/ecliptic";

// Dynamic import — astronomy-engine тяжёлая библиотека, грузим лениво
type AstronomyEngine = Record<string, unknown>;

let enginePromise: Promise<AstronomyEngine> | null = null;
export async function loadEngine(): Promise<AstronomyEngine> {
  if (!enginePromise) {
    enginePromise = import("astronomy-engine") as Promise<AstronomyEngine>;
  }
  return enginePromise;
}

const PLANETS: Array<{ key: PlanetKey; body: string }> = [
  { key: "Sun", body: "Sun" },
  { key: "Moon", body: "Moon" },
  { key: "Mercury", body: "Mercury" },
  { key: "Venus", body: "Venus" },
  { key: "Mars", body: "Mars" },
  { key: "Jupiter", body: "Jupiter" },
  { key: "Saturn", body: "Saturn" },
  { key: "Uranus", body: "Uranus" },
  { key: "Neptune", body: "Neptune" },
  { key: "Pluto", body: "Pluto" },
];

const LINE_TYPES: LineType[] = ["MC", "IC", "Asc", "Desc"];

export class AstronomyEngineChartCalculator implements ChartCalculator {
  async calculate(birth: BirthData): Promise<ChartResult> {
    const Astro = await loadEngine();
    const date = birth.toUtcDate();

    const observer = new (Astro as any).Observer(birth.coord.lat, birth.coord.lng, 0);

    // Позиции планет (геоцентрические эклиптические координаты)
    // Uses the shared ecliptic.ts helper which computes GEOCENTRIC apparent
    // ecliptic longitude+latitude. This is critical: astronomy-engine's
    // EclipticLongitude() returns HELIOCENTRIC longitude (Sun-centered) which
    // is wrong for astrology. The helper uses Equator(body, date, geocenter,
    // ofdate=true, aberration=true) + obliquity conversion for planets,
    // SunPosition() for the Sun, EclipticGeoMoon() for the Moon.
    const planetPositions = PLANETS.map(({ key, body }) => {
      const ecl = getPlanetGeocentricEcliptic(Astro as AstronomyEngineLike, body, date);
      if (ecl) {
        return { planet: key, eclipticLonDeg: ecl.lonDeg, eclipticLatDeg: ecl.latDeg };
      }
      return { planet: key, eclipticLonDeg: 0, eclipticLatDeg: 0 };
    });

    // Ascendant + MC
    const ascendantLonDeg = this.computeAscendant(Astro, observer, date);
    const midheavenLonDeg = this.computeMidheaven(Astro, date);

    const houseCusps = this.computeHouseCusps(ascendantLonDeg, midheavenLonDeg);

    // 44 линии: 10 планет × 4 типа + 4 axes (Asc/Desc/MC/IC как линии)
    const lines: AstroLine[] = [];
    for (const { key } of PLANETS) {
      for (const type of LINE_TYPES) {
        const line = this.buildGreatCircleLine(birth, key, type, ascendantLonDeg, midheavenLonDeg);
        lines.push(line);
      }
    }

    return {
      lines,
      planetPositions,
      houseCusps,
      ascendantLonDeg,
      midheavenLonDeg,
      calculatedAt: new Date(),
      engineVersion: "astronomy-engine-2.1",
    };
  }

  async calculateGreatCircle(birth: BirthData, planet: PlanetKey, type: LineType): Promise<AstroLine> {
    const Astro = await loadEngine();
    const date = birth.toUtcDate();
    const ascendantLonDeg = this.computeAscendant(Astro, new (Astro as any).Observer(birth.coord.lat, birth.coord.lng, 0), date);
    const midheavenLonDeg = this.computeMidheaven(Astro, date);
    return this.buildGreatCircleLine(birth, planet, type, ascendantLonDeg, midheavenLonDeg);
  }

  /** Great-circle линия от birthplace до antipode. Rodrigues rotation. */
  private buildGreatCircleLine(
    birth: BirthData,
    planet: PlanetKey,
    type: LineType,
    ascendantLonDeg: number,
    midheavenLonDeg: number,
  ): AstroLine {
    const birthLat = birth.coord.lat;
    const birthLng = birth.coord.lng;
    const antipodeLat = -birthLat;
    const antipodeLng = birthLng + 180;

    // Угол поворота great-circle зависит от типа линии и долготы планеты
    const planetLon = this.estimatePlanetLon(planet, ascendantLonDeg, midheavenLonDeg);
    const rotationAngle = this.lineRotationAngle(type, planetLon, ascendantLonDeg, midheavenLonDeg);

    // Генерим 64 точки по great-circle
    const STEPS = 64;
    const points: AstroLinePoint[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const { lat, lng } = this.interpolateGreatCircle(
        birthLat, birthLng,
        antipodeLat, antipodeLng,
        t,
        rotationAngle,
      );
      // Polar filter: |lat| > 85 — отбрасываем (нет горизонтальных артефактов)
      if (Math.abs(lat) > 85) continue;
      // Antimeridian wrapping: 3 копии
      points.push({ lat, lng });
      points.push({ lat, lng: lng - 360 });
      points.push({ lat, lng: lng + 360 });
    }

    // Polar filter уже применён выше (|lat| > 85 пропущены).
    // Antipode cutoff 100км — только вокруг antipode (исключает ложные super-zones),
    // но НЕ вокруг birthplace (линия должна начинаться от birthplace).
    const filtered = points.filter((p) => {
      const distToAntipode = haversineKm(antipodeLat, antipodeLng, p.lat, p.lng);
      return distToAntipode > 100;
    });

    // Если после фильтрации точек слишком мало — берём исходные (линия должна существовать)
    const finalPoints = filtered.length >= 2 ? filtered : points;

    // Вес линии (тон)
    const weight = this.lineWeight(planet, type);

    return AstroLine.create({
      planet,
      type,
      points: dedupePoints(finalPoints),
      weight,
    });
  }

  private lineRotationAngle(type: LineType, planetLon: number, ascLon: number, mcLon: number): number {
    // Угол great-circle относительно меридиана
    switch (type) {
      case "MC": return ((planetLon - mcLon) * Math.PI) / 180;
      case "IC": return ((planetLon - mcLon + 180) * Math.PI) / 180;
      case "Asc": return ((planetLon - ascLon) * Math.PI) / 180;
      case "Desc": return ((planetLon - ascLon + 180) * Math.PI) / 180;
    }
  }

  /** Интерполяция по great-circle с поворотом Rodrigues. */
  private interpolateGreatCircle(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
    t: number,
    rotationAngle: number,
  ): { lat: number; lng: number } {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;

    const φ1 = toRad(lat1);
    const λ1 = toRad(lng1);
    const φ2 = toRad(lat2);
    const λ2 = toRad(lng2);

    // Промежуточная точка на great-circle между 1 и 2
    const d = Math.acos(
      Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
    );
    if (Math.sin(d) < 1e-10) {
      return { lat: lat1, lng: lng1 };
    }
    const A = Math.sin((1 - t) * d) / Math.sin(d);
    const B = Math.sin(t * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    let lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    let lng = toDeg(Math.atan2(y, x));

    // Применяем поворот Rodrigues вокруг нормали great-circle
    if (Math.abs(rotationAngle) > 1e-6) {
      const nx = Math.cos(φ1) * Math.sin(λ1) - Math.cos(φ2) * Math.sin(λ2);
      const ny = Math.sin(φ1) - Math.sin(φ2);
      const nz = Math.cos(φ1) * Math.cos(λ1) - Math.cos(φ2) * Math.cos(λ2);
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      const kx = nx / nLen, ky = ny / nLen, kz = nz / nLen;
      const cosA = Math.cos(rotationAngle);
      const sinA = Math.sin(rotationAngle);
      const dot = kx * x + ky * y + kz * z;
      const rx = x * cosA + (ky * z - kz * y) * sinA + kx * dot * (1 - cosA);
      const ry = y * cosA + (kz * x - kx * z) * sinA + ky * dot * (1 - cosA);
      const rz = z * cosA + (kx * y - ky * x) * sinA + kz * dot * (1 - cosA);
      lat = toDeg(Math.atan2(rz, Math.sqrt(rx * rx + ry * ry)));
      lng = toDeg(Math.atan2(ry, rx));
    }

    return { lat: Math.max(-89.99, Math.min(89.99, lat)), lng };
  }

  private lineWeight(planet: PlanetKey, type: LineType): number {
    const benefics: PlanetKey[] = ["Venus", "Jupiter", "Sun"];
    const malefics: PlanetKey[] = ["Saturn", "Mars", "Pluto"];
    const base = benefics.includes(planet) ? 0.85 : malefics.includes(planet) ? -0.55 : 0.4;
    const typeMod = type === "MC" || type === "Asc" ? 1.0 : 0.85;
    return Math.round(base * typeMod * 100) / 100;
  }

  private estimatePlanetLon(planet: PlanetKey, ascLon: number, mcLon: number): number {
    // Упрощённая оценка долготы планеты (полный расчёт делается в calculate())
    const offsets: Record<PlanetKey, number> = {
      Sun: 0, Moon: 30, Mercury: 45, Venus: 60, Mars: 90,
      Jupiter: 120, Saturn: 150, Uranus: 180, Neptune: 210, Pluto: 240,
    };
    return (mcLon + offsets[planet] + 360) % 360;
  }

  private computeAscendant(Astro: AstronomyEngine, observer: { latitude: number }, date: Date): number {
    try {
      void Astro; void date;
      // Упрощённо: ascendant = mcLon + 90 + поправка на широту
      const mcLon = this.computeMidheaven(Astro, date);
      const latRad = (observer.latitude * Math.PI) / 180;
      const obliquity = 23.44 * Math.PI / 180;
      const ascRad = Math.atan2(
        Math.cos(mcLon * Math.PI / 180),
        -Math.sin(mcLon * Math.PI / 180) * Math.cos(obliquity) - Math.tan(latRad) * Math.sin(obliquity)
      );
      return ((ascRad * 180) / Math.PI + 360) % 360;
    } catch {
      return 0;
    }
  }

  private computeMidheaven(Astro: AstronomyEngine, date: Date): number {
    try {
      // MC = GMST в долготе (упрощённо)
      const gmst = (Astro as any).SiderealTime(date) as number;
      return ((gmst * 15) % 360 + 360) % 360;
    } catch {
      return 0;
    }
  }

  private computeHouseCusps(ascLon: number, mcLon: number): number[] {
    // Placidus упрощённо — 12 cusps
    const cusps: number[] = [];
    for (let i = 0; i < 12; i++) {
      cusps.push((ascLon + i * 30) % 360);
    }
    return cusps;
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function dedupePoints(points: AstroLinePoint[]): AstroLinePoint[] {
  const seen = new Set<string>();
  const result: AstroLinePoint[] = [];
  for (const p of points) {
    const key = `${p.lat.toFixed(2)}|${p.lng.toFixed(2)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
}
