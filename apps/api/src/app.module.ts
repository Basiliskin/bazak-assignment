import { Module } from '@nestjs/common';
import { ConfigModule } from './shared/config/config.module.js';
import { HealthController } from './shared/health.controller.js';

@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
})
export class AppModule {}
