/**
 * BaziServiceClient — HTTP-клиент к bazi-engine (Python, порт 3002).
 *
 * Clean Architecture: реализует порт BaZiCalculator, делегируя расчёт
 * Python-сервису (Four Pillars + Day Master + Ten Gods + Luck Pillars,
 * верифицированному против sxtwl).
 *
 * Контракт: GET /v1/charts/bazi/:birth_data_hash
 *           → 200 { pillars, day_master, ten_gods, luck_pillars, ... }
 */
import type { BaZiCalculator } from "../../../application/ports/BaZiCalculator";
import type { BirthData } from "../../../domain/value-objects/BirthData";
import type { BaZi } from "../../../domain/entities/BaZi";
import { BaZi as BaZiEntity } from "../../../domain/entities/BaZi";

const BAZI_SERVICE_URL = process.env.BAZI_ENGINE_URL ?? "http://127.0.0.1:3002";
const TIMEOUT_MS = 3000;

export class BaziServiceClient implements BaZiCalculator {
  /**
   * @param birthDataHashProvider optional function returning the canonical
   *   birth_data_hash (from Birth-Time resolver). When absent, deriveHash()
   *   is used as fallback (full hash-match requires Birth-Time resolution).
   */
  constructor(private readonly birthDataHashProvider?: () => Promise<string | null>) {}

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const r = await fetch(`${BAZI_SERVICE_URL}/healthz`, { signal: controller.signal });
      clearTimeout(timer);
      return r.ok;
    } catch {
      return false;
    }
  }

  async calculate(birth: BirthData): Promise<BaZi> {
    // 1. Получить birth_data_hash (предпочитаем от Birth-Time resolver'а).
    const hash = (await this.birthDataHashProvider?.()) ?? (await this.deriveHash(birth));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const r = await fetch(`${BAZI_SERVICE_URL}/v1/charts/bazi/${hash}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);

      if (!r.ok) {
        const problem = await r.json().catch(() => ({}));
        throw new Error(`bazi-engine HTTP ${r.status}: ${problem?.detail ?? ""}`);
      }

      const data = await r.json();
      // Map REST response → domain entity BaZi.
      return BaZiEntity.create({
        yearPillar: pillarString(data.pillars.year),
        monthPillar: pillarString(data.pillars.month),
        dayPillar: pillarString(data.pillars.day),
        timePillar: data.pillars.hour ? pillarString(data.pillars.hour) : null,
        luckPillars: (data.luck_pillars ?? []).map((lp: any) => ({
          ageStart: lp.age_start,
          pillar: pillarString(lp.pillar),
          current: lp.current ?? false,
        })),
        elementBalance: data.favorable_elements ?? [],
        tenGods: Object.entries(data.ten_gs ?? data.ten_gods ?? {}).map(([k, v]) => ({
          pillar: k,
          god: v as string,
        })),
      });
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  /**
   * Fallback hash derivation — работает только если Python BaZi Engine имеет
   * entry в in-memory store под тем же hash. В production hash приходит из
   * Birth-Time resolver response.
   */
  private async deriveHash(birth: BirthData): Promise<string> {
    const payload = JSON.stringify({
      iso: birth.isoDateTime,
      lat: birth.coord.lat,
      lng: birth.coord.lng,
      tz: birth.timezoneOffsetHours,
    });
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    return "sha256:" + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
}

/** Build "stem-branch" string like "jia-zi" from a pillar DTO. */
function pillarString(p: { stem: string; branch: string }): string {
  return `${p.stem}-${p.branch}`;
}
