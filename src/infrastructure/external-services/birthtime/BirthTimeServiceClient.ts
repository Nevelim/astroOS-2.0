/**
 * BirthTimeServiceClient — HTTP-клиент к birth-time-service (порт 3009).
 *
 * Clean Architecture: внешний адаптер, реализующий порт BirthTimeResolver.
 * Делегирует всё вычисление TST/DST/EoT Python-сервису (single source of truth).
 *
 * Контракт: GET /v1/birth-time/resolve?local_date=...&local_time=...&place_id=...
 *           → 200 { birth_data_hash, resolution: { utc, true_solar_time, ... }, bazi: { shichen } }
 */
import type { BirthTimeResolution, BirthTimeResolver } from "../../../application/ports/BirthTimeResolver";

const SERVICE_URL = process.env.BIRTH_TIME_SERVICE_URL ?? "http://127.0.0.1:3009";
const TIMEOUT_MS = 3000;

export class BirthTimeServiceClient implements BirthTimeResolver {
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

  async resolve(input: {
    localDate: string;       // "YYYY-MM-DD"
    localTime: string;       // "HH:MM"
    placeId?: string;        // geonames:...
    lat?: number;
    lng?: number;
    ianaZone?: string;
    timeQuality?: "exact" | "approx" | "unknown";
  }): Promise<BirthTimeResolution> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const params = new URLSearchParams({
        local_date: input.localDate,
        local_time: input.localTime,
      });
      if (input.placeId) params.set("place_id", input.placeId);
      if (input.lat !== undefined) params.set("lat", String(input.lat));
      if (input.lng !== undefined) params.set("lng", String(input.lng));
      if (input.ianaZone) params.set("iana_zone", input.ianaZone);
      if (input.timeQuality) params.set("time_quality", input.timeQuality);

      const r = await fetch(
        `${SERVICE_URL}/v1/birth-time/resolve?${params.toString()}`,
        { signal: controller.signal }
      );
      clearTimeout(timer);

      if (!r.ok) {
        const problem = await r.json().catch(() => ({}));
        throw new BirthTimeError(r.status, problem?.detail ?? `HTTP ${r.status}`, problem?.type);
      }

      const body = await r.json();
      return mapResponse(body);
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof BirthTimeError) throw e;
      throw new BirthTimeError(503, `birth-time service unreachable: ${(e as Error).message}`, "service/unreachable");
    }
  }

  async autocomplete(query: string, lang = "ru"): Promise<GeoResult[]> {
    if (query.trim().length < 2) return [];
    const params = new URLSearchParams({ q: query, lang, limit: "8" });
    const r = await fetch(`${SERVICE_URL}/v1/geo/autocomplete?${params}`);
    if (!r.ok) return [];
    const body = await r.json();
    return body.results ?? [];
  }
}

export interface GeoResult {
  place_id: string;
  name: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  iana_zone: string;
  population: number;
}

export class BirthTimeError extends Error {
  constructor(public readonly status: number, message: string, public readonly type?: string) {
    super(message);
    this.name = "BirthTimeError";
  }
}

function mapResponse(body: any): BirthTimeResolution {
  const r = body.resolution;
  return {
    birthDataHash: body.birth_data_hash,
    utc: r.utc,
    utcOffsetMinutes: r.utc_offset_minutes,
    dstActive: r.dst_active,
    ianaZone: r.iana_zone,
    localMeanTime: r.local_mean_time,
    trueSolarTime: r.true_solar_time,
    equationOfTimeMinutes: r.equation_of_time_minutes,
    tzdataVersion: r.tzdata_version,
    ambiguity: r.ambiguity,
    ambiguityNote: r.ambiguity_note,
    bazi: {
      shichen: body.bazi.shichen,
      note: body.bazi.note,
    },
  };
}
