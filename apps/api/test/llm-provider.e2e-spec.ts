import { describe, expect, it } from 'vitest';
import { LlmPort } from '../src/assistant/application/llm.port.js';
import { AiSdkLlm } from '../src/assistant/infrastructure/ai-sdk.llm.js';
import { AnthropicLlm } from '../src/assistant/infrastructure/anthropic.llm.js';
import { createTestApp } from './support/create-test-app.js';

/** LLM_PROVIDER picks the adapter; building it calls no model (Anthropic credentials resolve on the first request). */
describe('LLM_PROVIDER wiring', () => {
  it.each([
    ['openai', AiSdkLlm],
    ['anthropic', AnthropicLlm],
  ] as const)('%s → %s', async (llmProvider, Adapter) => {
    const app = await createTestApp({ config: { llmProvider } });
    expect(app.get(LlmPort)).toBeInstanceOf(Adapter);
    await app.close();
  });
});
