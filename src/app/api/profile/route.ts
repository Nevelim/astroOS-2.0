/**
 * GET /api/profile — агрегированный профиль пользователя.
 * Member stats + partner-link + power-cards + notifications summary + WARD.
 * NO demo data — real users only, 401 if not authenticated.
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

    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Partner link
    let partnerLink = await db.partnerLink.findUnique({ where: { memberId } });
    if (!partnerLink) {
      const code = PasswordHasher.generateToken(6).toUpperCase();
      partnerLink = await db.partnerLink.create({ data: { memberId, code } });
    }

    // Power cards
    const powerCards = await db.powerCard.findMany({ where: { memberId }, orderBy: { createdAt: "desc" }, take: 5 });

    // Notifications
    const notifications = await db.notification.findMany({ where: { memberId }, orderBy: { createdAt: "desc" }, take: 10 });
    const unread = notifications.filter((n) => !n.readAt).length;

    // WARD this week
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const weekRituals = await db.ritual.findMany({ where: { memberId, createdAt: { gte: weekAgo } } });
    const daysSet = new Set<string>();
    for (const r of weekRituals) daysSet.add(r.createdAt.toISOString().slice(0, 10));

    // Subscription
    const subscription = await db.subscription.findUnique({ where: { memberId } });

    return NextResponse.json({
      profile: {
        displayName: member.displayName,
        email: member.email,
        tier: member.tier,
        isPremium: ["pro_monthly", "pro_annual", "lifetime", "b2b"].includes(member.tier),
        trialEndsAt: member.trialEndsAt,
        subscriptionRenewsAt: member.subscriptionRenewsAt,
        stats: {
          streak: member.streak,
          wardThisWeek: daysSet.size,
          wardTarget: 4,
          wardMet: daysSet.size >= 4,
          ritualsCompleted: member.ritualsCompleted,
          citiesExplored: member.citiesExplored,
          mentorMessages: member.mentorMessages,
        },
        partnerLink: {
          code: partnerLink.code,
          url: `${new URL(req.url).origin}/?ref=${partnerLink.code}`,
          clicks: partnerLink.clicks,
          signups: partnerLink.signups,
          viralK: partnerLink.signups > 0 ? Math.round((partnerLink.signups / Math.max(partnerLink.clicks, 1)) * 100) / 100 : 0,
        },
        powerCards: powerCards.map((c) => ({
          id: c.id,
          cardType: c.cardType,
          title: c.title,
          description: c.description,
          sharedCount: c.sharedCount,
          createdAt: c.createdAt,
        })),
        notifications: { unread, total: notifications.length },
        subscription: subscription ? {
          provider: subscription.provider,
          status: subscription.status,
          tier: subscription.tier,
          currentPeriodEnd: subscription.currentPeriodEnd,
        } : null,
        birth: {
          isoDateTime: member.birthDateTime,
          placeName: member.birthPlaceName,
          lat: member.birthLat,
          lng: member.birthLng,
        },
        bazi: member.baziStem ? { dayMaster: member.baziStem, dayMasterElement: member.baziElement } : null,
        preferences: {
          locale: member.locale,
          voice: member.voice,
          twoAmEnabled: member.twoAmEnabled,
        },
      },
    });
  } catch (error) {
    console.error("[profile GET] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * PATCH /api/profile — update member profile (birth data, name, voice, onboarding).
 */
export async function PATCH(req: NextRequest) {
  try {
    const memberId = await getMemberId(req);
    if (!memberId) {
      return NextResponse.json({ error: "Unauthorized", code: "NO_SESSION" }, { status: 401 });
    }

    const body = await req.json();
    const {
      displayName,
      birthDateTime,
      birthLat,
      birthLng,
      birthTzOffset,
      birthPlaceName,
      gender,
      voice,
      locale,
      onboardingDone,
    } = body as {
      displayName?: string;
      birthDateTime?: string;
      birthLat?: number;
      birthLng?: number;
      birthTzOffset?: number;
      birthPlaceName?: string;
      gender?: number;
      voice?: string;
      locale?: string;
      onboardingDone?: boolean;
    };

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (displayName) updateData.displayName = displayName;
    if (birthDateTime) updateData.birthDateTime = birthDateTime;
    if (typeof birthLat === "number") updateData.birthLat = birthLat;
    if (typeof birthLng === "number") updateData.birthLng = birthLng;
    if (typeof birthTzOffset === "number") updateData.birthTzOffset = birthTzOffset;
    if (birthPlaceName) updateData.birthPlaceName = birthPlaceName;
    if (typeof gender === "number") updateData.gender = gender;
    if (voice) updateData.voice = voice;
    if (locale) updateData.locale = locale;
    if (typeof onboardingDone === "boolean") updateData.onboardingDone = onboardingDone;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const member = await db.member.update({
      where: { id: memberId },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      member: {
        id: member.id,
        displayName: member.displayName,
        birthDateTime: member.birthDateTime,
        birthPlaceName: member.birthPlaceName,
        birthLat: member.birthLat,
        birthLng: member.birthLng,
        birthTzOffset: member.birthTzOffset,
        gender: member.gender,
        voice: member.voice,
        locale: member.locale,
        onboardingDone: member.onboardingDone,
      },
    });
  } catch (error) {
    console.error("[profile PATCH] error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
