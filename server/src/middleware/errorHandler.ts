import type { ApiErrorBody } from '@shared/types';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { isDuplicateKeyError } from '../utils/mongo';

function body(
  code: ApiErrorBody['error']['code'],
  message: string,
  details?: unknown,
): ApiErrorBody {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(body('NOT_FOUND', 'Route not found.'));
};

/** Turns every thrown error into the documented `{ error: { code, message } }` shape. */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    res
      .status(error.status)
      .json(body(error.code, error.message, error.details));
    return;
  }

  const type = (error as { type?: string } | null)?.type;
  if (type === 'entity.too.large') {
    res
      .status(413)
      .json(body('VALIDATION_ERROR', 'Request body is too large.'));
    return;
  }
  if (type === 'entity.parse.failed') {
    res
      .status(400)
      .json(body('VALIDATION_ERROR', 'Request body is not valid JSON.'));
    return;
  }

  const name = (error as { name?: string } | null)?.name;
  if (name === 'ValidationError' || name === 'CastError') {
    res.status(400).json(body('VALIDATION_ERROR', 'Invalid data.'));
    return;
  }
  if (isDuplicateKeyError(error)) {
    res.status(409).json(body('CONFLICT', 'Resource already exists.'));
    return;
  }

  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    name,
    message: error instanceof Error ? error.message : String(error),
  });
  res
    .status(500)
    .json(body('INTERNAL_ERROR', 'Something went wrong on the server.'));
};
