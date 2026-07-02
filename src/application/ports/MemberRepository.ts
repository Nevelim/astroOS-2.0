/**
 * MemberRepository — порт (интерфейс) для доступа к данным Member.
 * Clean Architecture: use cases зависят от этого интерфейса, не от Prisma.
 * Interface Segregation: разделён на Read/Write/Search.
 */
import type { Member, MemberTier, Locale, VoiceProfile } from "../../domain/entities/Member";
import type { BirthData } from "../../domain/value-objects/BirthData";
import type { BaZi } from "../../domain/entities/BaZi";

export interface ReadableMemberRepository {
  findById(id: string): Promise<Member | null>;
  findByEmail(email: string): Promise<Member | null>;
}

export interface WritableMemberRepository {
  save(member: Member): Promise<Member>;
  updateBirthData(id: string, birth: BirthData): Promise<Member>;
  updateBaZi(id: string, bazi: BaZi): Promise<Member>;
  updateTier(id: string, tier: MemberTier, meta?: { trialEndsAt?: Date; renewsAt?: Date }): Promise<Member>;
  updatePreferences(id: string, prefs: { locale?: Locale; voice?: VoiceProfile; twoAmCompanionEnabled?: boolean; onboardingCompleted?: boolean }): Promise<Member>;
  incrementStreak(id: string): Promise<Member>;
  recordRitual(id: string): Promise<Member>;
  recordCityExplored(id: string): Promise<Member>;
  recordMentorMessage(id: string): Promise<Member>;
  resetDailyQuota(id: string): Promise<Member>;
}

export interface MemberRepository extends ReadableMemberRepository, WritableMemberRepository {}

export interface SessionStore {
  createSession(memberId: string, ttlHours?: number): Promise<string>;
  getMemberIdBySession(sessionToken: string): Promise<string | null>;
  destroySession(sessionToken: string): Promise<void>;
}
