import type { Server } from 'node:http';
import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import type { AppConfig } from './config/env';
import { logger } from './utils/logger';

/** Connects to MongoDB, starts listening, and shuts down cleanly on SIGINT/SIGTERM. */
export async function startServer(config: AppConfig): Promise<Server> {
  await connectDatabase(config.mongodbUri);
  const app = createApp(config);

  const server = await new Promise<Server>((resolve, reject) => {
    const listening = app.listen(config.port, () => resolve(listening));
    listening.once('error', reject);
  });
  logger.info(`Ntorq Companion API listening on port ${config.port}`, {
    env: config.nodeEnv,
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}
