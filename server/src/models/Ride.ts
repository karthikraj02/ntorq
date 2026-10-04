import { model, Schema } from 'mongoose';
import {
  addSyncIndexes,
  nullableNumber,
  syncableFields,
  syncableOptions,
} from './common';

const rideSchema = new Schema(
  {
    ...syncableFields,
    scooterId: { type: String, required: true, index: true },
    source: { type: String, enum: ['vehicle', 'mock'], required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    distanceKm: { type: Number, required: true, min: 0, max: 5000 },
    ridingTimeSec: { type: Number, required: true, min: 0, max: 1_000_000 },
    elapsedSec: { type: Number, required: true, min: 0, max: 1_000_000 },
    averageSpeedKmh: nullableNumber(0, 400),
    maxSpeedKmh: nullableNumber(0, 400),
  },
  syncableOptions,
);
addSyncIndexes(rideSchema);
rideSchema.index({ user: 1, startedAt: -1 });

export const RideModel = model('Ride', rideSchema);
