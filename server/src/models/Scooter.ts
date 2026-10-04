import { model, Schema } from 'mongoose';
import {
  addSyncIndexes,
  nullableNumber,
  syncableFields,
  syncableOptions,
  trimmed,
} from './common';

const scooterSchema = new Schema(
  {
    ...syncableFields,
    name: { type: String, required: true, trim: true, maxlength: 60 },
    vehicleModel: { type: String, required: true, trim: true, maxlength: 80 },
    modelYear: nullableNumber(2000, 2100),
    registrationNumber: trimmed(20),
    vin: trimmed(32),
    engineNumber: trimmed(32),
    odometerKm: nullableNumber(0, 2_000_000),
    odometerUpdatedAt: { type: Date, default: null },
  },
  syncableOptions,
);
addSyncIndexes(scooterSchema);

export const ScooterModel = model('Scooter', scooterSchema);
