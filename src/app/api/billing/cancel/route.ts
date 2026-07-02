/**
 * POST /api/billing/cancel — 1-tap cancel (no dark patterns, no retention calls).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";
import { memberRepo } from "@/infrastructure/composition-root";

async function getMemberId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return sessionStore.getMemberIdBySession(token);
}

export async function POST(req: NextRequest) {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await db.subscription.updateMany({
      where: { memberId, status: "active" },
      data: { status: "canceled", cancelAt: new Date() },
    });

    // Даём доступ до конца оплаченного периода (no immediate revoke)
    return NextResponse.json({
      status: "canceled",
      message: "Subscription canceled. You keep access until the end of your billing period. No retention calls, no guilt.",
    });
  } catch (error) {
    console.error("[billing/cancel] error:", error);
    return NextResponse.json({ error: "Cancel failed" }, { status: 500 });
  }
}
