import type { ProductGroup, ReportOffCatalogInput, SearchProductsInput } from '@app/contracts';
import type { HistoryMessage } from '../domain/history-message.js';

/** Tool handlers the application gives the LLM (D24). The adapter turns them into SDK tools. */
export interface TurnTools {
  searchProducts(query: SearchProductsInput): Promise<ProductGroup>;
  reportOffCatalog(input: ReportOffCatalogInput): Promise<{ acknowledged: true }>;
}

export interface LlmTurnRequest {
  system: string;
  history: HistoryMessage[];
  tools: TurnTools;
  /** Called once when the reply finished successfully (not on LLM error). Throwing → stream gets an error part. */
  onFinish(result: { text: string }): Promise<void>;
}

/** An HTTP-ready event stream (bytes) plus the headers to send with it. */
export interface ChatStream {
  headers: Record<string, string>;
  body: ReadableStream<Uint8Array>;
}

/** Port: runs one streamed Assistant turn with tools. */
export abstract class LlmPort {
  abstract streamTurn(request: LlmTurnRequest): ChatStream;
}
