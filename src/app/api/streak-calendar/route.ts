/**
 * GET /api/streak-calendar — 7-day WARD visualization с reward.
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

const DAY_NAMES = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  hi: ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"],
};

const REWARDS = {
  1: { en: "First spark", ru: "Первая искра", hi: "पहली चिंगारी", tone: "jade" },
  2: { en: "Momentum", ru: "Импульс", hi: "गति", tone: "jade" },
  3: { en: "Rhythm found", ru: "Ритм найден", hi: "ताल मिला", tone: "gold" },
  4: { en: "WARD achieved ⭐", ru: "WARD достигнут ⭐", hi: "WARD प्राप्त ⭐", tone: "gold" },
  5: { en: "Deepening", ru: "Углубление", hi: "गहराई", tone: "gold" },
  6: { en: "Almost golden", ru: "Почти золото", hi: "लगभग सुनहरा", tone: "rose" },
  7: { en: "Golden week ✦", ru: "Золотая неделя ✦", hi: "सुनहरा सप्ताह ✦", tone: "rose" },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = (searchParams.get("locale") ?? "en") as "en" | "ru" | "hi";
    const memberId = await getMemberId(req);

    if (!memberId) {
      return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
    }

    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const rituals = await db.ritual.findMany({
      where: { memberId, createdAt: { gte: weekAgo } },
      orderBy: { createdAt: "asc" },
    });

    const dayMap = new Map<string, boolean>();
    for (const r of rituals) {
      const dayKey = r.createdAt.toISOString().slice(0, 10);
      dayMap.set(dayKey, true);
    }

    const today = new Date();
    const weekDays = [];
    let wardCount = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      const dayKey = date.toISOString().slice(0, 10);
      const completed = dayMap.has(dayKey);
      if (completed) wardCount++;
      weekDays.push({
        day: DAY_NAMES[locale][i],
        date: dayKey,
        completed,
        isToday: i === 6,
        reward: completed ? REWARDS[wardCount as 1 | 2 | 3 | 4 | 5 | 6 | 7] : null,
      });
    }

    const member = await db.member.findUnique({ where: { id: memberId } });

    return NextResponse.json({
      weekDays,
      wardThisWeek: wardCount,
      wardTarget: 4,
      wardMet: wardCount >= 4,
      streak: member?.streak ?? 0,
      bestStreak: Math.max(member?.streak ?? 0, 0),
      totalRituals: member?.ritualsCompleted ?? 0,
      locale,
    });
  } catch (error) {
    console.error("[streak-calendar] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
