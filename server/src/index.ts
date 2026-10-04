import { existsSync } from 'node:fs';
import { loadConfig } from './config/env';
import { startServer } from './server';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

try {
  await startServer(loadConfig());
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
