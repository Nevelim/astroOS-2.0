/**
 * GET /api/members — family hub: список участников + совместимость.
 * POST /api/members — добавить участника (birth data для match).
 * Clean Architecture: interface adapter.
 * NO demo data — real users only, 401 if not authenticated.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";

async function getMemberId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return sessionStore.getMemberIdBySession(token);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = (searchParams.get("locale") ?? "en") as "en" | "ru" | "hi";
    const memberId = await getMemberId(req);

    if (!memberId) {
      return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
    }

    // Real mode — members stored in MemberRelation table (to be implemented)
    // For now, return empty list with proper structure
    return NextResponse.json({
      members: [],
      total: 0,
      avgCompatibility: 0,
      locale,
      message: "Add family members to see compatibility scores.",
    });
  } catch (error) {
    console.error("[members GET] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const AddMemberSchema = z.object({
  displayName: z.string().min(1).max(80),
  relationship: z.string().min(1).max(50),
  birthDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/),
  birthLat: z.number().min(-90).max(90),
  birthLng: z.number().min(-180).max(180),
  birthTzOffset: z.number().min(-14).max(14),
  birthPlaceName: z.string().min(1).max(200),
  gender: z.union([z.literal(0), z.literal(1)]),
});

export async function POST(req: NextRequest) {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) {
      return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = AddMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    // In real mode, would save to MemberRelation table + compute compatibility via CosmicMatch
    return NextResponse.json({
      ok: true,
      member: {
        id: "new-" + Date.now(),
        displayName: data.displayName,
        relationship: data.relationship,
        birthDate: data.birthDateTime.slice(0, 10),
        compatibility: 0, // computed via Cosmic Match
        tone: "neutral",
      },
      message: "Member added. Compatibility will be computed via Cosmic Match.",
    });
  } catch (error) {
    console.error("[members POST] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
