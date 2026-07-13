/**
 * llm-cache — Simple in-memory TTL cache for LLM-backed endpoints.
 *
 * LIMITATION: This cache is in-memory per server process. In a single-instance
 * dev environment that's fine. In a multi-instance / serverless deployment,
 * each instance maintains its own cache and the effective hit rate is lower.
 * To upgrade, swap the underlying Map for Redis (or another shared store)
 * without changing the public surface (getCached / setCached / getOrCompute).
 *
 * Design notes:
 * - Entries are retained in the Map even after they expire, so we can return
 *   them as STALE fallbacks when the upstream LLM call fails (e.g. on 429).
 * - getCached() returns ONLY fresh values (T < expiresAt).
 * - getStale() returns an entry regardless of freshness — internal helper.
 * - getOrCompute() follows the spec: fresh → use cache; else compute; on
 *   compute throw, return stale if any, otherwise re-throw.
 * - getOrComputeWithStatus() is the route-friendly variant that also reports
 *   whether the value came from HIT / MISS / STALE. The "FALLBACK" status is
 *   a route-level concept (hand-written static content) and is never produced
 *   here — the route sets it after catching a thrown compute().
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** Default TTLs — daily content, generous cache windows to spare the LLM quota. */
export const TTL = {
  HOROSCOPE: 6 * 60 * 60 * 1000, // 6 hours (21600000 ms)
  AFFIRMATION: 12 * 60 * 60 * 1000, // 12 hours (43200000 ms)
} as const;

const store = new Map<string, CacheEntry<unknown>>();

/** Returns cached value if the entry exists AND is still fresh; otherwise null. */
export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.value as T;
}

/** Returns the cached value even if expired (used as stale fallback). Internal. */
export function getStale<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  return entry.value as T;
}

/** Sets a value with a TTL (in milliseconds). */
export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Removes an entry — useful for explicit invalidation. */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Wipes the whole cache — useful for tests / debug. */
export function clearCache(): void {
  store.clear();
}

/** Returns cache size (including stale entries). */
export function cacheSize(): number {
  return store.size;
}

export type CacheStatus = "HIT" | "MISS" | "STALE";

export interface CachedResult<T> {
  value: T;
  status: CacheStatus;
}

/**
 * Returns cached value if fresh; otherwise runs compute(), caches the result,
 * and returns it. If compute() throws, returns the stale cached value (if any);
 * if no stale cache exists, re-throws the original error.
 *
 * Note: this variant does not expose whether the value came from cache or
 * compute. Use getOrComputeWithStatus() if the caller needs that signal.
 */
export async function getOrCompute<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const fresh = getCached<T>(key);
  if (fresh !== null) return fresh;
  try {
    const value = await compute();
    setCached(key, value, ttlMs);
    return value;
  } catch (err) {
    const stale = getStale<T>(key);
    if (stale !== null) return stale;
    throw err;
  }
}

/**
 * Route-friendly variant: same semantics as getOrCompute, but also reports
 * whether the returned value was a fresh cache HIT, a freshly computed MISS,
 * or a STALE fallback served because compute() threw.
 *
 * If compute() throws AND no stale cache exists, this re-throws so the route
 * can fall back to its own static content (the "FALLBACK" status the route
 * reports is owned by the route, not by this module).
 */
export async function getOrComputeWithStatus<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<CachedResult<T>> {
  const fresh = getCached<T>(key);
  if (fresh !== null) return { value: fresh, status: "HIT" };
  try {
    const value = await compute();
    setCached(key, value, ttlMs);
    return { value, status: "MISS" };
  } catch (err) {
    const stale = getStale<T>(key);
    if (stale !== null) return { value: stale, status: "STALE" };
    throw err;
  }
}

/**
 * Builds a cache key with sign + locale + date (YYYY-MM-DD) so different
 * signs/locales/days get independent cache entries.
 *
 * Date is locked to UTC for determinism across requests within the same day.
 */
export function buildDailyKey(prefix: string, sign: string, locale: string, dateIso?: string): string {
  const today = dateIso ?? new Date().toISOString().slice(0, 10);
  return `${prefix}:${sign}:${locale}:${today}`;
}
