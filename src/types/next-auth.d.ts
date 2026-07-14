/**
 * NextAuth type augmentation — adds `id` to the Session user and `memberId`
 * to the JWT token so the session callback and downstream consumers are typed.
 * See src/lib/auth.ts `session`/`jwt` callbacks.
 */
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    memberId?: string;
  }
}
