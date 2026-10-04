import type { RequestHandler } from 'express';
import { logger } from '../utils/logger';

/** Logs method, path (never the query string), status and duration. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    logger.info(`${req.method} ${req.baseUrl}${req.path}`, {
      status: res.statusCode,
      ms: Math.round(ms),
    });
  });
  next();
};
