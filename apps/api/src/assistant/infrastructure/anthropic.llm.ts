import type Anthropic from '@anthropic-ai/sdk';
import { ReportOffCatalogInputSchema, SearchProductsInputSchema, TOOL_NAMES } from '@app/contracts';
import {
  createUIMessageStream,
  JsonToSseTransformStream,
  UI_MESSAGE_STREAM_HEADERS,
  type UIMessageStreamWriter,
} from 'ai';
import { z } from 'zod';
import { LlmPort, type ChatStream, type LlmTurnRequest, type TurnTools } from '../application/llm.port.js';
import type { HistoryMessage } from '../domain/history-message.js';
import {
  joinStepText,
  LLM_FAILED,
  MAX_STEPS,
  REPLY_NOT_SAVED,
  REPORT_OFF_CATALOG_DESCRIPTION,
  SEARCH_PRODUCTS_DESCRIPTION,
} from './llm-turn.js';

/** The one SDK call this adapter makes — `client.messages.stream` in production, a fake in tests. */
export interface ClaudeStream extends AsyncIterable<Anthropic.MessageStreamEvent> {
  finalMessage(): Promise<Anthropic.Message>;
}
export type ClaudeStreamFn = (params: Anthropic.MessageStreamParams) => ClaudeStream;

/** Room for adaptive thinking plus a short shopping reply. */
const MAX_TOKENS = 16_000;

const NOTE_TAG = 'system_note';
const NOTE_TAG_PATTERN = new RegExp(`</?${NOTE_TAG}>`, 'gi');

/** zod contract → the JSON Schema the Messages API wants (`$schema` is not part of it). */
const inputSchema = (schema: z.ZodType): Anthropic.Tool.InputSchema => {
  const { $schema: _ignored, ...json } = z.toJSONSchema(schema, { io: 'input' });
  return json as Anthropic.Tool.InputSchema;
};

/** Same names, descriptions and input contracts as the AI SDK adapter: the prompt and the web don't care who runs. */
const TOOLS: Anthropic.Tool[] = [
  {
    name: TOOL_NAMES.searchProducts,
    description: SEARCH_PRODUCTS_DESCRIPTION,
    input_schema: inputSchema(SearchProductsInputSchema),
  },
  {
    name: TOOL_NAMES.reportOffCatalog,
    description: REPORT_OFF_CATALOG_DESCRIPTION,
    input_schema: inputSchema(ReportOffCatalogInputSchema),
  },
];

type TextParam = Anthropic.TextBlockParam;
const text = (t: string): TextParam => ({ type: 'text', text: t });

/**
 * History → Claude messages. A note (D25) sits right after an assistant reply, where Claude accepts no system
 * message, so notes ride at the start of the next user turn inside `<system_note>` tags — the tags the Shopper's
 * own text can't contain (they are stripped from it).
 */
export function toClaudeMessages(history: readonly HistoryMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  let notes: TextParam[] = [];
  const push = (role: 'user' | 'assistant', blocks: TextParam[]) => {
    const last = out.at(-1);
    if (last?.role === role && Array.isArray(last.content)) last.content.push(...blocks);
    else out.push({ role, content: blocks });
  };
  const flushNotes = () => {
    if (notes.length) push('user', notes);
    notes = [];
  };

  for (const h of history) {
    if (h.role === 'note') notes.push(text(`<${NOTE_TAG}>\n${h.text}\n</${NOTE_TAG}>`));
    else if (h.role === 'user') {
      flushNotes();
      push('user', [text(h.text.replace(NOTE_TAG_PATTERN, ''))]);
    } else {
      flushNotes();
      push('assistant', [text(h.text)]);
    }
  }
  flushNotes();
  return out;
}

type ParsedCall =
  | { ok: true; input: unknown; execute: (tools: TurnTools) => Promise<unknown> }
  | { ok: false; error: string };

/** Model output is untrusted: each tool input is checked against its contract before it runs. */
function parseCall(call: Anthropic.ToolUseBlock): ParsedCall {
  switch (call.name) {
    case TOOL_NAMES.searchProducts: {
      const p = SearchProductsInputSchema.safeParse(call.input);
      return p.success
        ? { ok: true, input: p.data, execute: (t) => t.searchProducts(p.data) }
        : { ok: false, error: z.prettifyError(p.error) };
    }
    case TOOL_NAMES.reportOffCatalog: {
      const p = ReportOffCatalogInputSchema.safeParse(call.input);
      return p.success
        ? { ok: true, input: p.data, execute: (t) => t.reportOffCatalog(p.data) }
        : { ok: false, error: z.prettifyError(p.error) };
    }
    default:
      return { ok: false, error: `Unknown tool ${call.name}` };
  }
}

/**
 * LlmPort on the official Anthropic SDK (`LLM_PROVIDER=anthropic`, local development only — the assignment allows
 * only gpt-6-luna). Runs the tool loop itself and writes the same UI message stream (SSE) as `AiSdkLlm`, so
 * `useChat`, the saved Messages and the evals work unchanged. Errors become `error` parts, never a dropped connection.
 */
