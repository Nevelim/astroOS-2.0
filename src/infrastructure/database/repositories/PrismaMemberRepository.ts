/**
 * PrismaMemberRepository — реализация MemberRepository поверх Prisma.
 * Adapter pattern: переводит Prisma-записи в доменные сущности Member.
 * Clean Architecture: infrastructure layer, зависит от Prisma (внешний слой).
 */
import { db } from "../../../lib/db";
import type {
  MemberRepository,
  ReadableMemberRepository,
  WritableMemberRepository,
} from "../../../application/ports/MemberRepository";
import type { Member, MemberIdentity, MemberStats, MemberTier, MemberTierState } from "../../../domain/entities/Member";
import type { BirthData } from "../../../domain/value-objects/BirthData";
import type { BaZi } from "../../../domain/entities/BaZi";
import { Member as MemberEntity } from "../../../domain/entities/Member";
import { BirthData as BirthDataVO } from "../../../domain/value-objects/BirthData";

type PrismaMember = {
  id: string;
  email: string;
  passwordHash: string | null;
  displayName: string;
  avatarUrl: string | null;
  birthDateTime: string;
  birthLat: number;
  birthLng: number;
  birthTzOffset: number;
  birthPlaceName: string;
  gender: number;
  baziStem: string | null;
  baziElement: string | null;
  baziJson: string | null;
  streak: number;
  wardThisWeek: number;
  ritualsCompleted: number;
  citiesExplored: number;
  mentorMessages: number;
  dailyMessagesUsed: number;
  dailyQuotaResetAt: Date | null;
  tier: string;
  trialEndsAt: Date | null;
  subscriptionRenewsAt: Date | null;
  locale: string;
  voice: string;
  twoAmEnabled: boolean;
  onboardingDone: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

function toDomain(p: PrismaMember, bazi: BaZi | null): Member {
  const identity: MemberIdentity = {
    id: p.id,
    email: p.email,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl ?? undefined,
    createdAt: p.createdAt,
  };
  const birth = BirthDataVO.create({
    dateTimeLocal: p.birthDateTime,
    lat: p.birthLat,
    lng: p.birthLng,
    timezoneOffsetHours: p.birthTzOffset,
    gender: p.gender === 1 ? 1 : 0,
    placeName: p.birthPlaceName,
  });
  const stats: MemberStats = {
    streak: p.streak,
    wardThisWeek: p.wardThisWeek,
    ritualsCompleted: p.ritualsCompleted,
    citiesExplored: p.citiesExplored,
    mentorMessages: p.mentorMessages,
  };
  const tier: MemberTierState = {
    tier: p.tier as MemberTier,
    trialEndsAt: p.trialEndsAt ?? undefined,
    subscriptionRenewsAt: p.subscriptionRenewsAt ?? undefined,
    dailyMessageQuota: p.tier === "free" ? 3 : 9999,
    dailyMessagesUsed: p.dailyMessagesUsed,
  };
  return MemberEntity.create({
    identity,
    birth,
    bazi,
    stats,
    tier,
    preferences: {
      locale: p.locale as "ru" | "en" | "hi",
      voice: p.voice as "calm" | "witty" | "professional" | "trauma",
      twoAmCompanionEnabled: p.twoAmEnabled,
      onboardingCompleted: p.onboardingDone,
    },
  });
}

export class PrismaMemberRepository implements MemberRepository {
  async findById(id: string): Promise<Member | null> {
    const p = await db.member.findUnique({ where: { id } });
    if (!p) return null;
    return toDomain(p as unknown as PrismaMember, null);
  }

  async findByEmail(email: string): Promise<Member | null> {
    const p = await db.member.findUnique({ where: { email } });
    if (!p) return null;
    return toDomain(p as unknown as PrismaMember, null);
  }

  async save(member: Member): Promise<Member> {
    const created = await db.member.upsert({
      where: { email: member.identity.email },
      update: {},
      create: {
        email: member.identity.email,
        passwordHash: null,
        displayName: member.identity.displayName,
        avatarUrl: member.identity.avatarUrl ?? null,
        birthDateTime: member.birth.isoDateTime,
        birthLat: member.birth.coord.lat,
        birthLng: member.birth.coord.lng,
        birthTzOffset: member.birth.timezoneOffsetHours,
        birthPlaceName: member.birth.placeName,
        gender: member.birth.gender,
        streak: member.stats.streak,
        wardThisWeek: member.stats.wardThisWeek,
        ritualsCompleted: member.stats.ritualsCompleted,
        citiesExplored: member.stats.citiesExplored,
        mentorMessages: member.stats.mentorMessages,
        dailyMessagesUsed: member.tier.dailyMessagesUsed,
        tier: member.tier.tier,
        trialEndsAt: member.tier.trialEndsAt ?? null,
        subscriptionRenewsAt: member.tier.subscriptionRenewsAt ?? null,
        locale: member.preferences.locale,
        voice: member.preferences.voice,
        twoAmEnabled: member.preferences.twoAmCompanionEnabled,
        onboardingDone: member.preferences.onboardingCompleted,
        lastLoginAt: new Date(),
      },
    });
    return toDomain(created as unknown as PrismaMember, null);
  }

  async updateBirthData(id: string, birth: BirthData): Promise<Member> {
    const updated = await db.member.update({
      where: { id },
      data: {
        birthDateTime: birth.isoDateTime,
        birthLat: birth.coord.lat,
        birthLng: birth.coord.lng,
        birthTzOffset: birth.timezoneOffsetHours,
        birthPlaceName: birth.placeName,
        gender: birth.gender,
      },
    });
    return toDomain(updated as unknown as PrismaMember, null);
  }

  async updateBaZi(id: string, bazi: BaZi): Promise<Member> {
    const updated = await db.member.update({
      where: { id },
      data: {
        baziStem: bazi.dayMaster,
        baziElement: bazi.dayMasterElement,
        baziJson: JSON.stringify(bazi),
      },
    });
    return toDomain(updated as unknown as PrismaMember, bazi);
  }

  async updateTier(id: string, tier: MemberTier, meta?: { trialEndsAt?: Date; renewsAt?: Date }): Promise<Member> {
    const updated = await db.member.update({
      where: { id },
      data: {
        tier,
        trialEndsAt: meta?.trialEndsAt ?? null,
        subscriptionRenewsAt: meta?.renewsAt ?? null,
      },
    });
    return toDomain(updated as unknown as PrismaMember, null);
  }

  async updatePreferences(id: string, prefs: {
    locale?: "ru" | "en" | "hi";
    voice?: "calm" | "witty" | "professional" | "trauma";
    twoAmCompanionEnabled?: boolean;
    onboardingCompleted?: boolean;
  }): Promise<Member> {
    const updated = await db.member.update({
      where: { id },
      data: {
        ...(prefs.locale && { locale: prefs.locale }),
        ...(prefs.voice && { voice: prefs.voice }),
        ...(prefs.twoAmCompanionEnabled !== undefined && { twoAmEnabled: prefs.twoAmCompanionEnabled }),
        ...(prefs.onboardingCompleted !== undefined && { onboardingDone: prefs.onboardingCompleted }),
      },
    });
    return toDomain(updated as unknown as PrismaMember, null);
  }

  async incrementStreak(id: string): Promise<Member> {
    const updated = await db.member.update({
      where: { id },
      data: { streak: { increment: 1 } },
    });
    return toDomain(updated as unknown as PrismaMember, null);
  }

  async recordRitual(id: string): Promise<Member> {
    const updated = await db.member.update({
      where: { id },
      data: {
        ritualsCompleted: { increment: 1 },
        wardThisWeek: { increment: 1 },
      },
    });
    return toDomain(updated as unknown as PrismaMember, null);
  }

  async recordCityExplored(id: string): Promise<Member> {
    const updated = await db.member.update({
      where: { id },
      data: { citiesExplored: { increment: 1 } },
    });
    return toDomain(updated as unknown as PrismaMember, null);
  }

  async recordMentorMessage(id: string): Promise<Member> {
    const now = new Date();
    const member = await db.member.findUnique({ where: { id } });
    if (!member) throw new Error("Member not found");
    // Reset daily quota if last reset > 24h ago
    const shouldReset = !member.dailyQuotaResetAt ||
      (now.getTime() - member.dailyQuotaResetAt.getTime()) > 24 * 3600_000;
    const updated = await db.member.update({
      where: { id },
      data: {
        mentorMessages: { increment: 1 },
        dailyMessagesUsed: shouldReset ? 1 : { increment: 1 },
        dailyQuotaResetAt: shouldReset ? now : member.dailyQuotaResetAt,
      },
    });
    return toDomain(updated as unknown as PrismaMember, null);
  }

  async resetDailyQuota(id: string): Promise<Member> {
    const updated = await db.member.update({
      where: { id },
      data: {
        dailyMessagesUsed: 0,
        dailyQuotaResetAt: new Date(),
      },
    });
    return toDomain(updated as unknown as PrismaMember, null);
  }
}

export const memberRepository: ReadableMemberRepository & WritableMemberRepository = new PrismaMemberRepository();
