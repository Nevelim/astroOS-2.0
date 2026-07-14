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
import type { Pillar, TenGod, FiveElement } from "../../../domain/entities/BaZi";
import { BaZi as BaZiEntity, HEAVENLY_STEMS, EARTHLY_BRANCHES } from "../../../domain/entities/BaZi";

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
      const yearPillar = toPillar(data.pillars.year);
      const monthPillar = toPillar(data.pillars.month);
      const dayPillar = toPillar(data.pillars.day);
      const timePillarRaw = data.pillars.hour ? toPillar(data.pillars.hour) : null;
      return BaZiEntity.create({
        yearPillar,
        monthPillar,
        dayPillar,
        timePillar: timePillarRaw ?? dayPillar, // BaZi requires a non-null time pillar; fall back to day pillar when hour unknown
        luckPillars: (data.luck_pillars ?? []).map((lp: any) => ({
          ...toPillar(lp.pillar),
          startAge: lp.age_start,
          endAge: lp.age_end ?? (lp.age_start + 9),
          direction: (lp.direction === "reverse" ? "reverse" : "forward") as "forward" | "reverse",
        })),
        elementBalance: toElementBalance([data.pillars.year, data.pillars.month, data.pillars.day, data.pillars.hour].filter(Boolean)),
        tenGods: toTenGods(data.ten_gs ?? data.ten_gods ?? {}),
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

type PillarDto = { stem?: string; branch?: string; stem_hanzi?: string; branch_hanzi?: string; element?: string };

/**
 * Build a domain Pillar from a REST pillar DTO. The API returns pinyin
 * stem/branch plus the hanzi forms; the domain Pillar uses hanzi literals,
 * so we resolve via the HEAVENLY_STEMS / EARTHLY_BRANCHES tables and fall
 * back to looking the value up directly.
 */
function toPillar(p: PillarDto): Pillar {
  const stemHanzi = p.stem_hanzi ?? p.stem ?? "";
  const branchHanzi = p.branch_hanzi ?? p.branch ?? "";
  const stemMeta =
    HEAVENLY_STEMS.find((s) => s.stem === (stemHanzi as any)) ??
    HEAVENLY_STEMS.find((s) => s.pinyin.toLowerCase() === String(stemHanzi).toLowerCase());
  const branchMeta = EARTHLY_BRANCHES.find((b) => b.branch === (branchHanzi as any));
  const stemElement = (stemMeta?.element ?? (p.element as any)) as Pillar["stemElement"];
  const stemYinYang = (stemMeta?.yinYang ?? "Yang") as Pillar["stemYinYang"];
  return {
    stem: (stemMeta?.stem ?? stemHanzi) as Pillar["stem"],
    branch: (branchMeta?.branch ?? branchHanzi) as Pillar["branch"],
    stemElement,
    stemYinYang,
  };
}

const TEN_GOD_BY_API_VALUE: Record<string, TenGod> = {
  friend: "Companion",
  rob_wealth: "Rob Wealth",
  eating_god: "Eating God",
  hurting_officer: "Hurting Officer",
  direct_resource: "Resource",
  indirect_resource: "Indirect Resource",
  direct_officer: "Direct Officer",
  seven_killings: "Seven Killings",
  direct_wealth: "Direct Wealth",
  indirect_wealth: "Partial Wealth",
};

/** Map the {pillar: godValue} dict from the API onto the TenGod union. */
function toTenGods(raw: Record<string, string>): TenGod[] {
  return Object.values(raw)
    .map((v) => TEN_GOD_BY_API_VALUE[v] ?? ("Resource" as TenGod))
    .filter((g): g is TenGod => Boolean(g));
}

/**
 * The API exposes per-pillar stem `element` and a list of favorable elements,
 * but not a full element balance. Derive a FiveElement count record from the
 * pillar stem elements (defaulting unrepresented elements to 0).
 */
function toElementBalance(pillars: PillarDto[]): Record<FiveElement, number> {
  const balance: Record<FiveElement, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const p of pillars) {
    const el = p.element as FiveElement | undefined;
    if (el && el in balance) balance[el] += 1;
  }
  return balance;
}
