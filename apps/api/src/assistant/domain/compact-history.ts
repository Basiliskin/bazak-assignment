import type { Message, ProductGroup } from '@app/contracts';
import type { HistoryMessage } from './history-message.js';

/** Messages of the Conversation the LLM sees (latest user Message included). */
export const HISTORY_LIMIT = 20;

const range = (g: ProductGroup): string => {
  const n = g.products.length;
  const shown = g.query.offset === 0 ? `${n}` : `${g.query.offset + 1}–${g.query.offset + n}`;
  return `${shown} of ${g.total} ${g.total === 1 ? 'match' : 'matches'}`;
};

const groupNote = (g: ProductGroup): string =>
  `Shown in the reply above — "${g.label}" (${range(g)}): ${
    g.products.map((p) => `#${p.id} ${p.title} $${p.price}`).join(', ') || 'none'
  }`;

const toHistory = (m: Message): HistoryMessage[] => [
  ...(m.text.trim() ? [{ role: m.role, text: m.text.trim() }] : []),
  ...m.productGroups.map((g): HistoryMessage => ({ role: 'note', text: groupNote(g) })),
  ...m.offCatalog.map((o): HistoryMessage => ({
    role: 'note',
    text: `Reported as not sold here: ${o.request}`,
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
