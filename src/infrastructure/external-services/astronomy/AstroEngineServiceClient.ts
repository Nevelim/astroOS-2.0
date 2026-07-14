/**
 * AstroEngineServiceClient — HTTP-клиент к astro-engine (порт 3001).
 *
 * Реализует порт NatalChartResolver: запрашивает натальную карту
 * (планеты/дома/аспекты) у Python-сервиса (skyfield/DE421).
 *
 * Контракт: GET /v1/charts/natal/:birth_data_hash?house_system=whole_sign
 */
import type { NatalChart, NatalChartResolver } from "../../../application/ports/NatalChartResolver";

const SERVICE_URL = process.env.ASTRO_ENGINE_URL ?? "http://127.0.0.1:3001";
const TIMEOUT_MS = 5000; // skyfield cold-start может занять время

export class AstroEngineServiceClient implements NatalChartResolver {
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const r = await fetch(`${SERVICE_URL}/healthz`, { signal: controller.signal });
      clearTimeout(timer);
      return r.ok;
    } catch {
      return false;
    }
  }

  async resolve(
    birthDataHash: string,
    houseSystem: "placidus" | "whole_sign" = "whole_sign"
  ): Promise<NatalChart> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(
        `${SERVICE_URL}/v1/charts/natal/${birthDataHash}?house_system=${houseSystem}`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      if (!r.ok) {
        const problem = await r.json().catch(() => ({}));
        throw new Error(`astro-engine HTTP ${r.status}: ${problem?.detail ?? ""}`);
      }
      return this.mapResponse(await r.json());
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  private mapResponse(body: any): NatalChart {
    return {
      birthDataHash: body.birth_data_hash,
      birthUtc: body.birth_utc,
      latitude: body.latitude,
      longitude: body.longitude,
      houseSystem: body.house_system,
      planets: body.planets.map((p: any) => ({
        name: p.name,
        longitude: p.ecliptic_longitude_deg,
        sign: p.sign,
        degreeInSign: p.degree_in_sign,
        house: p.house,
        retrograde: p.retrograde,
      })),
      houses: {
        system: body.houses.system,
        cusps: body.houses.cusps_deg,
        angles: {
          ascendant: body.houses.angles.ascendant_deg,
          midheaven: body.houses.angles.midheaven_deg,
          descendant: body.houses.angles.descendant_deg,
          imumCoeli: body.houses.angles.imum_coeli_deg,
        },
        polarFallback: body.houses.polar_fallback,
      },
      aspects: body.aspects.map((a: any) => ({
        a: a.a, b: a.b, type: a.type, orb: a.orb_deg, separation: a.separation_deg,
      })),
    };
  }
}
