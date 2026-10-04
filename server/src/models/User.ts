import { model, Schema } from 'mongoose';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    passwordHash: { type: String, required: true, select: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const UserModel = model('User', userSchema);
