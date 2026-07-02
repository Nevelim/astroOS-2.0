/**
 * RankCities — use case: ранжирование городов для Member по формуле CityIndex.
 * Strategy pattern: разные ranking strategies (CityIndex / QoL-only / distance).
 */
import type { BirthData } from "../../domain/value-objects/BirthData";
import type { ChartResult } from "../ports/ChartCalculator";
import {
  CityIndex,
  CITY_INDEX_WEIGHTS,
  type CityIndexInputs,
  type CityIndexWeights,
} from "../../domain/entities/CityIndex";
import type { CityRepository, CityRecord } from "../ports/CityRepository";
import { classifyOrbisZone, orbisFactor } from "../../domain/entities/AstroLine";
import type { AstroLine, PlanetKey, CityLineInfluence } from "../../domain/entities/AstroLine";

export interface RankCitiesInput {
  birth: BirthData;
  chart: ChartResult;
  cities: CityRecord[];
  personaScore?: (city: CityRecord) => number;
  weights?: CityIndexWeights;
  limit?: number;
}

export interface RankedCity {
  city: CityRecord;
  index: CityIndex;
  influences: CityLineInfluence[];
  rank: number;
  sandwichPosition: "anchor" | "editor" | "chosen" | null;
}

export class RankCities {
  execute(input: RankCitiesInput): RankedCity[] {
    const weights = input.weights ?? CITY_INDEX_WEIGHTS;
    const limit = input.limit ?? 50;

    const ranked = input.cities.map((city) => {
      const influences = this.computeInfluences(city, input.chart.lines);
      const astroScore = this.computeAstroScore(influences);
      const personaScore = input.personaScore?.(city) ?? 0.5;
      const qol = (city.qolIndex ?? 50) / 100;
      const afford = city.costIndex ? Math.max(0, 1 - city.costIndex / 200) : 0.5;
      const velocity = Math.min(1, Math.log10((city.population ?? 10000) + 1) / 8);
      const irrationality = this.estimateIrrationality(city);

      const cityIndexInput: CityIndexInputs = {
        cityId: city.id,
        cityName: city.name,
        country: city.country,
        lat: city.lat,
        lng: city.lng,
        astroScore,
        qolScore: qol,
        affordabilityScore: afford,
        velocityScore: velocity,
        personaScore,
        irrationalityFactor: irrationality,
        population: city.population,
        climate: city.climate,
      };

      const index = CityIndex.compute(cityIndexInput, weights);
      return { city, index, influences, rank: 0, sandwichPosition: null as "anchor" | "editor" | "chosen" | null };
    });

    ranked.sort((a, b) => b.index.index - a.index.index);
    ranked.forEach((r, i) => {
      r.rank = i + 1;
      r.sandwichPosition = CityIndex.sandwichPosition(r.rank);
    });

    return ranked.slice(0, limit);
  }

  private computeInfluences(
    city: CityRecord,
    lines: ReadonlyArray<AstroLine>,
  ): CityLineInfluence[] {
    const influences: CityLineInfluence[] = [];
    for (const line of lines) {
      const distKm = this.distanceToLine(city, line);
      if (distKm > 444) continue; // дальше fading-зоны не считаем
      const zone = classifyOrbisZone(distKm);
      const factor = orbisFactor(zone);
      influences.push({
        planet: line.planet,
        type: line.type,
        distKm: Math.round(distKm),
        zone,
        weight: Math.round(line.weight * factor * 100) / 100,
      });
    }
    return influences.sort((a, b) => a.distKm - b.distKm);
  }

  /** Расстояние от точки до плоскости great-circle (3D-векторный расчёт). */
  private distanceToLine(city: CityRecord, line: AstroLine): number {
    // Используем ближайшую точку линии (упрощённо — реальные great-circle segments)
    let minDist = Infinity;
    for (const p of line.points) {
      const d = haversineKm(city.lat, city.lng, p.lat, p.lng);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  private computeAstroScore(influences: CityLineInfluence[]): number {
    if (influences.length === 0) return 0;
    const sum = influences.reduce((acc, inf) => acc + Math.max(0, inf.weight), 0);
    const negativeSum = influences.reduce((acc, inf) => acc + Math.max(0, -inf.weight), 0);
    return Math.max(0, Math.min(1, (sum - negativeSum * 0.5) / 4));
  }

  /** Эвристика K_irr — политическая/природная нестабильность. */
  private estimateIrrationality(city: CityRecord): number {
    const name = city.name.toLowerCase();
    const highRisk = ["damascus", "caracas", "pyongyang", "kabul", "khartoum"];
    const mediumRisk = ["istanbul", "cairo", "lagos", "karachi", "tehran"];
    if (highRisk.some((c) => name.includes(c))) return 0.9;
    if (mediumRisk.some((c) => name.includes(c))) return 0.5;
    return 0.1;
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
