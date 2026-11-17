import { phoneGroup, similarGroup } from '../test/fixtures';
import {
  discountBadge,
  formatPrice,
  groupHeader,
  groupRange,
  originalPrice,
  stockLabel,
} from './product-view';

describe('groupRange', () => {
  const group = (offset: number, shown: number, total: number) => ({
    query: { offset },
    products: Array.from({ length: shown }),
    total,
  });

  it('first page of 16 → "1–4 of 16", 12 more', () => {
    expect(groupRange(group(0, 4, 16))).toEqual({ label: '1–4 of 16', remaining: 12 });
  });

  it('second page → "5–8 of 16", 8 more', () => {
    expect(groupRange(group(4, 4, 16))).toEqual({ label: '5–8 of 16', remaining: 8 });
  });

  it('last partial page → nothing remaining', () => {
    expect(groupRange(group(12, 3, 15))).toEqual({ label: '13–15 of 15', remaining: 0 });
  });

  it('no matches', () => {
    expect(groupRange(group(0, 0, 0))).toEqual({ label: 'no matches', remaining: 0 });
  });

  it('offset past the end (model asked for too much) → no matches here, never negative', () => {
    expect(groupRange(group(20, 0, 16))).toEqual({ label: 'no more matches', remaining: 0 });
  });
});

describe('formatPrice', () => {
  it.each([
    [499, '$499.00'],
    [9.999, '$10.00'],
    [1299.5, '$1,299.50'],
  ])('%d → %s', (n, s) => expect(formatPrice(n)).toBe(s));
});

describe('discountBadge', () => {
  it('shows a rounded badge from 5% up', () => {
    expect(discountBadge(12.6)).toBe('−13%');
    expect(discountBadge(5)).toBe('−5%');
  });

  it('hides small discounts (noise in DummyJSON)', () => {
    expect(discountBadge(4.99)).toBeNull();
    expect(discountBadge(0)).toBeNull();
  });
});

describe('originalPrice', () => {
  it('reverses the discount', () => {
    expect(originalPrice(80, 20)).toBeCloseTo(100);
  });

  it('is the price itself without a discount', () => {
    expect(originalPrice(80, 0)).toBe(80);
  });
});

describe('stockLabel', () => {
  it.each([
    [0, { text: 'Out of stock', tone: 'out' }],
    [3, { text: 'Only 3 left', tone: 'low' }],
    [10, { text: 'Only 10 left', tone: 'low' }],
    [11, { text: 'In stock', tone: 'in' }],
  ])('%i → %o', (stock, label) => expect(stockLabel(stock)).toEqual(label));
});

describe('groupHeader', () => {
  it('a match group: its label, range, remaining and Assumption when guessed', () => {
    expect(groupHeader(phoneGroup)).toEqual({
      title: 'Phones under $500',
      subtitle: '1–1 of 7',
      assumption: null,
      remaining: 6,
      recommended: false,
    });
    const guessed = {
      ...phoneGroup,
      query: { ...phoneGroup.query, confidence: 'guessed' as const, assumption: 'x' },
    };
    expect(groupHeader(guessed).assumption).toBe('x');
  });

  it('a Recommended Group: "You might also like", tied to its intent, never "N more"', () => {
    expect(groupHeader({ ...similarGroup, total: 9 })).toEqual({
      title: 'You might also like',
      subtitle: 'Similar to Phones under $500',
      assumption: null,
      remaining: 0,
      recommended: true,
    });
  });
});
