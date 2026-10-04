import type { z } from 'zod';
import { AppError } from './AppError';

/** Parses `data` with `schema` or throws a 400 AppError listing the problems. */
export function parse<S extends z.ZodType>(
  schema: S,
  data: unknown,
  what = 'request',
): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw AppError.validation(`Invalid ${what}.`, issues);
  }
  return result.data;
}
