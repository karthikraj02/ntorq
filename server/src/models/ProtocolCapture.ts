import { randomUUID } from 'node:crypto';
import { model, Schema } from 'mongoose';
import { nullableNumber, trimmed } from './common';

const packetSchema = new Schema(
  {
    timestamp: { type: Date, required: true },
    direction: { type: String, enum: ['RX', 'TX'], required: true },
    serviceUuid: { type: String, default: null, maxlength: 64 },
    characteristicUuid: { type: String, required: true, maxlength: 64 },
    hex: { type: String, required: true, maxlength: 2048 },
    base64: { type: String, required: true, maxlength: 2800 },
    length: { type: Number, required: true, min: 0, max: 1024 },
    rssi: nullableNumber(-127, 20),
  },
  { _id: false },
);

/**
 * A recorded session of raw Bluetooth traffic, kept so the protocol can be
 * analysed offline. Packets are stored verbatim and never interpreted here.
 */
const protocolCaptureSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scooterId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    deviceName: trimmed(80),
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    notes: trimmed(2000),
    packets: [packetSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);
protocolCaptureSchema.index({ user: 1, createdAt: -1 });

export const ProtocolCaptureModel = model(
  'ProtocolCapture',
  protocolCaptureSchema,
);
