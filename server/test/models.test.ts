import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ApplicationSettingModel,
  BluetoothDeviceModel,
  MaintenanceModel,
  ScooterModel,
  TelemetryModel,
  UserModel,
} from '../src/models';
import { startTestApp } from './helpers';

let ctx: Awaited<ReturnType<typeof startTestApp>>;
const user = new mongoose.Types.ObjectId();
const now = new Date();

beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.stop());

describe('model validation', () => {
  it('Scooter requires a name, model and the sync timestamps', () => {
    const error = new ScooterModel({}).validateSync();
    expect(Object.keys(error?.errors ?? {})).toEqual(
      expect.arrayContaining([
        'user',
        'createdAt',
        'updatedAt',
        'name',
        'vehicleModel',
      ]),
    );
  });

  it('Scooter rejects negative odometer and trims text', () => {
    const scooter = new ScooterModel({
      user,
      createdAt: now,
      updatedAt: now,
      name: '  My Ntorq  ',
      vehicleModel: 'TVS Ntorq 125 Race XP',
      odometerKm: -1,
    });
    expect(scooter.name).toBe('My Ntorq');
    expect(scooter.validateSync()?.errors.odometerKm).toBeDefined();
  });

  it('Maintenance enforces ISO currency codes and known service types', () => {
    const base = {
      user,
      scooterId: randomUUID(),
      createdAt: now,
      updatedAt: now,
      date: '2026-01-01',
    };
    const record = new MaintenanceModel({
      ...base,
      serviceType: 'turbo_boost',
      currency: 'rupees',
    });
    const errors = record.validateSync()?.errors ?? {};
    expect(errors.serviceType).toBeDefined();
    expect(errors.currency).toBeDefined();

    const ok = new MaintenanceModel({
      ...base,
      serviceType: 'oil_change',
      currency: 'INR',
    });
    expect(ok.validateSync()).toBeUndefined();
  });

  it('BluetoothDevice only accepts known characteristic properties', () => {
    const device = new BluetoothDeviceModel({
      user,
      scooterId: randomUUID(),
      services: [
        {
          uuid: 'svc',
          characteristics: [{ uuid: 'chr', properties: ['read', 'teleport'] }],
        },
      ],
    });
    const errors = Object.keys(device.validateSync()?.errors ?? {});
    expect(errors.some((path) => path.includes('properties'))).toBe(true);
  });
});

describe('model persistence', () => {
  it('keeps e-mail unique and lower-cased', async () => {
    await UserModel.create({
      email: 'Unique@Example.com',
      displayName: 'U',
      passwordHash: 'x',
    });
    await expect(
      UserModel.create({
        email: 'unique@example.com',
        displayName: 'U2',
        passwordHash: 'x',
      }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('never selects the password hash by default', async () => {
    await UserModel.create({
      email: 'hidden@example.com',
      displayName: 'H',
      passwordHash: 'secret-hash',
    });
    const found = await UserModel.findOne({
      email: 'hidden@example.com',
    }).lean();
    expect(found).not.toHaveProperty('passwordHash');
  });

  it('allows one setting value per user and key', async () => {
    await ApplicationSettingModel.create({
      user,
      key: 'units',
      value: 'metric',
    });
    await expect(
      ApplicationSettingModel.create({ user, key: 'units', value: 'imperial' }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('stores unavailable telemetry as null rather than zero', async () => {
    const sample = await TelemetryModel.create({
      user,
      scooterId: randomUUID(),
      timestamp: now,
      source: 'mock',
      verified: false,
      speedKmh: 42,
    });
    const stored = await TelemetryModel.findById(sample.id).lean();
    expect(stored).toMatchObject({
      speedKmh: 42,
      rpm: null,
      fuelPercent: null,
      batteryVolts: null,
      engineTempC: null,
      odometerKm: null,
      verified: false,
    });
  });

  it('rejects telemetry from an unknown source', async () => {
    await expect(
      TelemetryModel.create({
        user,
        scooterId: randomUUID(),
        timestamp: now,
        source: 'guess' as 'mock',
        verified: false,
      }),
    ).rejects.toThrow(/source/);
  });
});
