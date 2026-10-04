import { SERVICE_ITEM_TYPES } from '@shared/constants';
import { model, Schema } from 'mongoose';
import {
  addSyncIndexes,
  nullableNumber,
  syncableFields,
  syncableOptions,
  trimmed,
} from './common';

const serviceReminderSchema = new Schema(
  {
    ...syncableFields,
    scooterId: { type: String, required: true, index: true },
    type: { type: String, enum: SERVICE_ITEM_TYPES, required: true },
    label: trimmed(60),
    enabled: { type: Boolean, required: true },
    intervalKm: nullableNumber(1, 200_000),
    intervalMonths: nullableNumber(1, 240),
    // Calendar dates are stored as YYYY-MM-DD strings (no time zone).
    lastServiceDate: { type: String, default: null },
    lastServiceKm: nullableNumber(0, 2_000_000),
    manualNextDueKm: nullableNumber(0, 2_000_000),
    manualNextDueDate: { type: String, default: null },
    notes: trimmed(1000),
  },
  syncableOptions,
);
addSyncIndexes(serviceReminderSchema);

export const ServiceReminderModel = model(
  'ServiceReminder',
  serviceReminderSchema,
);
