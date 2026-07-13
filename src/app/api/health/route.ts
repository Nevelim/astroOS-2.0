/**
 * GET /api/health — health check + cache metrics + DB ping.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCacheStats } from "@/infrastructure/composition-root";
import { sessionStore } from "@/infrastructure/security/SessionManager";
import { getRateLimitStats } from "@/infrastructure/security/RateLimiter";

export async function GET() {
  try {
    const start = Date.now();
    const memberCount = await db.member.count().catch(() => -1);
    const cityCount = await db.city.count().catch(() => -1);
    const dbLatency = Date.now() - start;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: {
        memberCount,
        cityCount,
        latencyMs: dbLatency,
      },
      cache: getCacheStats(),
      sessions: sessionStore.size,
      rateLimit: getRateLimitStats(),
      memory: process.memoryUsage(),
    });
  } catch (error) {
    console.error("[health] error:", error);
    return NextResponse.json({ status: "error", message: (error as Error).message }, { status: 500 });
  }
}
