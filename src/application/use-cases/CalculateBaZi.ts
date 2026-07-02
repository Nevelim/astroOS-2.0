/**
 * CalculateBaZi — use case: расчёт BaZi с withFallback pattern.
 * Python primary → TS fallback → static templates.
 */
import type { BirthData } from "../../domain/value-objects/BirthData";
import type { BaZi } from "../../domain/entities/BaZi";
import type { BaZiCalculator, BaZiCache, BaZiResultWithSource } from "../ports/BaZiCalculator";

const BAZI_SCHEMA_VERSION = "bazi-v1-2024";
const BAZI_CACHE_TTL = 3600; // 1 час

export class CalculateBaZi {
  constructor(
    private readonly primary: BaZiCalculator, // Python service
    private readonly fallback: BaZiCalculator, // TS calc
    private readonly cache: BaZiCache,
  ) {}

  async execute(birth: BirthData): Promise<BaZiResultWithSource> {
    const cacheKey = `${BAZI_SCHEMA_VERSION}:${birth.cacheKey()}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return { bazi: cached, source: "python", latencyMs: 0 };
    }

    const start = Date.now();
    // withFallback: Python primary → TS fallback
    const primaryAvailable = await this.primary.isAvailable().catch(() => false);
    const calculator = primaryAvailable ? this.primary : this.fallback;
    const source = primaryAvailable ? "python" : "ts-fallback";

    try {
      const bazi = await Promise.race([
        calculator.calculate(birth),
        timeout(5000, "BaZi calc timeout"),
      ]);
      await this.cache.set(cacheKey, bazi, BAZI_CACHE_TTL);
      return { bazi, source, latencyMs: Date.now() - start };
    } catch (primaryError) {
      // Финальный fallback — TS fallback всегда должен работать
      if (calculator !== this.fallback) {
        const bazi = await this.fallback.calculate(birth);
        await this.cache.set(cacheKey, bazi, BAZI_CACHE_TTL);
        return { bazi, source: "ts-fallback", latencyMs: Date.now() - start };
      }
      throw primaryError;
    }
  }
}

function timeout(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}
