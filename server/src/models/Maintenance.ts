import { SERVICE_ITEM_TYPES } from '@shared/constants';
import { model, Schema } from 'mongoose';
import {
  addSyncIndexes,
  nullableNumber,
  syncableFields,
  syncableOptions,
  trimmed,
} from './common';

const maintenanceSchema = new Schema(
  {
    ...syncableFields,
    scooterId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    mileageKm: nullableNumber(0, 2_000_000),
    serviceType: { type: String, enum: SERVICE_ITEM_TYPES, required: true },
    partsReplaced: trimmed(500),
    oilType: trimmed(80),
    oilQuantityLitres: nullableNumber(0, 50),
    cost: nullableNumber(0, 10_000_000),
    currency: { type: String, required: true, match: /^[A-Z]{3}$/ },
    workshop: trimmed(120),
    notes: trimmed(2000),
  },
  syncableOptions,
);
addSyncIndexes(maintenanceSchema);

export const MaintenanceModel = model('Maintenance', maintenanceSchema);
