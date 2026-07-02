/**
 * NextAuth configuration with Google OAuth provider.
 * Clean Architecture: Infrastructure layer (auth adapter).
 * JWT strategy — no extra DB tables needed, integrates with existing Member model.
 */
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { PasswordHasher } from "@/infrastructure/security/PasswordHasher";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    // Credentials provider for email/password (existing users)
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const member = await db.member.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!member || !member.passwordHash) return null;

        const valid = await PasswordHasher.verify(credentials.password, member.passwordHash);
        if (!valid) return null;

        return {
          id: member.id,
          email: member.email,
          name: member.displayName,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.memberId = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      // Google OAuth — create/link member on first login
      if (account?.provider === "google" && user?.email) {
        let member = await db.member.findUnique({
          where: { email: user.email.toLowerCase() },
        });
        if (!member) {
          // Create new member from Google profile
          // Default birth data — user will complete in onboarding
          member = await db.member.create({
            data: {
              email: user.email.toLowerCase(),
              displayName: user.name ?? "Cosmic User",
              avatarUrl: user.image ?? null,
              passwordHash: null, // OAuth users don't have password
              birthDateTime: "2000-01-01T12:00", // placeholder — onboarding required
              birthLat: 0,
              birthLng: 0,
              birthTzOffset: 0,
              birthPlaceName: "Unknown — complete profile",
              gender: 0,
              tier: "trial",
              trialEndsAt: new Date(Date.now() + 7 * 24 * 3600_000),
              lastLoginAt: new Date(),
            },
          });
        } else {
          await db.member.update({
            where: { id: member.id },
            data: { lastLoginAt: new Date() },
          });
        }
        token.memberId = member.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.memberId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET ?? "astroos-dev-secret-change-in-production",
};

export default authOptions;
