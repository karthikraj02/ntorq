import { TELEMETRY_SOURCES } from '@shared/constants';
import { model, Schema } from 'mongoose';
import { nullableNumber } from './common';

/** Telemetry samples. Missing readings are stored as null, never as zero. */
const telemetrySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scooterId: { type: String, required: true },
    rideId: { type: String, default: null },
    timestamp: { type: Date, required: true },
    source: { type: String, enum: TELEMETRY_SOURCES, required: true },
    verified: { type: Boolean, required: true },
    speedKmh: nullableNumber(0, 400),
    rpm: nullableNumber(0, 30_000),
    fuelPercent: nullableNumber(0, 100),
    batteryVolts: nullableNumber(0, 60),
    engineTempC: nullableNumber(-60, 400),
    odometerKm: nullableNumber(0, 2_000_000),
  },
  { versionKey: false },
);
telemetrySchema.index({ user: 1, scooterId: 1, timestamp: -1 });
telemetrySchema.index({ user: 1, rideId: 1, timestamp: 1 });

export const TelemetryModel = model('Telemetry', telemetrySchema);
