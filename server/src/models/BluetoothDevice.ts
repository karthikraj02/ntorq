import { CHARACTERISTIC_PROPERTIES } from '@shared/types';
import { randomUUID } from 'node:crypto';
import { model, Schema } from 'mongoose';
import { nullableNumber, trimmed } from './common';

const characteristicSchema = new Schema(
  {
    uuid: { type: String, required: true, maxlength: 64 },
    properties: [{ type: String, enum: CHARACTERISTIC_PROPERTIES }],
  },
  { _id: false },
);

const serviceSchema = new Schema(
  {
    uuid: { type: String, required: true, maxlength: 64 },
    characteristics: [characteristicSchema],
  },
  { _id: false },
);

/** Bluetooth device metadata and the services/characteristics discovered on it. */
const bluetoothDeviceSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    scooterId: { type: String, required: true },
    name: trimmed(80),
    address: trimmed(64),
    transport: {
      type: String,
      enum: ['ble', 'classic', 'unknown'],
      default: 'unknown',
    },
    lastRssi: nullableNumber(-127, 20),
    services: [serviceSchema],
    lastConnectedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);
bluetoothDeviceSchema.index({ user: 1, scooterId: 1 });

export const BluetoothDeviceModel = model(
  'BluetoothDevice',
  bluetoothDeviceSchema,
);
