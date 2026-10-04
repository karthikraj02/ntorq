import type { NextFunction, Request, Response } from 'express';
import type { TokenService } from '../services/token.service';
import { AppError } from '../utils/AppError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string };
    }
  }
}

/** Rejects the request unless it carries a valid `Authorization: Bearer` access token. */
export function createRequireAuth(tokens: TokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    const match = header ? /^Bearer (\S+)$/.exec(header) : null;
    if (!match?.[1]) {
      throw AppError.unauthorized();
    }
    req.auth = tokens.verifyAccessToken(match[1]);
    next();
  };
}

export function userIdOf(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.userId;
}
