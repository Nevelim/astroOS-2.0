/**
 * Member — доменная сущность пользователя AstroOS.
 * Содержит birth data, BaZi-профиль, tier, streak, prefs.
 */
import type { BirthData } from "../value-objects/BirthData";
import type { BaZi } from "./BaZi";

export type MemberTier = "free" | "trial" | "pro_monthly" | "pro_annual" | "lifetime" | "b2b";
export type VoiceProfile = "calm" | "witty" | "professional" | "trauma";
export type Locale = "ru" | "en" | "hi";

export interface MemberIdentity {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface MemberStats {
  streak: number;
  wardThisWeek: number; // Weekly Active Ritual Days 0..7
  ritualsCompleted: number;
  citiesExplored: number;
  mentorMessages: number;
}

export interface MemberTierState {
  tier: MemberTier;
  trialEndsAt?: Date;
  subscriptionRenewsAt?: Date;
  dailyMessageQuota: number;
  dailyMessagesUsed: number;
}

export class Member {
  private constructor(
    public readonly identity: MemberIdentity,
    public readonly birth: BirthData,
    public readonly bazi: BaZi | null,
    public readonly stats: MemberStats,
    public readonly tier: MemberTierState,
    public readonly preferences: {
      locale: Locale;
      voice: VoiceProfile;
      twoAmCompanionEnabled: boolean;
      onboardingCompleted: boolean;
    },
  ) {
    Object.freeze(this);
  }

  static create(input: {
    identity: MemberIdentity;
    birth: BirthData;
    bazi?: BaZi | null;
    stats?: Partial<MemberStats>;
    tier?: Partial<MemberTierState>;
    preferences?: {
      locale?: Locale;
      voice?: VoiceProfile;
      twoAmCompanionEnabled?: boolean;
      onboardingCompleted?: boolean;
    };
  }): Member {
    return new Member(
      input.identity,
      input.birth,
      input.bazi ?? null,
      {
        streak: input.stats?.streak ?? 0,
        wardThisWeek: input.stats?.wardThisWeek ?? 0,
        ritualsCompleted: input.stats?.ritualsCompleted ?? 0,
        citiesExplored: input.stats?.citiesExplored ?? 0,
        mentorMessages: input.stats?.mentorMessages ?? 0,
      },
      {
        tier: input.tier?.tier ?? "free",
        trialEndsAt: input.tier?.trialEndsAt,
        subscriptionRenewsAt: input.tier?.subscriptionRenewsAt,
        dailyMessageQuota: input.tier?.dailyMessageQuota ?? (input.tier?.tier === "free" ? 3 : 9999),
        dailyMessagesUsed: input.tier?.dailyMessagesUsed ?? 0,
      },
      {
        locale: input.preferences?.locale ?? "en",
        voice: input.preferences?.voice ?? "calm",
        twoAmCompanionEnabled: input.preferences?.twoAmCompanionEnabled ?? false,
        onboardingCompleted: input.preferences?.onboardingCompleted ?? false,
      },
    );
  }

  isPremium(): boolean {
    return ["pro_monthly", "pro_annual", "lifetime", "b2b"].includes(this.tier.tier);
  }

  isTrialActive(): boolean {
    return this.tier.tier === "trial" && !!this.tier.trialEndsAt && this.tier.trialEndsAt > new Date();
  }

  canSendMentorMessage(): boolean {
    return this.tier.dailyMessagesUsed < this.tier.dailyMessageQuota;
  }

  wardTargetMet(): boolean {
    return this.stats.wardThisWeek >= 4;
  }
}
