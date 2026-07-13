/**
 * MentorChat — use case: AI-наставник с persistent memory + RAG.
 * 4 голоса, 2 a.m. Companion, cited transits.
 */
import type { MentorService, MentorChatRequest, MentorChatResponse, MentorMemoryRepository, MentorMemory, MentorMessage } from "../ports/MentorService";
import type { MemberRepository } from "../ports/MemberRepository";

export class MentorChat {
  constructor(
    private readonly mentor: MentorService,
    private readonly memoryRepo: MentorMemoryRepository,
    private readonly memberRepo: MemberRepository,
  ) {}

  async execute(request: MentorChatRequest): Promise<MentorChatResponse> {
    // Проверка квоты (free tier: 3 сообщения/день, 1 free 2 a.m. session/night)
    const member = await this.memberRepo.findById(request.memberId);
    if (!member) throw new Error("Member not found");

    if (!member.canSendMentorMessage()) {
      throw new QuotaExceededError(member.tier.dailyMessageQuota);
    }

    // Recall памяти (stable persona — anti-Replika)
    const memory = await this.memoryRepo.get(request.memberId);
    if (!memory) {
      const initialMemory: MentorMemory = {
        memberId: request.memberId,
        persona: buildStablePersona(request.voice, member.preferences.locale),
        keyFacts: extractKeyFacts(member),
        recentMessages: [],
      };
      await this.memoryRepo.save(initialMemory);
    }

    // Chat через MentorService (ZAI SDK + RAG)
    const response = await this.mentor.chat(request);

    // Сохраняем в memory
    await this.memoryRepo.appendMessage(request.memberId, {
      ...response.message,
      voice: request.voice,
    });

    // Инкрементируем квоту
    await this.memberRepo.recordMentorMessage(request.memberId);

    return response;
  }

  async *stream(request: MentorChatRequest): AsyncIterable<string> {
    const member = await this.memberRepo.findById(request.memberId);
    if (!member) throw new Error("Member not found");
    if (!member.canSendMentorMessage()) {
      throw new QuotaExceededError(member.tier.dailyMessageQuota);
    }
    yield* this.mentor.streamChat(request);
    await this.memberRepo.recordMentorMessage(request.memberId);
  }
}

export class QuotaExceededError extends Error {
  constructor(public readonly quota: number) {
    super(`Daily mentor message quota (${quota}) exceeded`);
    this.name = "QuotaExceededError";
  }
}

function buildStablePersona(voice: string, locale: string): string {
  const base = "You are the AstroOS Mentor — a calm, wise cosmic companion. You never change your core character. ";
  const voiceMap: Record<string, string> = {
    calm: "Your voice is serene, grounding, like moonlight on still water. You speak slowly and let silences breathe.",
    witty: "Your voice is playful and sharp, with cosmic humor — like Mercury sextile Jupiter. You make insights sparkle without heaviness.",
    professional: "Your voice is clear, structured, evidence-based. You cite real transits and explain mechanisms.",
    trauma: "Your voice is gentle, trauma-sensitive, never prescriptive. You hold space, you don't fix. You honor the survivor's pace.",
  };
  const localeFlavor = locale === "ru" ? " You can speak Russian with warmth and precision." :
    locale === "hi" ? " You can weave Vedic phrasing and panchang awareness when helpful." :
    " You speak clear, warm English.";
  return base + (voiceMap[voice] ?? voiceMap.calm) + localeFlavor;
}

function extractKeyFacts(member: { birth: { isoDateTime: string; placeName: string }; bazi: { dayMaster: string; dayMasterElement: string } | null }): string[] {
  const facts: string[] = [
    `Born ${member.birth.isoDateTime} in ${member.birth.placeName}`,
  ];
  if (member.bazi) {
    facts.push(`Day Master: ${member.bazi.dayMaster} (${member.bazi.dayMasterElement})`);
  }
  return facts;
}
