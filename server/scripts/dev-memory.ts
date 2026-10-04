/**
 * Runs the API against a throw-away in-memory MongoDB so you can try the app
 * without installing a database. All data is lost when this process stops.
 *
 *   npm run dev:memory
 */
import { randomBytes } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { loadConfig } from '../src/config/env';
import { startServer } from '../src/server';

const mongo = await MongoMemoryServer.create();
const secret = () => randomBytes(32).toString('hex');

const config = loadConfig({
  ...process.env,
  NODE_ENV: 'development',
  MONGODB_URI: mongo.getUri('ntorq-companion-dev'),
  JWT_SECRET: process.env.JWT_SECRET ?? secret(),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? secret(),
  // Local development is often tested from one IP, so don't throttle logins hard.
  AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX ?? '200',
});

console.log('Using an in-memory MongoDB (data is NOT persisted).');
await startServer(config);

const stop = () => void mongo.stop();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
