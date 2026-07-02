/**
 * GET /api/ab-test?name=city-weights — получить variant для A/B теста.
 * POST /api/ab-test — создать новый A/B тест (admin).
 * Clean Architecture: interface adapter, делегирует use case.
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
    const { searchParams } = new URL(req.url);
    const testName = searchParams.get("name");
    if (!testName) {
      const tests = await db.aBTest.findMany({ where: { active: true } });
      return NextResponse.json({ tests });
    }

    const test = await db.aBTest.findUnique({ where: { name: testName } });
    if (!test || !test.active) {
      return NextResponse.json({ error: "Test not found or inactive" }, { status: 404 });
    }

    const variants = JSON.parse(test.variants) as string[];
    const memberId = await getMemberId(req);
    const anonymousId = memberId ?? PasswordHasher.generateToken(4);

    // Deterministic assignment: hash(memberId + testName) % variants.length
    let assignment = await db.aBAssignment.findUnique({
      where: { testId_memberId: { testId: test.id, memberId: anonymousId } },
    });

    if (!assignment) {
      const buf = new Uint8Array(4);
      crypto.getRandomValues(buf);
      const hashNum = (buf[0] << 24 | buf[1] << 16 | buf[2] << 8 | buf[3]) >>> 0;
      const variant = variants[hashNum % variants.length];
      try {
        assignment = await db.aBAssignment.create({
          data: { testId: test.id, memberId: anonymousId, variant },
        });
      } catch {
        // Race condition — re-fetch
        assignment = await db.aBAssignment.findUnique({
          where: { testId_memberId: { testId: test.id, memberId: anonymousId } },
        });
      }
    }

    return NextResponse.json({
      test: { name: test.name, description: test.description },
      variant: assignment?.variant ?? variants[0],
      variants,
    });
  } catch (error) {
    console.error("[ab-test GET] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, variants } = body as {
      name: string;
      description?: string;
      variants: string[];
    };

    if (!name || !variants || variants.length < 2) {
      return NextResponse.json({ error: "name and >=2 variants required" }, { status: 400 });
    }

    const test = await db.aBTest.create({
      data: {
        name,
        description: description ?? "",
        variants: JSON.stringify(variants),
        active: true,
      },
    });

    return NextResponse.json({ test });
  } catch (error) {
    console.error("[ab-test POST] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
