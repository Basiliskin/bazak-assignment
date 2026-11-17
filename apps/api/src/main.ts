import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { APP_CONFIG } from './shared/config/config.module.js';
import type { AppConfig } from './shared/config/app-config.js';
import { configureApp } from './shared/configure-app.js';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(AppModule));
  const { port } = app.get<AppConfig>(APP_CONFIG);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}/api`);
}

void bootstrap();
