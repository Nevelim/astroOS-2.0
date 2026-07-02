/**
 * GET /api/spheres — 8 жизненных сфер с прогрессом.
 * NO demo data — real users only, 401 if not authenticated.
 * Scores computed from real ritual history.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";

async function getMemberId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return sessionStore.getMemberIdBySession(token);
}

const SPHERES = [
  { key: "career", icon: "◈", color: "#FBBF24", label: { en: "Career", ru: "Карьера", hi: "करियर" }, planet: "Jupiter" },
  { key: "love", icon: "♥", color: "#F9A8D4", label: { en: "Love", ru: "Любовь", hi: "प्रेम" }, planet: "Venus" },
  { key: "health", icon: "✚", color: "#34D399", label: { en: "Health", ru: "Здоровье", hi: "स्वास्थ्य" }, planet: "Mars" },
  { key: "finance", icon: "◆", color: "#FBBF24", label: { en: "Finance", ru: "Финансы", hi: "वित्त" }, planet: "Jupiter" },
  { key: "spirit", icon: "✦", color: "#C4B5FD", label: { en: "Spirit", ru: "Дух", hi: "आत्मा" }, planet: "Neptune" },
  { key: "create", icon: "❋", color: "#FDA4AF", label: { en: "Create", ru: "Творчество", hi: "रचना" }, planet: "Sun" },
  { key: "travel", icon: "➤", color: "#67E8F9", label: { en: "Travel", ru: "Путешествия", hi: "यात्रा" }, planet: "Mercury" },
  { key: "family", icon: "⌂", color: "#10B981", label: { en: "Family", ru: "Семья", hi: "परिवार" }, planet: "Moon" },
];

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
    });

    const spheres = SPHERES.map((s, i) => {
      const sphereRituals = rituals.filter((r) => r.screenKey === s.key || r.metadata?.includes(s.key));
      const ritualCount = sphereRituals.length;
      // Score based on ritual activity (0 baseline + activity bonus)
      const score = Math.min(100, ritualCount * 20);
      return {
        ...s,
        label: s.label[locale] ?? s.label.en,
        score,
        trend: ritualCount > 2 ? "up" : ritualCount === 0 ? "stable" : "stable",
        ritualsThisWeek: ritualCount,
        topCity: null as string | null,
        planetInfluence: `${s.planet} aspect`,
      };
    });

    const overallScore = spheres.reduce((a, s) => a + s.score, 0) / spheres.length;

    return NextResponse.json({
      spheres,
      overallScore: Math.round(overallScore),
      weeklyTheme: {
        en: "Integration — weaving depth into daily rhythm",
        ru: "Интеграция — вплетение глубины в дневной ритм",
        hi: "एकीकरण — गहराई को दैनिक लय में बुनना",
      },
      locale,
    });
  } catch (error) {
    console.error("[spheres] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
