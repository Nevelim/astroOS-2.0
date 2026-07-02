/**
 * POST /api/iching — бросок Книги Перемен (64 гексаграммы, честный crypto-random).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { castIChingUseCase } from "@/infrastructure/composition-root";
import { db } from "@/lib/db";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";

const IChingSchema = z.object({
  question: z.string().max(500).optional(),
  memberId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = IChingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const data = parsed.data;

    const hexagram = castIChingUseCase.execute();

    // Сохраняем в БД если есть memberId (через session)
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    let memberId: string | undefined = data.memberId;
    if (!memberId && token) {
      memberId = (await sessionStore.getMemberIdBySession(token)) ?? undefined;
    }
    if (memberId) {
      await db.iChingCast.create({
        data: {
          memberId,
          primaryNumber: hexagram.primaryNumber,
          primaryName: hexagram.primaryName,
          changingLines: JSON.stringify(hexagram.changingLines),
          secondaryNumber: hexagram.secondaryNumber ?? null,
          judgment: hexagram.judgment.en,
          image: hexagram.image.en,
          question: data.question ?? null,
        },
      }).catch(() => void 0);
    }

    return NextResponse.json({ hexagram, question: data.question ?? null });
  } catch (error) {
    console.error("[iching] error:", error);
    return NextResponse.json({ error: "I-Ching cast failed" }, { status: 500 });
  }
}
