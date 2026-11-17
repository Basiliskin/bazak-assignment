import { describe, expect, it } from 'vitest';
import { group } from '../../../test/support/message.fixture.js';
import {
  RECOMMENDED_PREFIX,
  shouldRecommend,
  toProductGroup,
  toRecommendedGroup,
} from './to-product-group.js';

describe('toProductGroup', () => {
  it('labels the search result with the query that produced it', () => {
    const g = group();
    expect(toProductGroup(g.query, { products: g.products, total: 7 })).toEqual({
      kind: 'match',
      label: 'Phones under $500',
      query: g.query,
      products: g.products,
      total: 7,
    });
  });
});

describe('toRecommendedGroup (ADR 0004)', () => {
  it('builds a Recommended Group named after its Search Intent', () => {
    const g = group();
    expect(toRecommendedGroup(g.query, g.products)).toEqual({
      kind: 'recommended',
      label: `${RECOMMENDED_PREFIX} · Phones under $500`,
      query: g.query,
      products: g.products,
      total: g.products.length,
    });
  });

  it('is null when nothing was similar enough (R10: no empty "You might also like")', () => {
    expect(toRecommendedGroup(group().query, [])).toBeNull();
  });
});

describe('shouldRecommend', () => {
  const q = group().query;
  it('recommends on a first page', () => expect(shouldRecommend(q)).toBe(true));
  it('not on "Show more" pages', () => expect(shouldRecommend({ ...q, offset: 4 })).toBe(false));
  it('not without a semanticQuery', () => expect(shouldRecommend({ ...q, semanticQuery: ' ' })).toBe(false));
});
