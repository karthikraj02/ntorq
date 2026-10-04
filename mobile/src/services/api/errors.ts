import type { ApiErrorBody } from '@shared/types';
import axios from 'axios';

export type FailureKind =
  | 'offline'
  | 'timeout'
  | 'session-expired'
  | 'unauthorized'
  | 'rate-limited'
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'server'
  | 'unknown';

/** A failed API call, reduced to what the app needs to decide and to tell the user. */
export class ApiFailure extends Error {
  constructor(
    readonly kind: FailureKind,
    readonly userMessage: string,
    readonly status: number | null = null,
  ) {
    super(userMessage);
    this.name = 'ApiFailure';
  }

  /** Worth retrying later without changing anything (server or network trouble). */
  get isRetryable(): boolean {
    return (
      this.kind === 'offline' ||
      this.kind === 'timeout' ||
      this.kind === 'server' ||
      this.kind === 'rate-limited'
    );
  }
}

const MESSAGES = {
  offline:
    'Cannot reach the server. Check your internet connection and the backend address in Settings.',
  timeout: 'The server took too long to respond. Please try again.',
  sessionExpired: 'Your session has expired. Please sign in again.',
  rateLimited: 'Too many requests. Please wait a moment and try again.',
  server:
    'The server had a problem. Your data is safe on this phone; it will sync later.',
  unknown: 'Something went wrong. Please try again.',
} as const;

export function toApiFailure(error: unknown): ApiFailure {
  if (error instanceof ApiFailure) return error;

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const body = error.response?.data as Partial<ApiErrorBody> | undefined;
    const serverMessage = body?.error?.message;

    if (status === null) {
      return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
        ? new ApiFailure('timeout', MESSAGES.timeout)
        : new ApiFailure('offline', MESSAGES.offline);
    }
    if (status === 401) {
      // Expired tokens say so explicitly; any other 401 (e.g. a wrong password
      // on the sign-in form) keeps the server's own wording.
      return body?.error?.code === 'TOKEN_EXPIRED' || !serverMessage
        ? new ApiFailure('session-expired', MESSAGES.sessionExpired, status)
        : new ApiFailure('unauthorized', serverMessage, status);
    }
    if (status === 429)
      return new ApiFailure('rate-limited', MESSAGES.rateLimited, status);
    if (status === 404) {
      return new ApiFailure('not-found', serverMessage ?? 'Not found.', status);
    }
    if (status === 409) {
      return new ApiFailure(
        'conflict',
        serverMessage ?? 'This item already exists.',
        status,
      );
    }
    if (status >= 400 && status < 500) {
      return new ApiFailure(
        'validation',
        serverMessage ?? 'The server rejected the request.',
        status,
      );
    }
    return new ApiFailure('server', MESSAGES.server, status);
  }

  return new ApiFailure('unknown', MESSAGES.unknown);
}
