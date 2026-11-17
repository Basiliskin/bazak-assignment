import type { Message, SearchProductsInput } from '@app/contracts';

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Pure (D31): a "Show more" page (offset > 0) of a group already shown reuses that group's search and
 * changes only the offset. Found live: the model re-ran page 2 with a different `sortBy`, so a Product
 * repeated and one was skipped. Paging must not depend on the model copying every argument.
 * A first page (offset 0) or an unknown label is left as the model wrote it. Recommended Groups have no pages.
 */
export function resolvePagedQuery(
  query: SearchProductsInput,
  messages: readonly Message[],
): SearchProductsInput {
  if (query.offset === 0) return query;
  const shown = messages
    .flatMap((m) => m.productGroups)
    .findLast((g) => g.kind === 'match' && sameLabel(g.label, query.label));
  return shown ? { ...shown.query, offset: query.offset } : query;
}
