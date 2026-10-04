import { z } from 'zod';
import { dateTime, optionalText } from './common';

export const MAX_PACKETS_PER_CAPTURE = 20_000;

export const capturedPacketSchema = z.object({
  timestamp: dateTime,
  direction: z.enum(['RX', 'TX']),
  serviceUuid: z.string().max(64).nullable().default(null),
  characteristicUuid: z.string().min(1).max(64),
  hex: z
    .string()
    .max(2048)
    .regex(/^[0-9A-Fa-f ]*$/, 'Must be hexadecimal bytes.'),
  base64: z.string().max(2800),
  length: z.number().int().min(0).max(1024),
  rssi: z.number().int().min(-127).max(20).nullable().default(null),
});

export const protocolCaptureSchema = z.object({
  id: z.uuid().optional(),
  scooterId: z.uuid(),
  name: z.string().trim().min(1).max(100),
  deviceName: optionalText(80),
  startedAt: dateTime,
  endedAt: dateTime.nullable().default(null),
  notes: optionalText(2000),
  packets: z.array(capturedPacketSchema).max(MAX_PACKETS_PER_CAPTURE),
});

export const settingKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9._-]{1,64}$/, 'Invalid setting key.');

export const settingBodySchema = z.object({
  value: z
    .unknown()
    .refine((value) => JSON.stringify(value ?? null).length <= 16_384, {
      message: 'Setting value is too large (16 KB maximum).',
    }),
});
