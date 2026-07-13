/**
 * POST /api/power-card — создать Power Card (viral share, НИКОГДА не гейтируется).
 * GET /api/power-card — список Power Cards пользователя.
 * NO demo data — real users only, 401 if not authenticated.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";

async function getMemberId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return sessionStore.getMemberIdBySession(token);
}

export async function GET(req: NextRequest) {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) {
      return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
    }

    const cards = await db.powerCard.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      powerCards: cards.map((c) => ({
        id: c.id,
        cardType: c.cardType,
        title: c.title,
        description: c.description,
        sharedCount: c.sharedCount,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("[power-card GET] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) {
      return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
    }

    const body = await req.json();
    const { cardType, title, description } = body as {
      cardType: "day-master" | "top-city" | "gift" | "edge" | "voice";
      title: string;
      description: string;
    };

    if (!cardType || !title) {
      return NextResponse.json({ error: "cardType and title required" }, { status: 400 });
    }

    const card = await db.powerCard.create({
      data: {
        memberId,
        cardType,
        title,
        description: description ?? "",
      },
    });

    return NextResponse.json({
      powerCard: {
        id: card.id,
        cardType: card.cardType,
        title: card.title,
        description: card.description,
        sharedCount: 0,
        shareUrl: `${new URL(req.url).origin}/?card=${card.id}`,
      },
      message: "Power Cards are ALWAYS free — reciprocity over restriction.",
    });
  } catch (error) {
    console.error("[power-card POST] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
