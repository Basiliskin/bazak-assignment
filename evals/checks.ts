import type { CategorySlug, Message, ProductCard, ProductDetails } from '@app/contracts';

/** What one eval case expects of the last Assistant reply (rules from docs/requirements.md). */
export interface Expectations {
  /** R4: exactly one Product Group per Search Intent, each showing ≥1 card of that category. */
  intents?: readonly CategorySlug[];
  /** R6: every shown card of the category costs ≤ max, and at least one is shown. */
  priceLimits?: readonly { category: CategorySlug; max: number }[];
  /** R3: the model called report_off_catalog. */
  offCatalog?: boolean;
  /** R2: a guessed search with an Assumption, cards shown, and a follow-up question. */
  assumption?: boolean;
  /** R5: every new card is cheaper than the cheapest card in the previous reply (or none, explained). */
  cheaperThanPrevious?: boolean;
  /** ADR 0004: true = at least one "You might also like" card; false = no Recommended Group at all. */
  recommended?: boolean;
  /** Q1: every match card belongs to one of these categories (and at least one is shown). */
  matchCategories?: readonly CategorySlug[];
}

export interface CheckResult {
  rule: string;
  pass: boolean;
  detail: string;
}

export interface CheckInput {
  expect: Expectations;
  reply: Message;
  /** The previous Assistant reply in the same Conversation (for R5). */
  previous?: Message;
  catalog: readonly ProductDetails[];
}

const result = (rule: string, pass: boolean, detail: string): CheckResult => ({ rule, pass, detail });
const matchGroups = (message: Message) => message.productGroups.filter((g) => g.kind === 'match');
const recommendedGroups = (message: Message) => message.productGroups.filter((g) => g.kind === 'recommended');
const cardsOf = (message: Message): ProductCard[] => message.productGroups.flatMap((g) => g.products);
/** R4/R5 are about what was searched for — "You might also like" is extra (ADR 0004). */
const matchCardsOf = (message: Message): ProductCard[] => matchGroups(message).flatMap((g) => g.products);
const ref = (c: ProductCard) => `#${c.id} $${c.price}`;
const list = (items: string[]) => items.join(', ');

function checkReal(cards: ProductCard[], byId: Map<number, ProductDetails>): CheckResult {
  const fake = cards.filter((c) => byId.get(c.id)?.title !== c.title).map((c) => `#${c.id}`);
  return fake.length
    ? result('R1', false, `not in Catalog: ${list(fake)}`)
    : result('R1', true, `${cards.length} cards, all real`);
}

function checkGroupSize(reply: Message): CheckResult {
  const big = reply.productGroups
    .filter((g) => g.products.length > 4)
    .map((g) => `${g.label} (${g.products.length})`);
  return big.length
    ? result('R7', false, `> 4 cards: ${list(big)}`)
    : result('R7', true, '≤ 4 cards per group');
}

function checkInStock(cards: ProductCard[], byId: Map<number, ProductDetails>): CheckResult {
  const out = cards.filter((c) => byId.get(c.id)?.stock === 0).map((c) => `#${c.id}`);
  return out.length ? result('R9', false, `out of stock: ${list(out)}`) : result('R9', true, 'all in stock');
}

function checkIntents(reply: Message, intents: readonly CategorySlug[]): CheckResult {
  const groups = matchGroups(reply);
  const problems: string[] = [];
  if (groups.length !== intents.length)
    problems.push(`${groups.length} group(s), expected ${intents.length}`);
  for (const category of intents) {
    if (!groups.some((g) => g.products.some((p) => p.category === category)))
      problems.push(`no ${category} cards`);
  }
  return problems.length
    ? result('R4', false, problems.join('; '))
    : result('R4', true, `${groups.length} groups: ${list(groups.map((g) => g.label))}`);
}

function checkPriceLimits(
  cards: ProductCard[],
  limits: NonNullable<Expectations['priceLimits']>,
): CheckResult {
  const problems: string[] = [];
  const passed: string[] = [];
  for (const { category, max } of limits) {
    const inCategory = cards.filter((c) => c.category === category);
    const over = inCategory.filter((c) => c.price > max);
    if (!inCategory.length) problems.push(`no ${category} cards shown`);
    else if (over.length) problems.push(`${category} over $${max}: ${list(over.map(ref))}`);
    else passed.push(`${category} ≤ $${max}: ${inCategory.length} cards`);
  }
  return problems.length ? result('R6', false, problems.join('; ')) : result('R6', true, passed.join('; '));
}

function checkOffCatalog(reply: Message): CheckResult {
  return reply.offCatalog.length
    ? result('R3', true, `reported: ${list(reply.offCatalog.map((o) => o.request))}`)
    : result('R3', false, 'report_off_catalog not called');
}

