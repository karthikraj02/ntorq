import { z } from 'zod';

const flag = z
  .enum(['0', '1', 'true', 'false'])
  .transform((value) => value === '1' || value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    LOG_LEVEL: z
      .enum(['debug', 'info', 'warn', 'error', 'silent'])
      .default('info'),
    MONGODB_URI: z.string({ error: 'is required' }).min(1, 'is required'),
    JWT_SECRET: z
      .string({ error: 'is required' })
      .min(32, 'must be at least 32 characters'),
    JWT_REFRESH_SECRET: z
      .string({ error: 'is required' })
      .min(32, 'must be at least 32 characters'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(86_400)
      .default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    CORS_ORIGIN: z.string().default(''),
    TRUST_PROXY: flag.default(false),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  })
  .refine((env) => env.JWT_SECRET !== env.JWT_REFRESH_SECRET, {
    path: ['JWT_REFRESH_SECRET'],
    message: 'must differ from JWT_SECRET',
  });

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  mongodbUri: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
  corsOrigins: string[];
  trustProxy: boolean;
  rateLimit: { windowMs: number; max: number; authMax: number };
}

/**
 * Validates environment variables. The thrown message lists variable names and
 * problems only - never the values, which may be secrets.
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid server configuration. Check server/.env (see .env.example):\n${problems}`,
    );
  }
  const env = parsed.data;
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    mongodbUri: env.MONGODB_URI,
    jwtSecret: env.JWT_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    corsOrigins: env.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: env.TRUST_PROXY,
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      authMax: env.AUTH_RATE_LIMIT_MAX,
    },
  };
}
