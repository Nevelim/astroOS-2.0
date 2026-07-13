/**
 * GET/POST /api/b2b — B2B HR module (GDPR Art.9 consent-first).
 * Orgs, seats, consent management, audit logs.
 * Clean Architecture: interface adapter.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
      return NextResponse.json({
        orgs: [],
        message: "B2B HR module — GDPR Art.9 consent-first. Explicit consent required before any processing.",
      });
    }

    const seats = await db.b2BSeat.findMany({
      where: { memberId },
      include: { org: true },
    });

    return NextResponse.json({
      seats: seats.map((s) => ({
        id: s.id,
        orgId: s.orgId,
        orgName: s.org.name,
        role: s.role,
        consentGiven: s.consentGiven,
        consentAt: s.consentAt,
      })),
    });
  } catch (error) {
    console.error("[b2b GET] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const CreateOrgSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().optional(),
  seats: z.number().min(1).max(10000).default(10),
});

export async function POST(req: NextRequest) {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = CreateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const org = await db.b2BOrg.create({
      data: {
        name: data.name,
        domain: data.domain ?? null,
        seats: data.seats,
        dpaSigned: false, // DPA must be signed separately
      },
    });

    // Creator becomes admin seat (consent required separately)
    await db.b2BSeat.create({
      data: {
        orgId: org.id,
        memberId,
        role: "admin",
        consentGiven: false,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        actorId: memberId,
        action: "b2b.org.created",
        entityType: "B2BOrg",
        entityId: org.id,
        metadata: JSON.stringify({ name: org.name, seats: org.seats }),
      },
    });

    return NextResponse.json({
      org,
      message: "Org created. DPA signing required before processing employee data. GDPR Art.9 explicit consent needed for each seat.",
    });
  } catch (error) {
    console.error("[b2b POST] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
