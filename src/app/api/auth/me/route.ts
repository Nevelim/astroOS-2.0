/**
 * GET /api/auth/me — current member from session (NextAuth or cookie).
 * Поддерживает обе auth системы: NextAuth (Google OAuth) и cookie session (email/password).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sessionStore, SESSION_COOKIE_NAME } from "@/infrastructure/security/SessionManager";
import { memberRepo } from "@/infrastructure/composition-root";

export async function GET(req: NextRequest) {
  try {
    // 1. Try NextAuth session (Google OAuth)
    const nextAuthSession = await getServerSession(authOptions);
    if (nextAuthSession?.user?.id) {
      const member = await memberRepo.findById(nextAuthSession.user.id);
      if (member) {
        return NextResponse.json({
          member: {
            id: member.identity.id,
            email: member.identity.email,
            displayName: member.identity.displayName,
            avatarUrl: member.identity.avatarUrl,
            tier: member.tier.tier,
            trialEndsAt: member.tier.trialEndsAt,
            locale: member.preferences.locale,
            voice: member.preferences.voice,
            streak: member.stats.streak,
            wardThisWeek: member.stats.wardThisWeek,
            isPremium: member.isPremium(),
            authProvider: "google",
            bazi: member.bazi ? { dayMaster: member.bazi.dayMaster, dayMasterElement: member.bazi.dayMasterElement } : null,
            birth: {
              isoDateTime: member.birth.isoDateTime,
              placeName: member.birth.placeName,
              lat: member.birth.coord.lat,
              lng: member.birth.coord.lng,
              tzOffset: member.birth.timezoneOffsetHours,
              gender: member.birth.gender,
            },
          },
        });
      }
    }

    // 2. Try cookie session (email/password)
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const memberId = await sessionStore.getMemberIdBySession(token);
      if (memberId) {
        const member = await memberRepo.findById(memberId);
        if (member) {
          return NextResponse.json({
            member: {
              id: member.identity.id,
              email: member.identity.email,
              displayName: member.identity.displayName,
              avatarUrl: member.identity.avatarUrl,
              tier: member.tier.tier,
              trialEndsAt: member.tier.trialEndsAt,
              locale: member.preferences.locale,
              voice: member.preferences.voice,
              streak: member.stats.streak,
              wardThisWeek: member.stats.wardThisWeek,
              isPremium: member.isPremium(),
              authProvider: "credentials",
              bazi: member.bazi ? { dayMaster: member.bazi.dayMaster, dayMasterElement: member.bazi.dayMasterElement } : null,
              birth: {
                isoDateTime: member.birth.isoDateTime,
                placeName: member.birth.placeName,
                lat: member.birth.coord.lat,
                lng: member.birth.coord.lng,
                tzOffset: member.birth.timezoneOffsetHours,
                gender: member.birth.gender,
              },
            },
          });
        }
      }
    }

    return NextResponse.json({ member: null });
  } catch (error) {
    console.error("[auth/me] error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
