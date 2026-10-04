import type { ApiErrorBody } from '@shared/types';
import { rateLimit } from 'express-rate-limit';
import type { AppConfig } from '../config/env';

const limitedBody: ApiErrorBody = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please try again later.',
  },
};

export function createRateLimiters(config: Pick<AppConfig, 'rateLimit'>) {
  const shared = {
    windowMs: config.rateLimit.windowMs,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: limitedBody,
  } as const;

  return {
    general: rateLimit({ ...shared, limit: config.rateLimit.max }),
    auth: rateLimit({ ...shared, limit: config.rateLimit.authMax }),
  };
}
