import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // No HTTP server is needed; the bot runs as a worker process.
  // nestjs-telegraf launches the bot during application bootstrap.
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  logger.log('Project Quartermaster bot is running (v0.2.0)');
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Project Quartermaster:', error);
  process.exit(1);
});
