import type { Expectations } from './checks.js';

export interface EvalCase {
  id: string;
  /** Shopper messages sent in order in one Conversation; the checks run on the last reply. */
  turns: readonly string[];
  expect: Expectations;
}

/**
 * AC7.2: plain, price-limited, ambiguous, off-catalog, multi-intent, follow-up; AC3.10: beach (S8).
 * R1 (real Products), R7 (≤ 4 cards), R9 (no out-of-stock Product) and R10 (Recommended Group) are checked on every case.
 */
export const EVAL_CASES: readonly EvalCase[] = [
  { id: 'plain', turns: ['show me smartphones'], expect: { intents: ['smartphones'] } },
  {
    id: 'price',
    turns: ['a phone under $500'],
    expect: { intents: ['smartphones'], priceLimits: [{ category: 'smartphones', max: 500 }] },
  },
  { id: 'ambiguous', turns: ['something cheap and cool'], expect: { assumption: true } },
  { id: 'off-catalog', turns: ['a flight to Tokyo'], expect: { offCatalog: true } },
  {
    id: 'multi-intent',
    turns: ['a phone under $500 and a lipstick'],
    expect: { intents: ['smartphones', 'beauty'], priceLimits: [{ category: 'smartphones', max: 500 }] },
  },
  // Most expensive first → the first page is Rolex/Longines, so cheaper watches exist ($89.99 belt watch).
  // `intents` makes an empty "nothing cheaper" answer fail here instead of passing R5 vacuously.
  {
    id: 'follow-up',
    turns: ["show me men's watches, most expensive first", 'show me cheaper ones'],
    expect: { intents: ['mens-watches'], cheaperThanPrevious: true },
  },
  // ADR 0004: no keyword says "beach" well — the Recommended Group should carry it.
  { id: 'beach', turns: ['something for the beach'], expect: { recommended: true } },
];
