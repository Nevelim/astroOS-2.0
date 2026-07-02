/**
 * POST /api/tarot — вытягивание карт Таро (1/3/10 карт).
 * 78 карт Райдера-Уэйта-Смита, crypto-random shuffle.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DrawTarot } from "@/application/use-cases/DrawTarot";
import { db } from "@/lib/db";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";

const drawTarot = new DrawTarot();

const TarotSchema = z.object({
  spread: z.union([z.literal("single"), z.literal("three"), z.literal("celtic")]).default("three"),
  question: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = TarotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const data = parsed.data;

    const result = drawTarot.execute(data.spread);

    // Сохраняем draw если есть session
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    let memberId: string | undefined;
    if (token) {
      memberId = (await sessionStore.getMemberIdBySession(token)) ?? undefined;
    }
    if (memberId) {
      await db.tarotDraw.create({
        data: {
          memberId,
          spread: data.spread,
          cardsJson: JSON.stringify(result.cards.map((c) => ({
            cardId: c.card.id,
            name: c.card.name,
            reversed: c.reversed,
            position: c.position,
          }))),
          question: data.question ?? null,
        },
      }).catch(() => void 0);
    }

    return NextResponse.json({
      ...result,
      question: data.question ?? null,
      deckSize: 78,
    });
  } catch (error) {
    console.error("[tarot] error:", error);
    return NextResponse.json({ error: "Tarot draw failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    spreads: [
      { id: "single", name: "Single Card", count: 1, description: "Quick guidance for the present moment" },
      { id: "three", name: "Past · Present · Future", count: 3, description: "Timeline spread for understanding flow" },
      { id: "celtic", name: "Celtic Cross", count: 10, description: "Deep insight into complex situations" },
    ],
    deckSize: 78,
  });
}
