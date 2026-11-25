import { randomUUID } from 'node:crypto';
import { createOpenAI } from '@ai-sdk/openai';
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
import { ChatController } from './presentation/chat.controller.js';

/** DI token for the language model, so tests can swap in MockLanguageModelV4. */
export const LANGUAGE_MODEL = Symbol('LANGUAGE_MODEL');

@Module({
  imports: [CatalogModule, ConversationsModule],
  controllers: [ChatController],
  providers: [
    {
      provide: LANGUAGE_MODEL,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): LanguageModel =>
        createOpenAI({ apiKey: config.openAiKey })(config.model),
    },
    {
      provide: LlmPort,
      inject: [LANGUAGE_MODEL],
      useFactory: (model: LanguageModel) => {
        const logger = new Logger('Assistant');
        return new AiSdkLlm(model, (message, error) =>
          logger.error(`${message}: ${error instanceof Error ? error.message : String(error)}`),
        );
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
