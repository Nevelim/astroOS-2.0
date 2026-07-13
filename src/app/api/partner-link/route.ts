/**
 * GET /api/partner-link — получить/создать partner link (viral loop).
 * POST /api/partner-link/click — зарегистрировать клик.
 * Viral loops НИКОГДА не гейтируются — всегда free.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";
import { PasswordHasher } from "@/infrastructure/security/PasswordHasher";

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

    let link = await db.partnerLink.findUnique({ where: { memberId } });
    if (!link) {
      const code = PasswordHasher.generateToken(6).toUpperCase();
      link = await db.partnerLink.create({
        data: {
          memberId,
          code,
        },
      });
    }

    return NextResponse.json({
      partnerLink: {
        code: link.code,
        url: `${req.nextUrl.origin}/?ref=${link.code}`,
        clicks: link.clicks,
        signups: link.signups,
        viralK: link.signups > 0 ? Math.round((link.signups / Math.max(link.clicks, 1)) * 100) / 100 : 0,
      },
      message: "Partner links are ALWAYS free — reciprocity over restriction.",
    });
  } catch (error) {
    console.error("[partner-link GET] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, action } = body as { code: string; action: "click" | "signup" };

    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const link = await db.partnerLink.findUnique({ where: { code } });
    if (!link) return NextResponse.json({ error: "Invalid code" }, { status: 404 });

    if (action === "click") {
      await db.partnerLink.update({
        where: { id: link.id },
        data: { clicks: { increment: 1 } },
      });
    } else if (action === "signup") {
      await db.partnerLink.update({
        where: { id: link.id },
        data: { signups: { increment: 1 } },
      });
    }

    return NextResponse.json({ ok: true, action });
  } catch (error) {
    console.error("[partner-link POST] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
