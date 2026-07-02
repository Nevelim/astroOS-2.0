/**
 * GeoCoord — value object для географических координат.
 * Immutable. Валидирует диапазон.
 * Clean Architecture: чистый TS, без framework зависимостей.
 */
export class GeoCoord {
  private constructor(
    public readonly lat: number,
    public readonly lng: number,
  ) {
    Object.freeze(this);
  }

  static create(lat: number, lng: number): GeoCoord {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error(`Invalid latitude: ${lat}. Must be [-90, 90].`);
    }
    // Нормализуем долготу в [-180, 180]
    const normalizedLng = ((lng + 540) % 360) - 180;
    if (!Number.isFinite(lng)) {
      throw new Error(`Invalid longitude: ${lng}.`);
    }
    return new GeoCoord(
      Math.round(lat * 1e6) / 1e6,
      Math.round(normalizedLng * 1e6) / 1e6,
    );
  }

  /** Антипод — точка на противоположной стороне Земли. */
  antipode(): GeoCoord {
    return GeoCoord.create(-this.lat, this.lng + 180);
  }

  /** Расстояние по great-circle в километрах (Haversine). */
  distanceKmTo(other: GeoCoord): number {
    const R = 6371.0088;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(other.lat - this.lat);
    const dLng = toRad(other.lng - this.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(this.lat)) *
        Math.cos(toRad(other.lat)) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  equals(other: GeoCoord): boolean {
    return this.lat === other.lat && this.lng === other.lng;
  }
}
