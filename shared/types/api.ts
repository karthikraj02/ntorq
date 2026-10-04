export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * `cursor` is the server-side change marker of the last item. Pass it back as
 * `updatedSince` to fetch only newer changes; `null` when the page is empty.
 */
export interface ListResponse<T> {
  items: T[];
  cursor: string | null;
}

/**
 * Result of an idempotent upsert. `applied` is false when the server already
 * held a newer version (last-write-wins); `item` is then the server's copy.
 */
export interface UpsertResponse<T> {
  item: T;
  applied: boolean;
}
