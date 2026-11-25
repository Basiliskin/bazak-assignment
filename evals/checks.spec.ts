import type { Message, ProductCard, ProductDetails, ProductGroup, SearchProductsInput } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { checkReply, type CheckResult } from './checks.js';

const product = (over: Partial<ProductDetails> & Pick<ProductDetails, 'id'>): ProductDetails => ({
  title: `Product ${over.id}`,
  description: '',
  price: 100,
  discountPercentage: 0,
  rating: 4,
  thumbnail: '',
  category: 'smartphones',
  stock: 10,
  images: [],
  tags: [],
  ...over,
});

const catalog: ProductDetails[] = [
  product({ id: 1, title: 'iPhone 9', price: 549 }),
  product({ id: 2, title: 'Oppo F19', price: 399 }),
  product({ id: 3, title: 'Realme C35', price: 149 }),
  product({ id: 4, title: 'Red Lipstick', price: 12.99, category: 'beauty' }),
  product({ id: 5, title: 'Galaxy S8', price: 499, stock: 0 }),
];

const card = (id: number): ProductCard => {
  const p = catalog.find((c) => c.id === id) ?? product({ id, title: 'Invented phone' });
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price,
    discountPercentage: p.discountPercentage,
    rating: p.rating,
    thumbnail: p.thumbnail,
    category: p.category,
  };
};

const query = (over: Partial<SearchProductsInput> = {}): SearchProductsInput => ({
  label: 'Phones',
  category: 'smartphones',
  keywords: [],
  semanticQuery: 'smartphones',
  minPrice: null,
  maxPrice: null,
  sortBy: 'relevance',
  offset: 0,
  confidence: 'clear',
  assumption: null,
  ...over,
});

const group = (ids: number[], q: Partial<SearchProductsInput> = {}, total = ids.length): ProductGroup => ({
  kind: 'match',
  label: q.label ?? 'Phones',
  query: query(q),
  products: ids.map(card),
  total,
});

const reply = (over: Partial<Message> = {}): Message => ({
  id: 'a1',
  role: 'assistant',
  text: 'Here you go.',
  productGroups: [],
  offCatalog: [],
  createdAt: '2026-11-17T10:00:00.000Z',
  ...over,
});

const byRule = (results: CheckResult[], rule: string) => results.find((r) => r.rule === rule);

describe('checkReply — rules checked on every case', () => {
  it('passes R1, R7, R9, reply and R10 for real, in-stock cards with text', () => {
    const results = checkReply({ expect: {}, reply: reply({ productGroups: [group([1, 2])] }), catalog });
    expect(results.map((r) => [r.rule, r.pass])).toEqual([
      ['R1', true],
      ['R7', true],
      ['R9', true],
      ['reply', true],
      ['R10', true],
    ]);
  });

  it('R1 fails for a card id not in the Catalog, or a title that does not match it', () => {
    const renamed = { ...group([2]), products: [{ ...card(2), title: 'Oppo X' }] };
    const results = checkReply({
      expect: {},
      reply: reply({ productGroups: [group([1, 99]), renamed] }),
      catalog,
    });
    expect(byRule(results, 'R1')).toEqual({ rule: 'R1', pass: false, detail: 'not in Catalog: #99, #2' });
  });

  it('R7 fails for a group with more than 4 cards', () => {
    const results = checkReply({
      expect: {},
      reply: reply({ productGroups: [group([1, 2, 3, 4, 1])] }),
      catalog,
    });
    expect(byRule(results, 'R7')?.pass).toBe(false);
  });

  it('R9 fails for an out-of-stock card', () => {
    const results = checkReply({ expect: {}, reply: reply({ productGroups: [group([1, 5])] }), catalog });
    expect(byRule(results, 'R9')).toEqual({ rule: 'R9', pass: false, detail: 'out of stock: #5' });
  });

  it('reply fails when the text is empty', () => {
    expect(byRule(checkReply({ expect: {}, reply: reply({ text: '  ' }), catalog }), 'reply')?.pass).toBe(
      false,
    );
  });
});

