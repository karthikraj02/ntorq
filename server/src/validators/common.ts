import { z } from 'zod';

export const dateTime = z.iso.datetime({ offset: true });
export const isoDate = z.iso.date();

export const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().default(null);

export const nullableNumber = (min: number, max: number) =>
  z.number().min(min).max(max).nullable().default(null);

export const nullableInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullable().default(null);

/** Fields every synchronised record carries (generated on the phone). */
export const syncMeta = z.object({
  id: z.uuid(),
  createdAt: dateTime,
  updatedAt: dateTime,
  deletedAt: dateTime.nullable().default(null),
});

export const idParam = z.uuid();
