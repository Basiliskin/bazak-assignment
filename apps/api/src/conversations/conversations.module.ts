import { Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { APP_CONFIG } from '../shared/config/config.module.js';
import type { AppConfig } from '../shared/config/app-config.js';
import { ConversationRepository } from './application/conversation.repository.js';
import { ConversationsService } from './application/conversations.service.js';
import { SqliteConversationRepository } from './infrastructure/sqlite.conversation-repository.js';
import { ConversationsController } from './presentation/conversations.controller.js';

@Module({
  controllers: [ConversationsController],
  providers: [
    {
      provide: ConversationRepository,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => {
        const logger = new Logger('Conversations');
        return SqliteConversationRepository.open(config.databasePath, (m) => logger.warn(m));
      },
    },
    {
      provide: ConversationsService,
      inject: [ConversationRepository],
      useFactory: (repo: ConversationRepository) => new ConversationsService(repo),
    },
  ],
  exports: [ConversationRepository, ConversationsService],
})
export class ConversationsModule implements OnApplicationShutdown {
  constructor(@Inject(ConversationRepository) private readonly repository: ConversationRepository) {}

  onApplicationShutdown(): void {
    if (this.repository instanceof SqliteConversationRepository) this.repository.close();
  }
}
