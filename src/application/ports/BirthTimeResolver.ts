/**
 * BirthTimeResolver — порт (интерфейс) для разрешения времени рождения.
 *
 * Clean Architecture: определяется в application-слое, реализуется адаптером
 * во внешнем слое (BirthTimeServiceClient → HTTP к Python-сервису).
 * Это позволяет подменять реализацию в тестах (mock) и сохранять
 * domain/use-case слой независимым от транспорта.
 */
export interface BirthTimeResolver {
  isAvailable(): Promise<boolean>;
  resolve(input: {
    localDate: string;
    localTime: string;
    placeId?: string;
    lat?: number;
    lng?: number;
    ianaZone?: string;
    timeQuality?: "exact" | "approx" | "unknown";
  }): Promise<BirthTimeResolution>;
}

export interface BirthTimeResolution {
  birthDataHash: string;
  utc: string;
  utcOffsetMinutes: number;
  dstActive: boolean;
  ianaZone: string;
  localMeanTime: string;
  trueSolarTime: string;
  equationOfTimeMinutes: number;
  tzdataVersion: string;
  ambiguity: "none" | "dst_fold" | "dst_gap";
  ambiguityNote: string;
  bazi: {
    shichen: string | null;
    note: string;
  };
}
