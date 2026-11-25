import { cacheStatus, type CacheEntry } from '../domain/cache-policy.js';

/** A small key → value cache: entries expire after `ttlMs`; past `maxEntries` the oldest is dropped. */
export class TtlCache<V> {
  private readonly entries = new Map<string, CacheEntry<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key) ?? null;
    if (cacheStatus(entry, this.now(), this.ttlMs) === 'fresh') return entry!.value;
    this.entries.delete(key);
    return undefined;
  }

  set(key: string, value: V): void {
    this.entries.delete(key); // re-insert at the end: Map order = age order
    this.entries.set(key, { value, loadedAt: this.now() });
    if (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
  }
}
