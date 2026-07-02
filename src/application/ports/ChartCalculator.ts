/**
 * ChartCalculator — порт для расчёта натальной карты и астрокартографии.
 * Strategy pattern: разные реализации (astronomy-engine / static mock).
 */
import type { BirthData } from "../../domain/value-objects/BirthData";
import type { AstroLine, PlanetKey, LineType } from "../../domain/entities/AstroLine";

export interface ChartResult {
  lines: ReadonlyArray<AstroLine>;
  planetPositions: ReadonlyArray<{ planet: PlanetKey; eclipticLonDeg: number; eclipticLatDeg: number }>;
  houseCusps: ReadonlyArray<number>; // 12 cusps
  ascendantLonDeg: number;
  midheavenLonDeg: number;
  calculatedAt: Date;
  engineVersion: string;
}

export interface ChartCalculator {
  /** Полный расчёт карты: 44 линии + позиции планет + cusps. */
  calculate(birth: BirthData): Promise<ChartResult>;
  /** Одна great-circle линия (для batch endpoint). */
  calculateGreatCircle(birth: BirthData, planet: PlanetKey, type: LineType): Promise<AstroLine>;
}

export interface ChartCache {
  get(cacheKey: string): Promise<ChartResult | null>;
  set(cacheKey: string, result: ChartResult, ttlSeconds?: number): Promise<void>;
  invalidate(cacheKey: string): Promise<void>;
}