export class AnthropicLlm extends LlmPort {
  constructor(
    private readonly stream: ClaudeStreamFn,
    private readonly model: string,
    private readonly logError: (message: string, error: unknown) => void = () => undefined,
  ) {
    super();
  }

  streamTurn(request: LlmTurnRequest): ChatStream {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: 'start' });
        const steps: { text: string }[] = [];
        try {
          const messages = toClaudeMessages(request.history);
          for (let step = 0; step < MAX_STEPS; step++) {
            writer.write({ type: 'start-step' });
            const message = await this.streamStep(writer, request.system, messages, step);
            steps.push({ text: textOf(message) });
            const ranTools = message.stop_reason === 'tool_use';
            if (ranTools) {
              messages.push({ role: 'assistant', content: message.content });
              messages.push({ role: 'user', content: await this.runTools(writer, message, request.tools) });
            }
            writer.write({ type: 'finish-step' });
            if (!ranTools) break;
          }
        } catch (error) {
          this.logError('LLM stream failed', error);
          writer.write({ type: 'error', errorText: LLM_FAILED });
          return; // nothing to persist, as with AiSdkLlm
        }
        try {
          await request.onFinish({ text: joinStepText(steps) });
        } catch (error) {
          this.logError('Saving the reply failed', error);
          writer.write({ type: 'error', errorText: REPLY_NOT_SAVED });
        }
        writer.write({ type: 'finish' });
      },
      onError: () => LLM_FAILED,
    });

    return {
      headers: { ...UI_MESSAGE_STREAM_HEADERS },
      body: stream.pipeThrough(new JsonToSseTransformStream()).pipeThrough(new TextEncoderStream()),
    };
  }

  /** One model call, its text and tool-call parts streamed as they arrive. The last step must answer in text. */
  private async streamStep(
    writer: UIMessageStreamWriter,
    system: string,
    messages: Anthropic.MessageParam[],
    step: number,
  ): Promise<Anthropic.Message> {
    const stream = this.stream({
      model: this.model,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      tools: TOOLS,
      tool_choice: step === MAX_STEPS - 1 ? { type: 'none' } : { type: 'auto' },
      cache_control: { type: 'ephemeral' }, // the system prompt and tools repeat on every step and turn
    });
    const open = new Map<number, { kind: 'text' | 'tool'; id: string }>();
    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'text') {
          const id = `${step}-${event.index}`;
          open.set(event.index, { kind: 'text', id });
          writer.write({ type: 'text-start', id });
        } else if (block.type === 'tool_use') {
          open.set(event.index, { kind: 'tool', id: block.id });
          writer.write({ type: 'tool-input-start', toolCallId: block.id, toolName: block.name });
        }
      } else if (event.type === 'content_block_delta') {
        const block = open.get(event.index);
        if (block?.kind === 'text' && event.delta.type === 'text_delta') {
          writer.write({ type: 'text-delta', id: block.id, delta: event.delta.text });
        } else if (block?.kind === 'tool' && event.delta.type === 'input_json_delta') {
          writer.write({
            type: 'tool-input-delta',
            toolCallId: block.id,
            inputTextDelta: event.delta.partial_json,
          });
        }
      } else if (event.type === 'content_block_stop') {
        const block = open.get(event.index);
        if (block?.kind === 'text') writer.write({ type: 'text-end', id: block.id });
      }
    }
    const message = await stream.finalMessage();
    // A tool input cut off by max_tokens can still look valid — never run it.
    if (message.stop_reason === 'max_tokens' && message.content.some((b) => b.type === 'tool_use')) {
      throw new Error('Tool input cut off at max_tokens');
    }
    return message;
  }

  /** Runs the step's tool calls (in parallel) and returns their results for the next model call. */
  private runTools(
    writer: UIMessageStreamWriter,
    message: Anthropic.Message,
    tools: TurnTools,
  ): Promise<Anthropic.ToolResultBlockParam[]> {
    const calls = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    return Promise.all(
      calls.map(async (call): Promise<Anthropic.ToolResultBlockParam> => {
        const failed = (errorText: string): Anthropic.ToolResultBlockParam => ({
          type: 'tool_result',
          tool_use_id: call.id,
          is_error: true,
          content: errorText,
        });
        const parsed = parseCall(call);
        if (!parsed.ok) {
          writer.write({
            type: 'tool-input-error',
            toolCallId: call.id,
            toolName: call.name,
            input: call.input,
            errorText: parsed.error,
          });
          return failed(`Invalid input: ${parsed.error}`);
        }
        writer.write({
          type: 'tool-input-available',
          toolCallId: call.id,
          toolName: call.name,
          input: parsed.input,
        });
        try {
          const output = await parsed.execute(tools);
          writer.write({ type: 'tool-output-available', toolCallId: call.id, output });
          return { type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(output) };
        } catch (error) {
          const errorText = error instanceof Error ? error.message : String(error);
          writer.write({ type: 'tool-output-error', toolCallId: call.id, errorText });
          return failed(errorText);
        }
      }),
    );
  }
}

const textOf = (message: Anthropic.Message): string =>
  message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
