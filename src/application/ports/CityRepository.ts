/**
 * CityRepository — порт для работы с городами (331 cities + custom).
 */
export interface CityRecord {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  timezoneOffsetHours: number;
  population?: number;
  qolIndex?: number;
  costIndex?: number;
  climate?: string;
  iso2?: string;
  custom?: boolean;
}

export interface CityRepository {
  findById(id: string): Promise<CityRecord | null>;
  search(query: string, limit?: number): Promise<CityRecord[]>;
  findNear(coord: { lat: number; lng: number }, radiusKm: number, limit?: number): Promise<CityRecord[]>;
  listAll(limit?: number): Promise<CityRecord[]>;
  saveCustom(city: Omit<CityRecord, "id" | "custom"> & { ownerId: string }): Promise<CityRecord>;
}

export interface CitySocialProof {
  cityId: string;
  chosenCount: number; // Redis INCR
  editorPick: boolean;
  anchorCity: boolean;
}
