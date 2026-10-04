import { model, Schema } from 'mongoose';

/**
 * One row per issued refresh token (keyed by its JWT id). Rows are kept after
 * rotation until they expire so a replayed token can be detected.
 */
const refreshTokenSchema = new Schema(
  {
    _id: { type: String, required: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

// Mongo removes expired rows automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);
