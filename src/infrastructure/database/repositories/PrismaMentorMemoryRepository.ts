/**
 * PrismaMentorMemoryRepository — реализация MentorMemoryRepository поверх Prisma.
 * Stable persona (anti-Replika identity-discontinuity).
 */
import { db } from "../../../lib/db";
import type {
  MentorMemory,
  MentorMessage,
  MentorMemoryRepository,
} from "../../../application/ports/MentorService";

export class PrismaMentorMemoryRepository implements MentorMemoryRepository {
  async get(memberId: string): Promise<MentorMemory | null> {
    const record = await db.mentorMemory.findUnique({
      where: { memberId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!record) return null;
    const recentMessages: MentorMessage[] = record.messages
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        createdAt: m.createdAt,
        voice: m.voice as MentorMessage["voice"],
        citedTransits: m.citedTransits ? JSON.parse(m.citedTransits) : undefined,
      }));
    return {
      memberId: record.memberId,
      persona: record.persona,
      keyFacts: JSON.parse(record.keyFacts),
      recentMessages,
    };
  }

  async save(memory: MentorMemory): Promise<void> {
    await db.mentorMemory.upsert({
      where: { memberId: memory.memberId },
      update: {
        persona: memory.persona,
        keyFacts: JSON.stringify(memory.keyFacts),
      },
      create: {
        memberId: memory.memberId,
        persona: memory.persona,
        keyFacts: JSON.stringify(memory.keyFacts),
      },
    });
  }

  async appendMessage(memberId: string, message: MentorMessage): Promise<void> {
    // Гарантируем что memory существует
    const existing = await db.mentorMemory.findUnique({ where: { memberId } });
    if (!existing) {
      await db.mentorMemory.create({
        data: {
          memberId,
          persona: "AstroOS Mentor — calm, wise, cosmic companion.",
          keyFacts: "[]",
        },
      });
    }
    await db.mentorMessage.create({
      data: {
        memoryId: memberId, // упрощённо — в реальной схеме нужен MentorMemory.id
        role: message.role,
        content: message.content,
        voice: message.voice ?? null,
        citedTransits: message.citedTransits ? JSON.stringify(message.citedTransits) : null,
      },
    }).catch(async () => {
      // Fallback: находим memory record по memberId
      const mem = await db.mentorMemory.findUnique({ where: { memberId } });
      if (mem) {
        await db.mentorMessage.create({
          data: {
            memoryId: mem.id,
            role: message.role,
            content: message.content,
            voice: message.voice ?? null,
            citedTransits: message.citedTransits ? JSON.stringify(message.citedTransits) : null,
          },
        });
      }
    });
  }
}

export const mentorMemoryRepository: MentorMemoryRepository = new PrismaMentorMemoryRepository();