describe('checkReply — expectations per case', () => {
  it('R4 passes with one group per intent, each showing that category', () => {
    const r = reply({ productGroups: [group([2]), group([4], { label: 'Lipstick', category: 'beauty' })] });
    const results = checkReply({ expect: { intents: ['smartphones', 'beauty'] }, reply: r, catalog });
    expect(byRule(results, 'R4')).toEqual({ rule: 'R4', pass: true, detail: '2 groups: Phones, Lipstick' });
  });

  it('R4 fails on a wrong group count or a missing intent', () => {
    const one = checkReply({
      expect: { intents: ['smartphones', 'beauty'] },
      reply: reply({ productGroups: [group([2])] }),
      catalog,
    });
    expect(byRule(one, 'R4')).toEqual({
      rule: 'R4',
      pass: false,
      detail: '1 group(s), expected 2; no beauty cards',
    });
  });

  it('R6 passes when every card of that category is within the limit', () => {
    const r = reply({
      productGroups: [group([2, 3], { maxPrice: 500 }), group([4], { category: 'beauty' })],
    });
    const results = checkReply({
      expect: { priceLimits: [{ category: 'smartphones', max: 500 }] },
      reply: r,
      catalog,
    });
    expect(byRule(results, 'R6')).toEqual({ rule: 'R6', pass: true, detail: 'smartphones ≤ $500: 2 cards' });
  });

  it('R6 fails on a card above the limit, or when nothing of that category is shown', () => {
    const over = checkReply({
      expect: { priceLimits: [{ category: 'smartphones', max: 500 }] },
      reply: reply({ productGroups: [group([1, 2])] }),
      catalog,
    });
    expect(byRule(over, 'R6')).toEqual({ rule: 'R6', pass: false, detail: 'smartphones over $500: #1 $549' });
    const none = checkReply({
      expect: { priceLimits: [{ category: 'smartphones', max: 500 }] },
      reply: reply(),
      catalog,
    });
    expect(byRule(none, 'R6')).toEqual({ rule: 'R6', pass: false, detail: 'no smartphones cards shown' });
  });

  it('R3 needs a report_off_catalog call', () => {
    const yes = checkReply({
      expect: { offCatalog: true },
      reply: reply({ offCatalog: [{ request: 'flight' }] }),
      catalog,
    });
    expect(byRule(yes, 'R3')).toEqual({ rule: 'R3', pass: true, detail: 'reported: flight' });
    expect(byRule(checkReply({ expect: { offCatalog: true }, reply: reply(), catalog }), 'R3')?.pass).toBe(
      false,
    );
  });

  it('R2 needs a guessed search with an Assumption, cards, and a question in the reply', () => {
    const guessed = group([3], { confidence: 'guessed', assumption: 'cheap gadgets', sortBy: 'price-asc' });
    const pass = checkReply({
      expect: { assumption: true },
      reply: reply({ text: 'Cheap gadgets. Which kind?', productGroups: [guessed] }),
      catalog,
    });
    expect(byRule(pass, 'R2')).toEqual({ rule: 'R2', pass: true, detail: 'assumption: "cheap gadgets"' });

    const noQuestion = checkReply({
      expect: { assumption: true },
      reply: reply({ productGroups: [guessed] }),
      catalog,
    });
    expect(byRule(noQuestion, 'R2')).toEqual({ rule: 'R2', pass: false, detail: 'no follow-up question' });

    const clear = checkReply({
      expect: { assumption: true },
      reply: reply({ text: 'Which?', productGroups: [group([3])] }),
      catalog,
    });
    expect(byRule(clear, 'R2')).toEqual({
      rule: 'R2',
      pass: false,
      detail: 'no guessed search with an assumption',
    });
  });

  it('R2 passes when one of several guessed searches shows cards; fails when none does', () => {
    const empty = group([], { label: 'Cool gadgets', confidence: 'guessed', assumption: 'cheap gadgets' });
    const shown = group([3], {
      label: 'Cool sunglasses',
      confidence: 'guessed',
      assumption: 'cheap sunglasses',
    });
    const check = (productGroups: ProductGroup[]) =>
      byRule(
        checkReply({
          expect: { assumption: true },
          reply: reply({ text: 'Which?', productGroups }),
          catalog,
        }),
        'R2',
      );

    expect(check([empty, shown])).toEqual({
      rule: 'R2',
      pass: true,
      detail: 'assumption: "cheap sunglasses"',
    });
    expect(check([empty])).toEqual({ rule: 'R2', pass: false, detail: 'guessed search showed no cards' });
  });

  it('R5 passes when every new card is cheaper than the cheapest shown before', () => {
    const previous = reply({ productGroups: [group([1, 2])] });
    const results = checkReply({
      expect: { cheaperThanPrevious: true },
      reply: reply({ productGroups: [group([3])] }),
      previous,
      catalog,
    });
    expect(byRule(results, 'R5')).toEqual({ rule: 'R5', pass: true, detail: 'all < $399 (cheapest before)' });
  });

  it('R5 fails on a card not cheaper, and passes when nothing cheaper is shown but the reply says so', () => {
    const previous = reply({ productGroups: [group([2, 3])] });
    const notCheaper = checkReply({
      expect: { cheaperThanPrevious: true },
      reply: reply({ productGroups: [group([2])] }),
      previous,
      catalog,
    });
    expect(byRule(notCheaper, 'R5')).toEqual({ rule: 'R5', pass: false, detail: 'not < $149: #2 $399' });

    const none = checkReply({
      expect: { cheaperThanPrevious: true },
      reply: reply({ text: 'Nothing cheaper.' }),
      previous,
      catalog,
    });
    expect(byRule(none, 'R5')).toEqual({
      rule: 'R5',
      pass: true,
      detail: 'no cheaper match; reply explains',
    });
  });

  it('R5 fails when there was no earlier reply with cards', () => {
    const results = checkReply({ expect: { cheaperThanPrevious: true }, reply: reply(), catalog });
    expect(byRule(results, 'R5')).toEqual({ rule: 'R5', pass: false, detail: 'no earlier cards to compare' });
  });
});

