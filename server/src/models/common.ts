import { randomUUID } from 'node:crypto';
import { Schema } from 'mongoose';

/** Fields shared by every record the phone creates offline and syncs. */
export const syncableFields = {
  _id: { type: String, default: () => randomUUID() },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
  deletedAt: { type: Date, default: null },
};

/**
 * The client owns createdAt/updatedAt (they drive last-write-wins). Mongoose
 * only tracks `serverUpdatedAt`, which is the cursor used when pulling changes.
 */
export const syncableOptions = {
  timestamps: { createdAt: false, updatedAt: 'serverUpdatedAt' },
  versionKey: false,
} as const;

export function addSyncIndexes(schema: Schema): void {
  schema.index({ user: 1, serverUpdatedAt: 1 });
}

export const trimmed = (maxlength: number) => ({
  type: String,
  default: null,
  trim: true,
  maxlength,
});

export const nullableNumber = (min: number, max: number) => ({
  type: Number,
  default: null,
  min,
  max,
});
