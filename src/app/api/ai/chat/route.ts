/**
 * POST /api/ai/chat — AI Mentor (ZAI SDK + RAG + persistent memory).
 * 4 голоса, 2 a.m. Companion, cited transits.
 * Free tier: 3 messages/day. Pro: unlimited.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mentorChatUseCase, memberRepo } from "@/infrastructure/composition-root";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";
import { QuotaExceededError } from "@/application/use-cases/MentorChat";

const ChatSchema = z.object({
  message: z.string().min(1).max(4000),
  voice: z.union([
    z.literal("calm"), z.literal("witty"), z.literal("professional"), z.literal("trauma"),
  ]).default("calm"),
  twoAmCompanion: z.boolean().default(false),
  context: z.object({
    cityId: z.string().optional(),
    screenKey: z.string().optional(),
  }).optional(),
});

async function getMemberIdFromReq(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return sessionStore.getMemberIdBySession(token);
}

export async function POST(req: NextRequest) {
  try {
    const memberId = await getMemberIdFromReq(req);
    if (!memberId) {
      return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const member = await memberRepo.findById(memberId);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const response = await mentorChatUseCase.execute({
      memberId,
      message: data.message,
      voice: data.voice,
      twoAmCompanion: data.twoAmCompanion,
      locale: member.preferences.locale,
      context: data.context,
    });

    return NextResponse.json({
      message: response.message,
      tokensUsed: response.tokensUsed,
      cached: response.cached,
      quota: {
        used: member.tier.dailyMessagesUsed + 1,
        total: member.tier.dailyMessageQuota,
        remaining: Math.max(0, member.tier.dailyMessageQuota - member.tier.dailyMessagesUsed - 1),
      },
    });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json({
        error: "Daily quota exceeded",
        code: "QUOTA_EXCEEDED",
        quota: error.quota,
        upgradeUrl: "/api/billing/subscribe",
      }, { status: 429 });
    }
    console.error("[ai/chat] error:", error);
    return NextResponse.json({ error: "Mentor chat failed", message: (error as Error).message }, { status: 500 });
  }
}
