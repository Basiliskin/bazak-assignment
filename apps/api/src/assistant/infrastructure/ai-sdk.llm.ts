import { ReportOffCatalogInputSchema, SearchProductsInputSchema, TOOL_NAMES } from '@app/contracts';
import {
  createUIMessageStream,
  JsonToSseTransformStream,
  stepCountIs,
  streamText,
  tool,
  UI_MESSAGE_STREAM_HEADERS,
  type LanguageModel,
  type ModelMessage,
} from 'ai';
import { LlmPort, type ChatStream, type LlmTurnRequest } from '../application/llm.port.js';
import type { HistoryMessage } from '../domain/history-message.js';
import {
  joinStepText,
  LLM_FAILED,
  MAX_STEPS,
  REPLY_NOT_SAVED,
  REPORT_OFF_CATALOG_DESCRIPTION,
  SEARCH_PRODUCTS_DESCRIPTION,
} from './llm-turn.js';

export { LLM_FAILED, MAX_STEPS, REPLY_NOT_SAVED } from './llm-turn.js';

const toModelMessage = (h: HistoryMessage): ModelMessage =>
  h.role === 'note' ? { role: 'system', content: h.text } : { role: h.role, content: h.text };

/**
 * LlmPort on the Vercel AI SDK (ADR 0001, D24) — the default, OpenAI provider.
 * Streams the UI message protocol (SSE) that `useChat` reads; errors become `error` parts, never a dropped connection.
 */
export class AiSdkLlm extends LlmPort {
  constructor(
    private readonly model: LanguageModel,
    private readonly logError: (message: string, error: unknown) => void = () => undefined,
  ) {
    super();
  }

  streamTurn(request: LlmTurnRequest): ChatStream {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: this.model,
          instructions: request.system,
          messages: request.history.map(toModelMessage),
          allowSystemInMessages: true, // history notes (D25) are system messages between turns
          tools: {
            [TOOL_NAMES.searchProducts]: tool({
              description: SEARCH_PRODUCTS_DESCRIPTION,
              inputSchema: SearchProductsInputSchema,
              execute: (query) => request.tools.searchProducts(query),
            }),
            [TOOL_NAMES.reportOffCatalog]: tool({
              description: REPORT_OFF_CATALOG_DESCRIPTION,
              inputSchema: ReportOffCatalogInputSchema,
              execute: (input) => request.tools.reportOffCatalog(input),
            }),
          },
          stopWhen: stepCountIs(MAX_STEPS),
          // The last step must answer in text — otherwise a model that keeps searching ends with an empty reply.
          prepareStep: ({ stepNumber }) => (stepNumber === MAX_STEPS - 1 ? { toolChoice: 'none' } : {}),
          onError: ({ error }) => this.logError('LLM stream failed', error),
        });
        writer.merge(result.toUIMessageStream({ onError: () => LLM_FAILED }));

        let steps: Awaited<typeof result.steps>;
        try {
          steps = await result.steps;
        } catch {
          return; // LLM failed: the merged stream already carries the error part; nothing to persist.
        }
        try {
          await request.onFinish({ text: joinStepText(steps) });
        } catch (error) {
          this.logError('Saving the reply failed', error);
          writer.write({ type: 'error', errorText: REPLY_NOT_SAVED });
        }
      },
      onError: () => LLM_FAILED,
    });

    return {
      headers: { ...UI_MESSAGE_STREAM_HEADERS },
      body: stream.pipeThrough(new JsonToSseTransformStream()).pipeThrough(new TextEncoderStream()),
    };
  }
}
