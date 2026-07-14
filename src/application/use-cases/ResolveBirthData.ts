/**
 * ResolveBirthData — use case: onboarding step that resolves birth time and
 * persists the canonical birth_data_hash on the Member.
 *
 * Flow:
 *   1. Call BirthTimeResolver.resolve() with user-entered data
 *   2. Store hash + TST + ianaZone on the Member (Prisma)
 *   3. Return the resolution so the UI can show the "wow" moment
 *
 * The hash becomes the cache key both engines read. After this use case
 * completes, GET /v1/charts/natal/:hash and /v1/charts/bazi/:hash work.
 */
import type { BirthTimeResolver, BirthTimeResolution } from "../ports/BirthTimeResolver";

export interface MemberBirthGateway {
  /** Persist the resolved birth fields onto the member. */
  saveBirthResolution(memberId: string, res: BirthTimeResolution): Promise<void>;
}

export class ResolveBirthData {
  constructor(
    private readonly resolver: BirthTimeResolver,
    private readonly members: MemberBirthGateway,
  ) {}

  async execute(input: {
    memberId: string;
    localDate: string;       // YYYY-MM-DD
    localTime: string;       // HH:MM
    placeId?: string;
    lat?: number;
    lng?: number;
    ianaZone?: string;
    timeQuality?: "exact" | "approx" | "unknown";
  }): Promise<BirthTimeResolution> {
    const resolution = await this.resolver.resolve({
      localDate: input.localDate,
      localTime: input.localTime,
      placeId: input.placeId,
      lat: input.lat,
      lng: input.lng,
      ianaZone: input.ianaZone,
      timeQuality: input.timeQuality,
    });

    await this.members.saveBirthResolution(input.memberId, resolution);

    return resolution;
  }
}
