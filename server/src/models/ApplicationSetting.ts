import { model, Schema } from 'mongoose';

const applicationSettingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, required: true, trim: true, maxlength: 64 },
    value: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true }, versionKey: false },
);
applicationSettingSchema.index({ user: 1, key: 1 }, { unique: true });

export const ApplicationSettingModel = model(
  'ApplicationSetting',
  applicationSettingSchema,
);