function checkAssumption(reply: Message): CheckResult {
  const guessed = reply.productGroups.find(
    (g) => g.query.confidence === 'guessed' && g.query.assumption?.trim(),
  );
  if (!guessed) return result('R2', false, 'no guessed search with an assumption');
  if (!guessed.products.length) return result('R2', false, 'guessed search showed no cards');
  if (!reply.text.includes('?')) return result('R2', false, 'no follow-up question');
  return result('R2', true, `assumption: "${guessed.query.assumption}"`);
}

function checkCheaper(reply: Message, previous: Message | undefined): CheckResult {
  const cards = matchCardsOf(reply);
  const before = previous ? matchCardsOf(previous).map((c) => c.price) : [];
  if (!before.length) return result('R5', false, 'no earlier cards to compare');
  const cheapest = Math.min(...before);
  if (!cards.length) {
    return reply.text.trim()
      ? result('R5', true, 'no cheaper match; reply explains')
      : result('R5', false, 'no cards and no reply');
  }
  const notCheaper = cards.filter((c) => c.price >= cheapest);
  return notCheaper.length
    ? result('R5', false, `not < $${cheapest}: ${list(notCheaper.map(ref))}`)
    : result('R5', true, `all < $${cheapest} (cheapest before)`);
}

/** R10: a Recommended Group repeats no match, shows only in-stock Products and keeps its search's price range. */
function checkRecommendedRules(reply: Message, byId: Map<number, ProductDetails>): CheckResult {
  const groups = recommendedGroups(reply);
  if (!groups.length) return result('R10', true, 'no Recommended Group');
  const matched = new Set(matchCardsOf(reply).map((c) => c.id));
  const problems = groups.flatMap((g) =>
    g.products.flatMap((c) => {
      const { minPrice, maxPrice } = g.query;
      return [
        matched.has(c.id) ? `#${c.id} repeats a match` : null,
        byId.get(c.id)?.stock === 0 ? `#${c.id} out of stock` : null,
        maxPrice !== null && c.price > maxPrice ? `#${c.id} $${c.price} > $${maxPrice}` : null,
        minPrice !== null && c.price < minPrice ? `#${c.id} $${c.price} < $${minPrice}` : null,
      ].filter((x): x is string => x !== null);
    }),
  );
  const shown = groups.reduce((n, g) => n + g.products.length, 0);
  return problems.length
    ? result('R10', false, list(problems))
    : result('R10', true, `${shown} recommended, none repeat a match`);
}

function checkRecommendedPresence(reply: Message, wanted: boolean): CheckResult {
  const shown = recommendedGroups(reply).flatMap((g) => g.products);
  if (wanted) {
    return shown.length
      ? result('similar', true, `${shown.length} recommended: ${list(shown.map((c) => c.title))}`)
      : result('similar', false, 'no "You might also like" cards');
  }
  return shown.length
    ? result('similar', false, `unexpected recommendations: ${list(shown.map((c) => c.title))}`)
    : result('similar', true, 'no Recommended Group');
}

/** Q1: a broad search's match group must be on topic, not the whole Catalog by rating. */
function checkMatchCategories(reply: Message, allowed: readonly CategorySlug[]): CheckResult {
  const cards = matchCardsOf(reply);
  if (!cards.length) return result('relevant', false, 'no match cards');
  const off = cards.filter((c) => !allowed.includes(c.category));
  return off.length
    ? result('relevant', false, `off-topic: ${list(off.map((c) => `#${c.id} ${c.title} (${c.category})`))}`)
    : result('relevant', true, `${cards.length} match cards on topic: ${list(cards.map((c) => c.title))}`);
}

/** Pure: checks one Assistant reply against the rules. R1, R7, R9, R10 and a non-empty reply are checked on every case. */
export function checkReply({ expect, reply, previous, catalog }: CheckInput): CheckResult[] {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const cards = cardsOf(reply);
  const results = [
    checkReal(cards, byId),
    checkGroupSize(reply),
    checkInStock(cards, byId),
    reply.text.trim() ? result('reply', true, 'has text') : result('reply', false, 'empty reply text'),
    checkRecommendedRules(reply, byId),
  ];
  if (expect.intents) results.push(checkIntents(reply, expect.intents));
  if (expect.priceLimits) results.push(checkPriceLimits(cards, expect.priceLimits));
  if (expect.offCatalog) results.push(checkOffCatalog(reply));
  if (expect.assumption) results.push(checkAssumption(reply));
  if (expect.cheaperThanPrevious) results.push(checkCheaper(reply, previous));
  if (expect.recommended !== undefined) results.push(checkRecommendedPresence(reply, expect.recommended));
  if (expect.matchCategories) results.push(checkMatchCategories(reply, expect.matchCategories));
  return results;
}
