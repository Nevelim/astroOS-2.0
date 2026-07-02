/**
 * BirthData — value object для данных рождения.
 * Содержит всё необходимое для расчёта натальной карты и BaZi.
 */
import { GeoCoord } from "./GeoCoord";

export type Gender = 0 | 1; // 0 = female, 1 = male (BaZi Luck Pillars зависят от пола)

export class BirthData {
  private constructor(
    public readonly isoDateTime: string, // ISO 8601 local: "1989-11-07T04:17"
    public readonly coord: import("./GeoCoord").GeoCoord,
    public readonly timezoneOffsetHours: number, // birth-time UTC offset
    public readonly gender: Gender,
    public readonly placeName: string,
  ) {
    Object.freeze(this);
  }

  static create(input: {
    dateTimeLocal: string;
    lat: number;
    lng: number;
    timezoneOffsetHours: number;
    gender: Gender;
    placeName: string;
  }): BirthData {
    if (!input.dateTimeLocal || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input.dateTimeLocal)) {
      throw new Error(`Invalid dateTimeLocal: ${input.dateTimeLocal}`);
    }
    if (!Number.isFinite(input.timezoneOffsetHours) || Math.abs(input.timezoneOffsetHours) > 14) {
      throw new Error(`Invalid timezoneOffsetHours: ${input.timezoneOffsetHours}`);
    }
    return new BirthData(
      input.dateTimeLocal,
      GeoCoord.create(input.lat, input.lng),
      input.timezoneOffsetHours,
      input.gender,
      input.placeName,
    );
  }

  /** Ключ кэша — детерминированный sha1-friendly string. */
  cacheKey(): string {
    return [
      this.isoDateTime,
      this.coord.lat.toFixed(4),
      this.coord.lng.toFixed(4),
      this.timezoneOffsetHours,
      this.gender,
    ].join("|");
  }

  /** Дата в UTC. */
  toUtcDate(): Date {
    const local = new Date(this.isoDateTime + "Z");
    return new Date(local.getTime() - this.timezoneOffsetHours * 3600_000);
  }
}
