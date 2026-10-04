import type { ApiErrorCode } from '@shared/types';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }
  static unauthorized(message = 'Authentication required.'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static tokenExpired(): AppError {
    return new AppError(401, 'TOKEN_EXPIRED', 'Access token expired.');
  }
  static notFound(what = 'Resource'): AppError {
    return new AppError(404, 'NOT_FOUND', `${what} not found.`);
  }
  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }
}
