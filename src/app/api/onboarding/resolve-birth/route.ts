/**
 * POST /api/onboarding/resolve-birth
 *
 * Onboarding step: resolves the user's birth time and persists the canonical
 * birth_data_hash. After this, both engines (Astro + BaZi) can compute charts.
 *
 * Auth: requires authenticated session (memberId from session token).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { birthTimeResolver, memberRepo } from "@/infrastructure/composition-root";
import { ResolveBirthData } from "@/application/use-cases/ResolveBirthData";

const Schema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  localTime: z.string().regex(/^\d{2}:\d{2}$/),
  placeId: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  ianaZone: z.string().optional(),
  timeQuality: z.enum(["exact", "approx", "unknown"]).default("exact"),
});

// Adapter: MemberBirthGateway implementation backed by PrismaMemberRepository.
const gateway = {
  async saveBirthResolution(memberId: string, res: any) {
    await memberRepo.saveBirthResolution(memberId, {
      birthDataHash: res.birthDataHash,
      trueSolarTime: res.trueSolarTime,
      ianaZone: res.ianaZone,
    });
  },
};

const useCase = new ResolveBirthData(birthTimeResolver, gateway);

export async function POST(req: NextRequest) {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 3. Get memberId from session (email → member lookup)
  const member = await memberRepo.findByEmail(session.user.email);
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // 4. Execute the use case
  try {
    const resolution = await useCase.execute({
      memberId: member.identity.id,
      ...parsed.data,
    });
    return NextResponse.json(resolution, { status: 200 });
  } catch (e: any) {
    const status = e.status ?? 502;
    return NextResponse.json(
      { error: e.message ?? "Birth-time resolution failed" },
      { status }
    );
  }
}
