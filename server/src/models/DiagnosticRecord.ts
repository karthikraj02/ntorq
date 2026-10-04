import { DIAGNOSTIC_SEVERITIES, DIAGNOSTIC_SOURCES } from '@shared/types';
import { model, Schema } from 'mongoose';
import {
  addSyncIndexes,
  syncableFields,
  syncableOptions,
  trimmed,
} from './common';

const diagnosticRecordSchema = new Schema(
  {
    ...syncableFields,
    scooterId: { type: String, required: true, index: true },
    code: { type: String, required: true, trim: true, maxlength: 32 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    severity: { type: String, enum: DIAGNOSTIC_SEVERITIES, required: true },
    timestamp: { type: Date, required: true },
    source: { type: String, enum: DIAGNOSTIC_SOURCES, required: true },
    verified: { type: Boolean, required: true },
    notes: trimmed(1000),
  },
  syncableOptions,
);
addSyncIndexes(diagnosticRecordSchema);

export const DiagnosticRecordModel = model(
  'DiagnosticRecord',
  diagnosticRecordSchema,
);
