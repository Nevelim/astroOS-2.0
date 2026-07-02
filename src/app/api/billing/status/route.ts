/**
 * GET /api/billing/status — текущая подписка пользователя.
 * POST /api/billing/subscribe — подписка (reverse trial / Stripe mock).
 * POST /api/billing/cancel — 1-tap cancel (no dark patterns).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";
import { memberRepo } from "@/infrastructure/composition-root";

async function getMemberId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return sessionStore.getMemberIdBySession(token);
}

const PPP_DISCOUNTS: Record<string, { country: string; pct: number; label: string }> = {
  IN: { country: "India", pct: 75, label: "₹199/mo" },
  BR: { country: "Brazil", pct: 60, label: "R$25/mo" },
  RU: { country: "CIS", pct: 65, label: "₽400/mo" },
  MX: { country: "Mexico", pct: 50, label: "$5/mo" },
  ID: { country: "Indonesia", pct: 65, label: "$4/mo" },
  PH: { country: "Philippines", pct: 60, label: "$5/mo" },
  VN: { country: "Vietnam", pct: 65, label: "$4/mo" },
};

export async function GET(req: NextRequest) {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await memberRepo.findById(memberId);
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const subscription = await db.subscription.findUnique({ where: { memberId } });

    return NextResponse.json({
      tier: member.tier.tier,
      isPremium: member.isPremium(),
      isTrialActive: member.isTrialActive(),
      trialEndsAt: member.tier.trialEndsAt,
      subscriptionRenewsAt: member.tier.subscriptionRenewsAt,
      subscription: subscription ? {
        provider: subscription.provider,
        status: subscription.status,
        tier: subscription.tier,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAt: subscription.cancelAt,
        pppCountry: subscription.pppCountry,
        pppDiscountPct: subscription.pppDiscountPct,
      } : null,
      pricing: {
        monthly: 12.99,
        annual: 99,
        lifetime: 199,
        ppp: PPP_DISCOUNTS,
      },
    });
  } catch (error) {
    console.error("[billing/status] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const SubscribeSchema = z.object({
  tier: z.union([
    z.literal("pro_monthly"), z.literal("pro_annual"), z.literal("lifetime"),
  ]),
  provider: z.union([z.literal("stripe"), z.literal("apple"), z.literal("google")]).default("stripe"),
  pppCountry: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = SubscribeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    const data = parsed.data;

    const ppp = data.pppCountry ? PPP_DISCOUNTS[data.pppCountry] : undefined;

    // Reverse trial: если free → даём 7 дней trial без charge
    const member = await memberRepo.findById(memberId);
    if (member && member.tier.tier === "free") {
      const trialEnds = new Date(Date.now() + 7 * 24 * 3600_000);
      await memberRepo.updateTier(memberId, "trial", { trialEndsAt: trialEnds });
      return NextResponse.json({
        status: "trial_started",
        tier: "trial",
        trialEndsAt: trialEnds,
        message: "7-day reverse trial started. No charge. Auto-downgrade if you don't subscribe.",
      });
    }

    // Реальная подписка
    const amount = data.tier === "pro_monthly" ? 1299 : data.tier === "pro_annual" ? 9900 : 19900;
    const finalAmount = ppp ? Math.round(amount * (1 - ppp.pct / 100)) : amount;

    const subscription = await db.subscription.upsert({
      where: { memberId },
      update: {
        tier: data.tier,
        provider: data.provider,
        status: "active",
        currentPeriodEnd: new Date(Date.now() + (data.tier === "pro_monthly" ? 30 : 365) * 86400_000),
        pppCountry: data.pppCountry ?? null,
        pppDiscountPct: ppp?.pct ?? null,
      },
      create: {
        memberId,
        tier: data.tier,
        provider: data.provider,
        status: "active",
        currentPeriodEnd: new Date(Date.now() + (data.tier === "pro_monthly" ? 30 : 365) * 86400_000),
        pppCountry: data.pppCountry ?? null,
        pppDiscountPct: ppp?.pct ?? null,
      },
    });

    await db.payment.create({
      data: {
        memberId,
        subscriptionId: subscription.id,
        amount: finalAmount,
        currency: "usd",
        provider: data.provider,
        status: "succeeded",
      },
    });

    await memberRepo.updateTier(memberId, data.tier as "pro_monthly" | "pro_annual" | "lifetime", {
      renewsAt: subscription.currentPeriodEnd ?? undefined,
    });

    return NextResponse.json({
      status: "subscribed",
      tier: data.tier,
      amount: finalAmount,
      currency: "usd",
      pppApplied: !!ppp,
      subscription,
    });
  } catch (error) {
    console.error("[billing/subscribe] error:", error);
    return NextResponse.json({ error: "Subscribe failed" }, { status: 500 });
  }
}
