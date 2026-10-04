import { z } from 'zod';

export const emailSchema = z.email().max(254).trim().toLowerCase();

export const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters.')
    .max(128, 'Password must be at most 128 characters.'),
  displayName: z.string().trim().min(1).max(60),
});

export const loginSchema = z.object({
  email: emailSchema,
  // No length rule on login so policy changes never lock out existing users.
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(2048),
});
