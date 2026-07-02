/**
 * RateLimiter — in-memory rate limiting для защиты под нагрузкой 500k.
 * Sliding window algorithm, per-IP + per-user.
 * Clean Architecture: Infrastructure layer (cross-cutting concern).
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked: boolean;
  blockedUntil: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000, // 1 минута
  maxRequests: 60,
  blockDurationMs: 5 * 60_000, // 5 минут block
};

const ENDPOINT_CONFIGS: Record<string, RateLimitConfig> = {
  "/api/auth/login": { windowMs: 15 * 60_000, maxRequests: 10, blockDurationMs: 30 * 60_000 },
  "/api/auth/register": { windowMs: 60 * 60_000, maxRequests: 5, blockDurationMs: 60 * 60_000 },
  "/api/ai/chat": { windowMs: 60_000, maxRequests: 10, blockDurationMs: 5 * 60_000 },
  "/api/calculate": { windowMs: 60_000, maxRequests: 30, blockDurationMs: 60_000 },
  "/api/bazi/calculate": { windowMs: 60_000, maxRequests: 20, blockDurationMs: 60_000 },
  "/api/iching": { windowMs: 60_000, maxRequests: 20, blockDurationMs: 60_000 },
};

const store = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 100_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export function rateLimit(key: string, endpoint: string): RateLimitResult {
  const config = ENDPOINT_CONFIGS[endpoint] ?? DEFAULT_CONFIG;
  const compositeKey = `${endpoint}:${key}`;
  const now = Date.now();

  // Eviction при превышении размера store (memory leak protection)
  if (store.size > MAX_STORE_SIZE) {
    evictExpired(now);
  }

  let entry = store.get(compositeKey);

  // Если заблокирован — проверяем block duration
  if (entry?.blocked && now < entry.blockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Сброс если окно истекло
  if (!entry || now - entry.windowStart > config.windowMs) {
    entry = { count: 0, windowStart: now, blocked: false, blockedUntil: 0 };
  }

  entry.count++;

  // Блокировка при превышении
  if (entry.count > config.maxRequests) {
    entry.blocked = true;
    entry.blockedUntil = now + config.blockDurationMs;
    store.set(compositeKey, entry);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      retryAfter: Math.ceil(config.blockDurationMs / 1000),
    };
  }

  store.set(compositeKey, entry);
  return {
    allowed: true,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.windowStart + config.windowMs,
  };
}

function evictExpired(now: number): void {
  for (const [key, entry] of store) {
    const config = ENDPOINT_CONFIGS[key.split(":")[0]] ?? DEFAULT_CONFIG;
    if (now - entry.windowStart > config.windowMs * 2 && !entry.blocked) {
      store.delete(key);
    }
    if (entry.blocked && now > entry.blockedUntil) {
      store.delete(key);
    }
  }
}

export function getRateLimitStats() {
  let blocked = 0;
  let active = 0;
  for (const entry of store.values()) {
    if (entry.blocked) blocked++;
    else active++;
  }
  return { totalEntries: store.size, blocked, active, maxSize: MAX_STORE_SIZE };
}

/** Extract client IP из request (учитывая proxy/gateway). */
export function getClientIp(req: Request): string {
  const headers = new Headers(req.headers);
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
