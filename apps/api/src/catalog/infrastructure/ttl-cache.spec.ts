import { describe, expect, it } from 'vitest';
import { TtlCache } from './ttl-cache.js';

describe('TtlCache', () => {
  it('serves a value until it expires', () => {
    let now = 0;
    const cache = new TtlCache<number>(100, 10, () => now);
    cache.set('a', 1);
    now = 99;
    expect(cache.get('a')).toBe(1);
    now = 100;
    expect(cache.get('a')).toBeUndefined();
  });

  it('drops the oldest entry past maxEntries', () => {
    const cache = new TtlCache<number>(100, 2, () => 0);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('a', 3); // refreshed: now the newest
    cache.set('c', 4);
    expect([cache.get('a'), cache.get('b'), cache.get('c')]).toEqual([3, undefined, 4]);
  });
});
