/**
 * AstroLine — доменная сущность планетарной линии астрокартографии.
 * Great-circle дуга от birthplace до antipode.
 * Clean Architecture: чистый TS, без framework зависимостей.
 */
export type PlanetKey =
  | "Sun" | "Moon" | "Mercury" | "Venus" | "Mars"
  | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";

export type LineType = "MC" | "IC" | "Asc" | "Desc";

export type OrbisZone = "main" | "extended" | "fading";

export interface AstroLinePoint {
  lat: number;
  lng: number;
}

export class AstroLine {
  private constructor(
    public readonly planet: PlanetKey,
    public readonly type: LineType,
    public readonly points: ReadonlyArray<AstroLinePoint>,
    public readonly weight: number, // —1..1, позитивная/негативная
    public readonly tone: "gold" | "jade" | "rose" | "neutral",
  ) {
    Object.freeze(this);
    Object.freeze(this.points);
  }

  static create(input: {
    planet: PlanetKey;
    type: LineType;
    points: AstroLinePoint[];
    weight: number;
    tone?: "gold" | "jade" | "rose" | "neutral";
  }): AstroLine {
    if (input.points.length < 2) {
      throw new Error(`AstroLine ${input.planet}/${input.type} requires >=2 points, got ${input.points.length}`);
    }
    const clampedWeight = Math.max(-1, Math.min(1, input.weight));
    return new AstroLine(
      input.planet,
      input.type,
      input.points,
      clampedWeight,
      input.tone ?? AstroLine.inferTone(input.planet, input.type),
    );
  }

  private static inferTone(planet: PlanetKey, type: LineType): "gold" | "jade" | "rose" | "neutral" {
    const benefics: PlanetKey[] = ["Venus", "Jupiter", "Sun"];
    const malefics: PlanetKey[] = ["Saturn", "Mars", "Pluto"];
    if (benefics.includes(planet)) {
      return type === "IC" || type === "Desc" ? "rose" : "gold";
    }
    if (malefics.includes(planet)) {
      return type === "IC" ? "jade" : "neutral";
    }
    return "neutral";
  }

  get id(): string {
    return `${this.planet}-${this.type}`;
  }
}

export interface CityLineInfluence {
  planet: PlanetKey;
  type: LineType;
  distKm: number;
  zone: OrbisZone;
  weight: number; // уже умножен на factor зоны
}

/** Орбис-зоны — ступенчатое затухание влияния по расстоянию. */
export function classifyOrbisZone(distKm: number): OrbisZone {
  if (distKm <= 111) return "main";
  if (distKm <= 222) return "extended";
  if (distKm <= 444) return "fading";
  return "fading"; // дальше 444 — не показываем, но зону вернём
}

export function orbisFactor(zone: OrbisZone): number {
  switch (zone) {
    case "main": return 1.0;
    case "extended": return 0.7;
    case "fading": return 0.3;
  }
}
