import { describe, expect, it } from 'vitest';
import { group } from '../../../test/support/message.fixture.js';
import { toProductGroup } from './to-product-group.js';

describe('toProductGroup', () => {
  it('labels the search result with the query that produced it', () => {
    const g = group();
    expect(toProductGroup(g.query, { products: g.products, total: 7 })).toEqual({
      label: 'Phones under $500',
      query: g.query,
      products: g.products,
      total: 7,
    });
  });
});
