import { Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module.js';
import { ConfigModule } from './shared/config/config.module.js';
import { HealthController } from './shared/health.controller.js';

@Module({
  imports: [ConfigModule, CatalogModule],
  controllers: [HealthController],
})
export class AppModule {}
