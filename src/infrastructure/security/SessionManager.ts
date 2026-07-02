/**
 * SessionManager — httpOnly cookie сессии (anti-CSRF, 30d TTL).
 * Clean Architecture: реализует порт SessionStore.
 */
import { PasswordHasher } from "../security/PasswordHasher";
import type { SessionStore } from "../../application/ports/MemberRepository";

interface SessionEntry {
  memberId: string;
  token: string;
  expiresAt: number;
  createdAt: number;
}

const SESSION_TTL_HOURS = 24 * 30; // 30 дней
const SESSION_COOKIE_NAME = "astroos_session";

export class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, SessionEntry>();

  async createSession(memberId: string, ttlHours = SESSION_TTL_HOURS): Promise<string> {
    const token = PasswordHasher.generateToken(32);
    const entry: SessionEntry = {
      memberId,
      token,
      expiresAt: Date.now() + ttlHours * 3600_000,
      createdAt: Date.now(),
    };
    this.sessions.set(token, entry);
    return token;
  }

  async getMemberIdBySession(token: string): Promise<string | null> {
    const entry = this.sessions.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    return entry.memberId;
  }

  async destroySession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  /** Очистка истёкших сессий (запускать по cron). */
  cleanupExpired(): number {
    const now = Date.now();
    let removed = 0;
    for (const [token, entry] of this.sessions) {
      if (now > entry.expiresAt) {
        this.sessions.delete(token);
        removed++;
      }
    }
    return removed;
  }

  get size(): number {
    return this.sessions.size;
  }
}

export const sessionStore = new InMemorySessionStore();
export { SESSION_COOKIE_NAME, SESSION_TTL_HOURS };
