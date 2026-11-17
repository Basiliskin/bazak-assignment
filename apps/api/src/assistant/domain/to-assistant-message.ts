import type { Message, ProductGroup, ReportOffCatalogInput } from '@app/contracts';

/** What one Assistant turn produced, independent of the LLM SDK. */
export interface TurnOutcome {
  text: string;
  productGroups: ProductGroup[];
  offCatalog: ReportOffCatalogInput[];
}

/** Pure: turn outcome → the assistant Message we persist. Id and time come from the caller. */
export const toAssistantMessage = (
  outcome: TurnOutcome,
  meta: { id: string; createdAt: string },
): Message => ({
  id: meta.id,
  role: 'assistant',
  text: outcome.text.trim(),
  productGroups: outcome.productGroups,
  offCatalog: outcome.offCatalog,
  createdAt: meta.createdAt,
});
