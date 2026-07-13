/**
 * BaziServiceClient — адаптер для bazi-service (порт 3004).
 * withFallback primary: вызывает mini-service через HTTP.
 * Clean Architecture: реализует порт BaZiCalculator.
 */
import type { BaZiCalculator } from "../../../application/ports/BaZiCalculator";
import type { BirthData } from "../../../domain/value-objects/BirthData";
import type { BaZi } from "../../../domain/entities/BaZi";
import { BaZi as BaZiEntity } from "../../../domain/entities/BaZi";

const BAZI_SERVICE_URL = "http://localhost:3004";
const TIMEOUT_MS = 3000;

export class BaziServiceClient implements BaZiCalculator {
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const r = await fetch(`${BAZI_SERVICE_URL}/health`, { signal: controller.signal });
      clearTimeout(timer);
      return r.ok;
    } catch {
      return false;
    }
  }

  async calculate(birth: BirthData): Promise<BaZi> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const r = await fetch(`${BAZI_SERVICE_URL}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDateTime: birth.isoDateTime,
          birthLat: birth.coord.lat,
          birthLng: birth.coord.lng,
          birthTzOffset: birth.timezoneOffsetHours,
          gender: birth.gender,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!r.ok) throw new Error(`bazi-service HTTP ${r.status}`);
      const data = await r.json();
      const b = data.bazi;
      return BaZiEntity.create({
        yearPillar: b.yearPillar,
        monthPillar: b.monthPillar,
        dayPillar: b.dayPillar,
        timePillar: b.timePillar,
        luckPillars: b.luckPillars ?? [],
        elementBalance: b.elementBalance,
        tenGods: b.tenGods ?? [],
      });
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }
}
