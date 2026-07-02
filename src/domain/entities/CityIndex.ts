/**
 * CityIndex — доменная сущность ранжирования города для Member.
 * Формула (locked, не менять без A/B):
 *   CityIndex = (M × V) / (1 + K_irr)
 * Веса: wAstro=0.42, wQol=0.22, wAfford=0.12, wVelocity=0.14, wPersona=0.10
 */
export type CityTone = "gold" | "jade" | "rose" | "neutral";
export type MatchType = "favorable" | "challenging" | "neutral";

export interface CityIndexInputs {
  cityId: string;
  cityName: string;
  country: string;
  lat: number;
  lng: number;
  astroScore: number; // 0..1 — сумма влияний линий
  qolScore: number; // 0..1 — quality of life
  affordabilityScore: number; // 0..1 — доступность
  velocityScore: number; // 0..1 — рост/динамика
  personaScore: number; // 0..1 — совместимость с профилем
  irrationalityFactor: number; // 0..1 — K_irr (политическая/природная нестабильность)
  population?: number;
  climate?: string;
}

export interface CityIndexWeights {
  wAstro: number;
  wQol: number;
  wAfford: number;
  wVelocity: number;
  wPersona: number;
}

export const CITY_INDEX_WEIGHTS: CityIndexWeights = {
  wAstro: 0.42,
  wQol: 0.22,
  wAfford: 0.12,
  wVelocity: 0.14,
  wPersona: 0.10,
};

export class CityIndex {
  private constructor(
    public readonly cityId: string,
    public readonly cityName: string,
    public readonly country: string,
    public readonly lat: number,
    public readonly lng: number,
    public readonly index: number, // 0..100
    public readonly magnetism: number, // M: 0..1
    public readonly visibility: number, // V: 0..1
    public readonly irrationality: number, // K_irr: 0..1
    public readonly weights: CityIndexWeights,
    public readonly tone: CityTone,
    public readonly matchType: MatchType,
    public readonly demoted: boolean,
  ) {
    Object.freeze(this);
  }

  static compute(input: CityIndexInputs, weights: CityIndexWeights = CITY_INDEX_WEIGHTS): CityIndex {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const magnetism =
      weights.wAstro * clamp01(input.astroScore) +
      weights.wQol * clamp01(input.qolScore) +
      weights.wAfford * clamp01(input.affordabilityScore);

    const visibility =
      weights.wVelocity * clamp01(input.velocityScore) +
      weights.wPersona * clamp01(input.personaScore);

    const irrationality = clamp01(input.irrationalityFactor);

    // CityIndex = (M × V) / (1 + K_irr)
    const rawIndex = (magnetism * visibility) / (1 + irrationality);

    // Нормализуем в 0..100 (M*V теоретически до ~0.5, масштабируем ×200)
    const index = Math.round(Math.min(100, rawIndex * 200));

    const demoted = irrationality >= 0.75;
    const tone = CityIndex.inferTone(magnetism, visibility);
    const matchType: MatchType = magnetism > 0.55 ? "favorable" : magnetism > 0.3 ? "neutral" : "challenging";

    return new CityIndex(
      input.cityId,
      input.cityName,
      input.country,
      input.lat,
      input.lng,
      index,
      Math.round(magnetism * 1000) / 1000,
      Math.round(visibility * 1000) / 1000,
      Math.round(irrationality * 1000) / 1000,
      weights,
      tone,
      matchType,
      demoted,
    );
  }

  private static inferTone(magnetism: number, visibility: number): CityTone {
    const composite = magnetism * 0.6 + visibility * 0.4;
    if (composite > 0.7) return "gold";
    if (composite > 0.5) return "jade";
    if (composite > 0.35) return "rose";
    return "neutral";
  }

  /** Sandwich Position: top-3 получают pills (anchor/editor's pick/most chosen). */
  static sandwichPosition(rank: number): "anchor" | "editor" | "chosen" | null {
    if (rank === 1) return "anchor";
    if (rank === 2) return "editor";
    if (rank === 3) return "chosen";
    return null;
  }
}
