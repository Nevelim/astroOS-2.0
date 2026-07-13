/**
 * POST /api/auth/register
 * Регистрация: email + password → Member + session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PasswordHasher } from "@/infrastructure/security/PasswordHasher";
import { sessionStore, SESSION_COOKIE_NAME, SESSION_TTL_HOURS } from "@/infrastructure/security/SessionManager";
import { db } from "@/lib/db";
import { memberRepo, calculateBaZiUseCase } from "@/infrastructure/composition-root";
import { BirthData } from "@/domain/value-objects/BirthData";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(80),
  birthDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  birthLat: z.number().min(-90).max(90),
  birthLng: z.number().min(-180).max(180),
  birthTzOffset: z.number().min(-14).max(14),
  birthPlaceName: z.string().min(1).max(200),
  gender: z.union([z.literal(0), z.literal(1)]),
  locale: z.union([z.literal("ru"), z.literal("en"), z.literal("hi")]).default("en"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const existing = await db.member.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await PasswordHasher.hash(data.password);
    const member = await db.member.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        displayName: data.displayName,
        birthDateTime: data.birthDateTime,
        birthLat: data.birthLat,
        birthLng: data.birthLng,
        birthTzOffset: data.birthTzOffset,
        birthPlaceName: data.birthPlaceName,
        gender: data.gender,
        locale: data.locale,
        tier: "trial",
        trialEndsAt: new Date(Date.now() + 7 * 24 * 3600_000),
        lastLoginAt: new Date(),
      },
    });

    // Async BaZi (не блокируем ответ)
    const birth = BirthData.create({
      dateTimeLocal: data.birthDateTime,
      lat: data.birthLat,
      lng: data.birthLng,
      timezoneOffsetHours: data.birthTzOffset,
      gender: data.gender,
      placeName: data.birthPlaceName,
    });
    calculateBaZiUseCase.execute(birth)
      .then((result) => memberRepo.updateBaZi(member.id, result.bazi).catch(() => void 0))
      .catch(() => void 0);

    const token = await sessionStore.createSession(member.id, SESSION_TTL_HOURS);
    const response = NextResponse.json({
      member: { id: member.id, email: member.email, displayName: member.displayName, tier: member.tier, trialEndsAt: member.trialEndsAt },
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
    console.error("[auth/register] error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
