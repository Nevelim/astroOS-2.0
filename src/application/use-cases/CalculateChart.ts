/**
 * CalculateChart — use case: расчёт натальной карты (44 линии + планеты).
 * Clean Architecture: orchestration, делегирует ChartCalculator + ChartCache.
 */
import type { BirthData } from "../../domain/value-objects/BirthData";
import type { ChartCalculator, ChartCache, ChartResult } from "../ports/ChartCalculator";

const SCHEMA_VERSION = "astroos-v8-2024";

export class CalculateChart {
  constructor(
    private readonly calculator: ChartCalculator,
    private readonly cache: ChartCache,
  ) {}

  async execute(birth: BirthData): Promise<ChartResult & { cached: boolean }> {
    const cacheKey = buildCacheKey(birth);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
    const result = await this.calculator.calculate(birth);
    await this.cache.set(cacheKey, result, 600); // 10 минут
    return { ...result, cached: false };
  }
}

export function buildCacheKey(birth: BirthData): string {
  return `${SCHEMA_VERSION}:${birth.cacheKey()}`;
}

export function bumpSchemaVersion(newVersion: string): void {
  // При изменении формулы — bump SCHEMA_VERSION для инвалидации всех cache entries
  (CalculateChart as unknown as { _SCHEMA_VERSION: string })._SCHEMA_VERSION = newVersion;
}
