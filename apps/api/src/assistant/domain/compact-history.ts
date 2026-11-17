import type { Message, ProductGroup } from '@app/contracts';
import type { HistoryMessage } from './history-message.js';

/** Messages of the Conversation the LLM sees (latest user Message included). */
export const HISTORY_LIMIT = 20;

const range = (g: ProductGroup): string => {
  const n = g.products.length;
  const shown = g.query.offset === 0 ? `${n}` : `${g.query.offset + 1}–${g.query.offset + n}`;
  return `${shown} of ${g.total} ${g.total === 1 ? 'match' : 'matches'}`;
};

/** "category smartphones, price ≤ $500, sort price-asc" — lets the model repeat the exact search (D31). */
const describeSearch = ({ query: q }: ProductGroup): string =>
  [
    q.category ? `category ${q.category}` : 'all categories',
    q.keywords.length ? `keywords ${q.keywords.map(quote).join(' ')}` : null,
    q.minPrice !== null ? `price ≥ $${q.minPrice}` : null,
    q.maxPrice !== null ? `price ≤ $${q.maxPrice}` : null,
    `sort ${q.sortBy}`,
  ]
    .filter(Boolean)
    .join(', ');

/** Catalog titles, model labels and Shopper text are quoted as JSON strings: they stay data inside a system note. */
const quote = (text: string): string => JSON.stringify(text);

const productList = (g: ProductGroup): string =>
  g.products.map((p) => `#${p.id} ${quote(p.title)} $${p.price}`).join(', ') || 'none';

/** Recommended Groups are marked as similar, so "cheaper ones" is read against the matches (ADR 0004). */
const groupNote = (g: ProductGroup): string =>
  g.kind === 'recommended'
    ? `Also shown below it — ${quote(g.label)} (similar Products, not exact matches; added by the system): ${productList(g)}`
    : `Shown in the reply above — ${quote(g.label)} (${range(g)}; search: ${describeSearch(g)}): ${productList(g)}`;

const toHistory = (m: Message): HistoryMessage[] => [
  ...(m.text.trim() ? [{ role: m.role, text: m.text.trim() }] : []),
  ...m.productGroups.map((g): HistoryMessage => ({ role: 'note', text: groupNote(g) })),
  ...m.offCatalog.map((o): HistoryMessage => ({
    role: 'note',
    text: `Reported as not sold here: ${quote(o.request)}`,
  })),
];

/**
 * Pure (D25): last 20 Messages as plain text. After each assistant Message comes a system `note` listing the
 * Products it showed (id, title, price), so Follow-ups like "cheaper ones" or "show more" work without replaying
 * tool calls — and the model doesn't learn to write such lists into its own replies.
 */
export function compactHistory(messages: readonly Message[], limit = HISTORY_LIMIT): HistoryMessage[] {
  return messages.slice(-limit).flatMap(toHistory);
}
