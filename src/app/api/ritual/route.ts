/**
 * POST /api/ritual — записать ритуал (WARD tracking, streak).
 * GET /api/ritual — получить статистику недели (WARD 0-7).
 * NO demo data — real users only, 401 if not authenticated.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";

async function getMemberId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return sessionStore.getMemberIdBySession(token);
}

const RitualSchema = z.object({
  type: z.enum(["today", "reveal", "cast-iching", "tarot", "mentor", "explore-city", "horoscope"]),
  screenKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) {
      return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
    }

    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const rituals = await db.ritual.findMany({
      where: { memberId, createdAt: { gte: weekAgo } },
      orderBy: { createdAt: "asc" },
    });

    const daysSet = new Set<string>();
    for (const r of rituals) {
      const dayKey = r.createdAt.toISOString().slice(0, 10);
      daysSet.add(dayKey);
    }
    const wardThisWeek = daysSet.size;
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayKey = date.toISOString().slice(0, 10);
      return { day, completed: daysSet.has(dayKey) };
    });

    const member = await db.member.findUnique({ where: { id: memberId } });

    return NextResponse.json({
      wardThisWeek,
      wardTarget: 4,
      streak: member?.streak ?? 0,
      ritualsCompleted: member?.ritualsCompleted ?? 0,
      wardMet: wardThisWeek >= 4,
      weekDays,
      recentRituals: rituals.slice(-5).map((r) => ({
        type: r.type,
        screenKey: r.screenKey,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("[ritual GET] error:", error);
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
    const parsed = RitualSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existing = await db.ritual.findFirst({
      where: { memberId, type: data.type, createdAt: { gte: todayStart } },
    });

    await db.ritual.create({
      data: {
        memberId,
        type: data.type,
        screenKey: data.screenKey ?? null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });

    if (!existing) {
      const member = await db.member.findUnique({ where: { id: memberId } });
      if (member) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const lastRitualAny = await db.ritual.findFirst({
          where: { memberId, createdAt: { gte: yesterday, lt: todayStart } },
        });
        const newStreak = lastRitualAny ? member.streak + 1 : 1;
        await db.member.update({
          where: { id: memberId },
          data: {
            streak: newStreak,
            ritualsCompleted: { increment: 1 },
            wardThisWeek: { increment: 1 },
          },
        });
      }
    }

    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const weekRituals = await db.ritual.findMany({
      where: { memberId, createdAt: { gte: weekAgo } },
    });
    const daysSet = new Set<string>();
    for (const r of weekRituals) {
      daysSet.add(r.createdAt.toISOString().slice(0, 10));
    }

    return NextResponse.json({
      ok: true,
      wardThisWeek: daysSet.size,
      wardTarget: 4,
      wardMet: daysSet.size >= 4,
      streakIncremented: !existing,
    });
  } catch (error) {
    console.error("[ritual POST] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
