import { Module } from '@nestjs/common';
import { AssistantModule } from './assistant/assistant.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { ConfigModule } from './shared/config/config.module.js';
import { HealthController } from './shared/health.controller.js';

@Module({
  imports: [ConfigModule, CatalogModule, ConversationsModule, AssistantModule],
  controllers: [HealthController],
})
export class AppModule {}
