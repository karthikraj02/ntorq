import { SERVICE_ITEM_TYPES } from '@shared/constants';
import { DIAGNOSTIC_SEVERITIES, DIAGNOSTIC_SOURCES } from '@shared/types';
import { z } from 'zod';
import {
  dateTime,
  isoDate,
  nullableInt,
  nullableNumber,
  optionalText,
  syncMeta,
} from './common';

/**
 * Each synchronised resource has an `upsert` schema (full record, used by
 * PUT /:id) and a `create` schema (POST /) where the server fills in the
 * id and timestamps when the caller omits them.
 */
function resource<T extends z.ZodRawShape>(fields: T) {
  const upsert = syncMeta.extend(fields);
  const create = syncMeta
    .partial({ id: true, createdAt: true, updatedAt: true })
    .extend(fields);
  return { upsert, create };
}

export const scooterSchemas = resource({
  name: z.string().trim().min(1).max(60),
  vehicleModel: z.string().trim().min(1).max(80),
  modelYear: nullableInt(2000, 2100),
  registrationNumber: optionalText(20),
  vin: optionalText(32),
  engineNumber: optionalText(32),
  odometerKm: nullableNumber(0, 2_000_000),
  odometerUpdatedAt: dateTime.nullable().default(null),
});

export const serviceReminderSchemas = resource({
  scooterId: z.uuid(),
  type: z.enum(SERVICE_ITEM_TYPES),
  label: optionalText(60),
  enabled: z.boolean(),
  intervalKm: nullableInt(1, 200_000),
  intervalMonths: nullableInt(1, 240),
  lastServiceDate: isoDate.nullable().default(null),
  lastServiceKm: nullableNumber(0, 2_000_000),
  manualNextDueKm: nullableNumber(0, 2_000_000),
  manualNextDueDate: isoDate.nullable().default(null),
  notes: optionalText(1000),
});

export const maintenanceSchemas = resource({
  scooterId: z.uuid(),
  date: isoDate,
  mileageKm: nullableNumber(0, 2_000_000),
  serviceType: z.enum(SERVICE_ITEM_TYPES),
  partsReplaced: optionalText(500),
  oilType: optionalText(80),
  oilQuantityLitres: nullableNumber(0, 50),
  cost: nullableNumber(0, 10_000_000),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default('INR'),
  workshop: optionalText(120),
  notes: optionalText(2000),
});

export const rideSchemas = resource({
  scooterId: z.uuid(),
  source: z.enum(['vehicle', 'mock']),
  startedAt: dateTime,
  endedAt: dateTime,
  distanceKm: z.number().min(0).max(5000),
  ridingTimeSec: z.number().min(0).max(1_000_000),
  elapsedSec: z.number().min(0).max(1_000_000),
  averageSpeedKmh: nullableNumber(0, 400),
  maxSpeedKmh: nullableNumber(0, 400),
});

export const diagnosticSchemas = resource({
  scooterId: z.uuid(),
  code: z.string().trim().min(1).max(32),
  description: z.string().trim().max(500).default(''),
  severity: z.enum(DIAGNOSTIC_SEVERITIES),
  timestamp: dateTime,
  source: z.enum(DIAGNOSTIC_SOURCES),
  verified: z.boolean(),
  notes: optionalText(1000),
});
