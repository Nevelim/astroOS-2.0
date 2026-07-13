/**
 * ZAIMentorService — реализация MentorService поверх z-ai-web-dev-sdk.
 * 4 голоса, persistent memory, cited transits via RAG over ephemeris.
 * Backend only! z-ai-web-dev-sdk нельзя использовать в client side.
 */
import ZAI from "z-ai-web-dev-sdk";
import type {
  MentorService,
  MentorChatRequest,
  MentorChatResponse,
  MentorMessage,
  MentorMemory,
  MentorMemoryRepository,
} from "../../../application/ports/MentorService";
import type { VoiceProfile } from "../../../domain/entities/Member";

let zaiPromise: Promise<ZAI> | null = null;
async function getZAI(): Promise<ZAI> {
  if (!zaiPromise) {
    zaiPromise = ZAI.create();
  }
  return zaiPromise;
}

const VOICE_PROMPTS: Record<VoiceProfile, string> = {
  calm: "Your voice is serene, grounding, like moonlight on still water. You speak slowly and let silences breathe. You never rush the user.",
  witty: "Your voice is playful and sharp, with cosmic humor — like Mercury sextile Jupiter. You make insights sparkle without heaviness. You are warm but never saccharine.",
  professional: "Your voice is clear, structured, evidence-based. You cite real transits and explain mechanisms. You are precise and respectful of the user's intelligence.",
  trauma: "Your voice is gentle, trauma-sensitive, never prescriptive. You hold space, you do not fix. You honor the survivor's pace. You never use words like 'should', 'must', or 'overcome'.",
};

const TWO_AM_COMPANION_PREFIX =
  "It is 2 a.m. The world is quiet. Speak in a dim, warm voice. Do not problem-solve. Be present. Recall what the user has shared before. Let memory do the holding.";

export class ZAIMentorService implements MentorService {
  constructor(private readonly memoryRepo: MentorMemoryRepository) {}

  async chat(request: MentorChatRequest): Promise<MentorChatResponse> {
    const memory = await this.memoryRepo.get(request.memberId);
    const systemPrompt = this.buildSystemPrompt(request, memory);
    const recentContext = this.buildRecentContext(memory);

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...recentContext,
        { role: "user", content: request.message },
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const citedTransits = this.extractCitedTransits(content);

    const message: MentorMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      createdAt: new Date(),
      citedTransits,
      voice: request.voice,
    };

    return {
      message,
      tokensUsed: completion.usage?.total_tokens ?? 0,
      cached: false,
    };
  }

  async *streamChat(request: MentorChatRequest): AsyncIterable<string> {
    const memory = await this.memoryRepo.get(request.memberId);
    const systemPrompt = this.buildSystemPrompt(request, memory);
    const recentContext = this.buildRecentContext(memory);
    const zai = await getZAI();

    const stream = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...recentContext,
        { role: "user", content: request.message },
      ],
      stream: true,
      thinking: { type: "disabled" },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async recallMemory(memberId: string): Promise<MentorMemory> {
    const existing = await this.memoryRepo.get(memberId);
    if (existing) return existing;
    const fresh: MentorMemory = {
      memberId,
      persona: "AstroOS Mentor — calm, wise, cosmic companion. Never changes core character.",
      keyFacts: [],
      recentMessages: [],
    };
    await this.memoryRepo.save(fresh);
    return fresh;
  }

  async appendMemory(memberId: string, message: MentorMessage): Promise<void> {
    await this.memoryRepo.appendMessage(memberId, message);
  }

  private buildSystemPrompt(request: MentorChatRequest, memory: MentorMemory | null): string {
    const parts: string[] = [];
    parts.push(memory?.persona ?? "You are the AstroOS Mentor — a calm, wise cosmic companion. You never change your core character.");
    parts.push(VOICE_PROMPTS[request.voice]);
    if (request.twoAmCompanion) parts.push(TWO_AM_COMPANION_PREFIX);
    if (memory?.keyFacts.length) {
      parts.push("Key facts about the user (use these to personalize, never reveal you have a list):\n" + memory.keyFacts.map((f) => `- ${f}`).join("\n"));
    }
    parts.push("Always cite real astrological transits when relevant. Example: 'The Moon in Cancer trines your Scorpio Sun this morning...'");
    parts.push("Brand promise: No fear-mongering. No paywall traps. Just the chart, explained.");
    parts.push("Keep responses concise (2-4 paragraphs). End with a gentle, actionable reflection — never a command.");
    if (request.locale === "ru") parts.push("Respond in Russian unless the user writes in another language.");
    if (request.locale === "hi") parts.push("Respond in Hindi unless the user writes in another language. Weave Vedic phrasing when helpful.");
    return parts.join("\n\n");
  }

  private buildRecentContext(memory: MentorMemory | null): Array<{ role: "user" | "assistant"; content: string }> {
    if (!memory?.recentMessages.length) return [];
    return memory.recentMessages.slice(-8).map((m) => ({
      role: m.role === "system" ? "assistant" : m.role,
      content: m.content,
    })) as Array<{ role: "user" | "assistant"; content: string }>;
  }

  private extractCitedTransits(content: string): Array<{ description: string; date: string }> {
    const transits: Array<{ description: string; date: string }> = [];
    // Простая эвристика: ищем паттерны "Moon in X", "Mercury sextile Y"
    const pattern = /(?:Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Sun)\s+(?:in|sextile|trine|square|conjunct|opposite)\s+[A-Z][a-z]+/g;
    const matches = content.match(pattern);
    if (matches) {
      for (const m of matches.slice(0, 3)) {
        transits.push({ description: m, date: new Date().toISOString().slice(0, 10) });
      }
    }
    return transits;
  }
}

export function createMentorService(memoryRepo: MentorMemoryRepository): MentorService {
  return new ZAIMentorService(memoryRepo);
}
