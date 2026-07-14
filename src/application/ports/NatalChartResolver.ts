/**
 * NatalChartResolver — порт для расчёта натальной карты (планеты/дома/аспекты).
 *
 * Отделяется от ChartCalculator (астрокартография — 44 great-circle линии).
 * Натальная карта — это позиции планет в знаках/домах + аспекты между ними.
 *
 * Реализация: AstroEngineServiceClient → HTTP к Python astro-engine (порт 3001).
 */
export interface NatalChartResolver {
  isAvailable(): Promise<boolean>;
  resolve(birthDataHash: string, houseSystem?: "placidus" | "whole_sign"): Promise<NatalChart>;
}

export interface NatalChart {
  birthDataHash: string;
  birthUtc: string;
  latitude: number;
  longitude: number;
  houseSystem: string;
  planets: NatalPlanet[];
  houses: {
    system: string;
    cusps: number[];
    angles: { ascendant: number; midheaven: number; descendant: number; imumCoeli: number };
    polarFallback: boolean;
  };
  aspects: NatalAspect[];
}

export interface NatalPlanet {
  name: string;
  longitude: number;
  sign: string;
  degreeInSign: number;
  house: number;
  retrograde: boolean;
}

export interface NatalAspect {
  a: string;
  b: string;
  type: string;
  orb: number;
  separation: number;
}
