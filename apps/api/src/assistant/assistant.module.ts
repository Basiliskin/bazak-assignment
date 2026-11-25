import { randomUUID } from 'node:crypto';
import { createOpenAI } from '@ai-sdk/openai';
import Anthropic from '@anthropic-ai/sdk';
import { Logger, Module } from '@nestjs/common';
import type { LanguageModel } from 'ai';
import { CatalogService } from '../catalog/application/catalog.service.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { ConversationRepository } from '../conversations/application/conversation.repository.js';
import { ConversationsModule } from '../conversations/conversations.module.js';
import { APP_CONFIG } from '../shared/config/config.module.js';
import type { AppConfig } from '../shared/config/app-config.js';
import { ChatTurnService } from './application/chat-turn.service.js';
import { LlmPort } from './application/llm.port.js';
import { AiSdkLlm } from './infrastructure/ai-sdk.llm.js';
import { AnthropicLlm } from './infrastructure/anthropic.llm.js';
import { ChatController } from './presentation/chat.controller.js';

/** DI token for the AI SDK language model, so tests can swap in MockLanguageModelV4. Null with the anthropic provider. */
export const LANGUAGE_MODEL = Symbol('LANGUAGE_MODEL');

@Module({
  imports: [CatalogModule, ConversationsModule],
  controllers: [ChatController],
  providers: [
    {
      provide: LANGUAGE_MODEL,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): LanguageModel | null =>
        config.llmProvider === 'openai'
          ? createOpenAI({ apiKey: config.openAiKey ?? '', baseURL: config.openAiBaseUrl ?? undefined })(
              config.model,
            )
          : null,
    },
    {
      provide: LlmPort,
      inject: [APP_CONFIG, LANGUAGE_MODEL],
      useFactory: (config: AppConfig, model: LanguageModel | null) => {
        const logger = new Logger('Assistant');
        const logError = (message: string, error: unknown) =>
          logger.error(`${message}: ${error instanceof Error ? error.message : String(error)}`);
        if (config.llmProvider === 'anthropic') {
          // Credentials come from the environment: ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile.
          const client = new Anthropic({ baseURL: config.anthropicBaseUrl ?? undefined });
          logger.warn(
            `LLM_PROVIDER=anthropic (${config.model}) — local development only; the assignment allows gpt-6-luna`,
          );
          return new AnthropicLlm((params) => client.messages.stream(params), config.model, logError);
        }
        if (!model) throw new Error('LANGUAGE_MODEL is missing for the openai provider');
        return new AiSdkLlm(model, logError);
      },
    },
    {
      provide: ChatTurnService,
      inject: [APP_CONFIG, ConversationRepository, CatalogService, LlmPort],
      useFactory: (config: AppConfig, repo: ConversationRepository, catalog: CatalogService, llm: LlmPort) =>
        new ChatTurnService(
          repo,
          catalog,
          llm,
          { now: () => new Date().toISOString(), newId: randomUUID },
          config.catalogMode,
        ),
    },
  ],
})
export class AssistantModule {}
