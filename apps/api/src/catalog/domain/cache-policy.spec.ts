import { describe, expect, it } from 'vitest';
import { cacheStatus } from './cache-policy.js';

describe('cacheStatus', () => {
  it('is empty with no entry', () => expect(cacheStatus(null, 0, 1000)).toBe('empty'));
  it('is fresh before the TTL', () =>
    expect(cacheStatus({ value: 1, loadedAt: 0 }, 999, 1000)).toBe('fresh'));
  it('is stale at and after the TTL', () =>
    expect(cacheStatus({ value: 1, loadedAt: 0 }, 1000, 1000)).toBe('stale'));
});
