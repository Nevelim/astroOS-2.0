/**
 * Composition Root — точка сборки зависимостей (Dependency Injection).
 * Clean Architecture: внешний слой (Frameworks) создаёт конкретные реализации
 * и внедряет их в use cases через конструкторы.
 *
 * Здесь "склеиваются" все слои:
 *   infrastructure implementations → application use cases → interface (API routes)
 */
import { AstronomyEngineChartCalculator } from "./external-services/astronomy/AstronomyEngineChartCalculator";
import { AstroEngineServiceClient } from "./external-services/astronomy/AstroEngineServiceClient";
import { TypeScriptBaZiCalculator } from "./external-services/bazi/TypeScriptBaZiCalculator";
import { BaziServiceClient } from "./external-services/bazi/BaziServiceClient";
import { BirthTimeServiceClient } from "./external-services/birthtime/BirthTimeServiceClient";
import { ZAIMentorService } from "./external-services/zai/ZAIMentorService";
import { PrismaMemberRepository } from "./database/repositories/PrismaMemberRepository";
import { PrismaMentorMemoryRepository } from "./database/repositories/PrismaMentorMemoryRepository";
import { InMemoryCache, chartCache, baziCache } from "./cache/InMemoryCache";

import type { ChartCalculator, ChartCache } from "../application/ports/ChartCalculator";
import type { BaZiCalculator, BaZiCache } from "../application/ports/BaZiCalculator";
import type { MentorService, MentorMemoryRepository } from "../application/ports/MentorService";
import type { BirthTimeResolver } from "../application/ports/BirthTimeResolver";
import type { NatalChartResolver } from "../application/ports/NatalChartResolver";

import { CalculateChart } from "../application/use-cases/CalculateChart";
import { CalculateBaZi } from "../application/use-cases/CalculateBaZi";
import { RankCities } from "../application/use-cases/RankCities";
import { MentorChat } from "../application/use-cases/MentorChat";
import { CastIChing } from "../application/use-cases/CastIChing";
import { DrawTarot } from "../application/use-cases/DrawTarot";

// === Infrastructure adapters (singletons) ===
// PRIMARY = Python-микросервисы (production-grade: skyfield/DE421, sxtwl-verified BaZi).
// FALLBACK = TypeScript-only калькуляторы (для dev без запущенных Python-сервисов).
const tsChartCalculator: ChartCalculator = new AstronomyEngineChartCalculator();
const natalChartClient: NatalChartResolver = new AstroEngineServiceClient();
const tsBaZiCalculator: BaZiCalculator = new TypeScriptBaZiCalculator();
const pythonBaZiCalculator: BaZiCalculator = new BaziServiceClient();

// Birth-Time resolver — единственный источник birth_data_hash для всех движков.
export const birthTimeResolver: BirthTimeResolver = new BirthTimeServiceClient();

const chartCacheAdapter: ChartCache = {
  get: (k) => chartCache.get(k) as Promise<unknown extends never ? never : any>,
  set: (k, v, ttl) => chartCache.set(k, v as unknown as never, ttl),
  invalidate: (k) => chartCache.invalidate(k),
} as ChartCache;

const baziCacheAdapter: BaZiCache = {
  get: (k) => baziCache.get(k) as Promise<any>,
  set: (k, v, ttl) => baziCache.set(k, v as unknown as never, ttl),
} as BaZiCache;

const memberRepo = new PrismaMemberRepository();
const mentorMemoryRepo: MentorMemoryRepository = new PrismaMentorMemoryRepository();
const mentorService: MentorService = new ZAIMentorService(mentorMemoryRepo);

// === Use Cases (внедряем зависимости через конструкторы) ===
// Astrocartography Chart (44 great-circle lines) — keeps existing TS calculator.
export const calculateChartUseCase = new CalculateChart(tsChartCalculator, chartCacheAdapter);
// BaZi: primary = Python BaZi Engine, fallback = TS calculator.
export const calculateBaZiUseCase = new CalculateBaZi(pythonBaZiCalculator, tsBaZiCalculator, baziCacheAdapter);
export const rankCitiesUseCase = new RankCities();
export const mentorChatUseCase = new MentorChat(mentorService, mentorMemoryRepo, memberRepo);
export const castIChingUseCase = new CastIChing();
export const drawTarotUseCase = new DrawTarot();

// Natal chart (planets/houses/aspects) — Python Astro Engine client.
// Separate from astrocartography; exposes its own port NatalChartResolver.
export const natalChartResolver: NatalChartResolver = natalChartClient;

// === Repositories (для API routes) ===
export { memberRepo, mentorMemoryRepo, mentorService };

// === Cache metrics (для /api/health) ===
export function getCacheStats() {
  return {
    chart: chartCache.stats,
    bazi: baziCache.stats,
  };
}

// Void unused imports
void InMemoryCache;
