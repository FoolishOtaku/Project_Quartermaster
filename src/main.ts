import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** Read the version from package.json so the banner never drifts from the release. */
function appVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
    ) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  // No HTTP server is needed; the bot runs as a worker process.
  // nestjs-telegraf launches the bot during application bootstrap.
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  logger.log(`Project Quartermaster bot is running (v${appVersion()})`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Project Quartermaster:', error);
  process.exit(1);
});
