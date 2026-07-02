/**
 * BaZiCalculator — порт для расчёта BaZi (4 столпа + Luck Pillars + Ten Gods).
 * withFallback pattern: Python primary → TS fallback → static templates.
 */
import type { BirthData } from "../../domain/value-objects/BirthData";
import type { BaZi } from "../../domain/entities/BaZi";

export interface BaZiCalculator {
  calculate(birth: BirthData): Promise<BaZi>;
  isAvailable(): Promise<boolean>;
}

export interface BaZiCache {
  get(cacheKey: string): Promise<BaZi | null>;
  set(cacheKey: string, bazi: BaZi, ttlSeconds?: number): Promise<void>;
}

export type BaZiSource = "python" | "ts-fallback" | "static-template";

export interface BaZiResultWithSource {
  bazi: BaZi;
  source: BaZiSource;
  latencyMs: number;
}
