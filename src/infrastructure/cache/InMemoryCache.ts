/**
 * InMemoryCache — LRU + TTL кэш для доменных объектов.
 * Production-ready: eviction по TTL, max size, hit/miss метрики.
 * Clean Architecture: реализует доменные порты ChartCache / BaZiCache.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccess: number;
}

export class InMemoryCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 10_000) {
    this.maxSize = maxSize;
  }

  async get(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    entry.lastAccess = Date.now();
    this.hits++;
    // LRU: перемещаем в конец (Map сохраняет порядок вставки)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  async set(key: string, value: T, ttlSeconds = 600): Promise<void> {
    // Eviction при превышении maxSize
    if (this.store.size >= this.maxSize) {
      this.evictOldest();
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      lastAccess: Date.now(),
    });
  }

  async invalidate(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.store.size;
  }

  get stats() {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  private evictOldest(): void {
    // Удаляем самую старую по lastAccess
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }
    if (oldestKey) this.store.delete(oldestKey);
  }
}

// Singleton-инстансы для разных типов кэшей
export const chartCache = new InMemoryCache(2000);
export const baziCache = new InMemoryCache(5000);
export const cityIndexCache = new InMemoryCache(10_000);
export const transitCache = new InMemoryCache(1000);
