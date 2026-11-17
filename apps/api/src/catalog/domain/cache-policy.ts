export interface CacheEntry<T> {
  readonly value: T;
  readonly loadedAt: number;
}

export type CacheStatus = 'empty' | 'fresh' | 'stale';

/** Pure: is a cached value usable at time `now`? */
export function cacheStatus<T>(entry: CacheEntry<T> | null, now: number, ttlMs: number): CacheStatus {
  if (!entry) return 'empty';
  return now - entry.loadedAt < ttlMs ? 'fresh' : 'stale';
}
