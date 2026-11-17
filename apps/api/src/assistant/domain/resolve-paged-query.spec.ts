import type { SearchProductsInput } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { group, message } from '../../../test/support/message.fixture.js';
import { resolvePagedQuery } from './resolve-paged-query.js';

const page1: SearchProductsInput = { ...group().query, sortBy: 'price-asc', maxPrice: 500 };
const history = [
  message({ id: 'u', text: 'a phone under $500' }),
  message({ id: 'a', role: 'assistant', text: 'Phones.', productGroups: [group({ query: page1 })] }),
];

describe('resolvePagedQuery', () => {
  it('"Show more" reuses the shown group\'s search, changing only the offset (found live: model switched sortBy)', () => {
    const fromModel: SearchProductsInput = { ...page1, sortBy: 'relevance', maxPrice: null, offset: 4 };
    expect(resolvePagedQuery(fromModel, history)).toEqual({ ...page1, offset: 4 });
  });

  it('matches the label ignoring case and spaces', () => {
    const fromModel = { ...page1, label: '  phones UNDER $500 ', sortBy: 'relevance' as const, offset: 4 };
    expect(resolvePagedQuery(fromModel, history)).toEqual({ ...page1, offset: 4 });
  });

  it('uses the latest group with that label (page 3 continues from page 2)', () => {
    const page2 = { ...page1, offset: 4 };
    const later = [
      ...history,
      message({ id: 'a2', role: 'assistant', text: 'More.', productGroups: [group({ query: page2 })] }),
    ];
    expect(resolvePagedQuery({ ...page1, sortBy: 'rating-desc', offset: 8 }, later)).toEqual({
      ...page1,
      offset: 8,
    });
  });

  it('leaves a first-page search alone, even with a known label (a fresh search may change filters)', () => {
    const fresh = { ...page1, maxPrice: 300, offset: 0 };
    expect(resolvePagedQuery(fresh, history)).toBe(fresh);
  });

  it('leaves a paged search with an unknown label alone', () => {
    const other = { ...page1, label: 'Cheap laptops', category: 'laptops' as const, offset: 4 };
    expect(resolvePagedQuery(other, history)).toBe(other);
  });
});
