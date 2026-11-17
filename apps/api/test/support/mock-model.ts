import type { LanguageModelV4StreamPart } from '@ai-sdk/provider';
import { convertArrayToReadableStream, MockLanguageModelV4 } from 'ai/test';

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

export const toolCallStep = (
  calls: { id: string; name: string; input: unknown }[],
): LanguageModelV4StreamPart[] => [
  { type: 'stream-start', warnings: [] },
  ...calls.map((c): LanguageModelV4StreamPart => ({
    type: 'tool-call',
    toolCallId: c.id,
    toolName: c.name,
    input: JSON.stringify(c.input),
  })),
  { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage },
];

export const textStep = (...deltas: string[]): LanguageModelV4StreamPart[] => [
  { type: 'stream-start', warnings: [] },
  { type: 'text-start', id: 't' },
  ...deltas.map((delta): LanguageModelV4StreamPart => ({ type: 'text-delta', id: 't', delta })),
  { type: 'text-end', id: 't' },
  { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
];

/** A fake model that plays one scripted stream per LLM step. */
export const scriptedModel = (...steps: LanguageModelV4StreamPart[][]) =>
  new MockLanguageModelV4({
    doStream: steps.map((chunks) => ({ stream: convertArrayToReadableStream(chunks) })),
  });

/** A fake model whose stream breaks after some text (LLM error mid-reply, AC2.3). */
export const failingModel = () =>
  new MockLanguageModelV4({
    doStream: async () => ({
      stream: new ReadableStream<LanguageModelV4StreamPart>({
        start(c) {
          c.enqueue({ type: 'stream-start', warnings: [] });
          c.enqueue({ type: 'text-start', id: 't' });
          c.enqueue({ type: 'text-delta', id: 't', delta: 'Here are ' });
          c.error(new Error('upstream 500'));
        },
      }),
    }),
  });

/** Parses an SSE body into its JSON events. */
export const parseSse = (body: string): { type: string; [k: string]: unknown }[] =>
  body
    .split('\n\n')
    .map((block) => block.replace(/^data: /, '').trim())
    .filter((data) => data && data !== '[DONE]')
    .map((data) => JSON.parse(data));
