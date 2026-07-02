/**
 * POST /api/auth/logout — destroy session + clear cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) await sessionStore.destroySession(token);
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch {
    return NextResponse.json({ ok: true });
  }
}
