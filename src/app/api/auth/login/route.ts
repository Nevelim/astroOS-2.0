/**
 * POST /api/auth/login — email+password → session.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PasswordHasher } from "@/infrastructure/security/PasswordHasher";
import { sessionStore, SESSION_COOKIE_NAME, SESSION_TTL_HOURS } from "@/infrastructure/security/SessionManager";
import { db } from "@/lib/db";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const { email, password } = parsed.data;

    const member = await db.member.findUnique({ where: { email: email.toLowerCase() } });
    if (!member || !member.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const valid = await PasswordHasher.verify(password, member.passwordHash);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    await db.member.update({ where: { id: member.id }, data: { lastLoginAt: new Date() } });
    const token = await sessionStore.createSession(member.id, SESSION_TTL_HOURS);
    const response = NextResponse.json({
      member: { id: member.id, email: member.email, displayName: member.displayName, tier: member.tier },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL_HOURS * 3600,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("[auth/login] error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
