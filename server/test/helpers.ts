import { randomUUID } from 'node:crypto';
import http from 'node:http';
import mongoose from 'mongoose';
import request from 'supertest';
import { inject } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig, type AppConfig } from '../src/config/env';

export function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    ...loadConfig({
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://not-used-in-tests',
      JWT_SECRET: 'a'.repeat(40),
      JWT_REFRESH_SECRET: 'b'.repeat(40),
      LOG_LEVEL: 'silent',
      RATE_LIMIT_MAX: '100000',
      AUTH_RATE_LIMIT_MAX: '100000',
    }),
    ...overrides,
  };
}

const openServers = new Set<http.Server>();

/**
 * Mounts the real Express app on the current mongoose connection behind one
 * long-lived HTTP server. (Handing supertest a bare app makes it open and
 * close a socket server per request, which crashes Node intermittently on
 * Windows once a file makes a few hundred requests.)
 */
export async function mountApp(overrides: Partial<AppConfig> = {}) {
  const app = createApp(makeConfig(overrides));
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  openServers.add(server);
  return { app, api: request(server) };
}

async function closeServers() {
  await Promise.all(
    [...openServers].map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
  openServers.clear();
}

/** Connects to a fresh database and mounts the real Express app on it. */
export async function startTestApp(overrides: Partial<AppConfig> = {}) {
  const uri = `${inject('mongoUri')}ntorq_test_${randomUUID().slice(0, 8)}`;
  await mongoose.connect(uri);
  // Build indexes up-front so unique constraints are enforced from the first test.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  return {
    ...(await mountApp(overrides)),
    async stop() {
      await closeServers();
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    },
  };
}

export type TestApi = ReturnType<typeof request>;

export interface TestUser {
  userId: string;
  accessToken: string;
  refreshToken: string;
  auth: { Authorization: string };
}

export const PASSWORD = 'correct horse battery';

export async function registerUser(
  api: TestApi,
  email = `rider-${randomUUID().slice(0, 8)}@example.com`,
): Promise<TestUser> {
  const res = await api
    .post('/api/auth/register')
    .send({ email, password: PASSWORD, displayName: 'Test Rider' })
    .expect(201);
  return {
    userId: res.body.user.id,
    accessToken: res.body.tokens.accessToken,
    refreshToken: res.body.tokens.refreshToken,
    auth: { Authorization: `Bearer ${res.body.tokens.accessToken}` },
  };
}

const T0 = '2026-03-01T10:00:00.000Z';

export function scooterPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    createdAt: T0,
    updatedAt: T0,
    name: 'My Ntorq',
    vehicleModel: 'TVS Ntorq 125 Race XP',
    modelYear: 2024,
    registrationNumber: null,
    vin: null,
    engineNumber: null,
    odometerKm: 1200,
    odometerUpdatedAt: T0,
    ...overrides,
  };
}

export function reminderPayload(
  scooterId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: randomUUID(),
    createdAt: T0,
    updatedAt: T0,
    scooterId,
    type: 'oil_change',
    enabled: true,
    intervalKm: 3000,
    intervalMonths: 6,
    lastServiceDate: '2026-01-15',
    lastServiceKm: 900,
    ...overrides,
  };
}

export function maintenancePayload(
  scooterId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: randomUUID(),
    createdAt: T0,
    updatedAt: T0,
    scooterId,
    date: '2026-01-15',
    mileageKm: 900,
    serviceType: 'oil_change',
    oilType: '10W-30',
    oilQuantityLitres: 0.8,
    cost: 450,
    workshop: 'Local workshop',
    ...overrides,
  };
}

export function ridePayload(
  scooterId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: randomUUID(),
    createdAt: T0,
    updatedAt: T0,
    scooterId,
    source: 'vehicle',
    startedAt: '2026-03-01T09:00:00.000Z',
    endedAt: '2026-03-01T09:30:00.000Z',
    distanceKm: 12.4,
    ridingTimeSec: 1500,
    elapsedSec: 1800,
    averageSpeedKmh: 29.8,
    maxSpeedKmh: 61,
    ...overrides,
  };
}

export function diagnosticPayload(
  scooterId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id: randomUUID(),
    createdAt: T0,
    updatedAt: T0,
    scooterId,
    code: 'USER-ENTERED-01',
    description: 'Code typed in by the rider',
    severity: 'unknown',
    timestamp: T0,
    source: 'manual',
    verified: false,
    ...overrides,
  };
}
