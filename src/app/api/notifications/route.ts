/**
 * GET /api/notifications — список уведомлений пользователя (5 видов).
 * POST /api/notifications/read — отметить прочитанным.
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

    const notifications = await db.notification.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const unreadCount = notifications.filter((n) => !n.readAt).length;

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data ? JSON.parse(n.data) : null,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("[notifications GET] error:", error);
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
    const { notificationId } = body as { notificationId: string };

    await db.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notifications POST] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