describe('checkReply — Recommended Groups (ADR 0004)', () => {
  const similar = (ids: number[], q: Partial<SearchProductsInput> = {}): ProductGroup => ({
    ...group(ids, q),
    kind: 'recommended',
    label: 'You might also like · Phones',
  });

  it('R10 passes vacuously without a Recommended Group, and for one that repeats nothing', () => {
    expect(
      byRule(checkReply({ expect: {}, reply: reply({ productGroups: [group([2])] }), catalog }), 'R10')?.pass,
    ).toBe(true);
    const ok = reply({ productGroups: [group([2], { maxPrice: 500 }), similar([3], { maxPrice: 500 })] });
    expect(byRule(checkReply({ expect: {}, reply: ok, catalog }), 'R10')?.pass).toBe(true);
  });

  it('R10 fails when a recommendation repeats a match, is out of stock or breaks the price limit', () => {
    const bad = reply({
      productGroups: [group([2], { maxPrice: 400 }), similar([2, 5, 1], { maxPrice: 400 })],
    });
    const r10 = byRule(checkReply({ expect: {}, reply: bad, catalog }), 'R10');
    expect(r10?.pass).toBe(false);
    expect(r10?.detail).toContain('#2 repeats a match');
    expect(r10?.detail).toContain('#5 out of stock');
    expect(r10?.detail).toContain('#1 $549 > $400');
  });

  it('R4 counts match groups only — a Recommended Group is not an extra intent', () => {
    const r = reply({ productGroups: [group([2]), similar([3])] });
    expect(byRule(checkReply({ expect: { intents: ['smartphones'] }, reply: r, catalog }), 'R4')?.pass).toBe(
      true,
    );
  });

  it('R5 compares match cards only', () => {
    const previous = reply({ productGroups: [group([2]), similar([3])] }); // cheapest match $399, similar $149
    const r = reply({ productGroups: [group([3])] }); // $149 < $399
    expect(
      byRule(checkReply({ expect: { cheaperThanPrevious: true }, reply: r, previous, catalog }), 'R5')?.pass,
    ).toBe(true);
  });

  it('"similar" expects cards when wanted and none when not (off-catalog)', () => {
    const withSimilar = reply({ productGroups: [group([2]), similar([3])] });
    const without = reply({ productGroups: [group([2])] });
    const rule = (r: Message, recommended: boolean) =>
      byRule(checkReply({ expect: { recommended }, reply: r, catalog }), 'similar')?.pass;
    expect(rule(withSimilar, true)).toBe(true);
    expect(rule(without, true)).toBe(false);
    expect(rule(without, false)).toBe(true);
    expect(rule(withSimilar, false)).toBe(false);
  });
  it('"relevant" needs match cards, all from the allowed categories — recommendations are not judged (Q1)', () => {
    const rule = (r: Message) =>
      byRule(checkReply({ expect: { matchCategories: ['smartphones'] }, reply: r, catalog }), 'relevant');
    expect(rule(reply({ productGroups: [group([2, 3]), similar([4])] }))?.pass).toBe(true);
    const off = rule(reply({ productGroups: [group([2, 4])] }));
    expect(off).toEqual({ rule: 'relevant', pass: false, detail: 'off-topic: #4 Red Lipstick (beauty)' });
    expect(rule(reply({ productGroups: [similar([2])] }))?.pass).toBe(false);
  });
});
