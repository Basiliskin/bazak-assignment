import type { ProductGroup, ReportOffCatalogInput, SearchProductsInput, TOOL_NAMES } from '@app/contracts';
import type { UIDataTypes, UIMessage } from 'ai';

type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

/** Fails to compile if a tool name drifts from contracts. */
type KeyedByToolName<T extends Record<ToolName, unknown>> = T;

/** The two server tools as `useChat` sees them. */
export type ShopTools = KeyedByToolName<{
  search_products: { input: SearchProductsInput; output: ProductGroup };
  report_off_catalog: { input: ReportOffCatalogInput; output: { acknowledged: true } };
}>;

/** `useChat` message type. SDK shape stays inside chat/ (D26). */
export type ShopUIMessage = UIMessage<never, UIDataTypes, ShopTools>;

/** What presentational components render — one shape for live and stored Messages (D26). */
export interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  productGroups: ProductGroup[];
  offCatalog: ReportOffCatalogInput[];
  /** Labels of `search_products` calls still running ("Searching: <label>…"). */
  searching: string[];
}
