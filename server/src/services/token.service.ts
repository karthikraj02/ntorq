import type { AuthTokensDTO } from '@shared/types';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../config/env';
import { RefreshTokenModel } from '../models';
import { AppError } from '../utils/AppError';

const ISSUER = 'ntorq-companion';
const ALGORITHM = 'HS256';

interface AccessPayload extends jwt.JwtPayload {
  sub: string;
  type: 'access';
}

interface RefreshPayload extends jwt.JwtPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export interface TokenService {
  issue(userId: string): Promise<AuthTokensDTO>;
  verifyAccessToken(token: string): { userId: string };
  /** Exchanges a refresh token for a new pair; the old one is revoked. */
  rotate(
    refreshToken: string,
  ): Promise<{ userId: string; tokens: AuthTokensDTO }>;
  revoke(refreshToken: string): Promise<void>;
}

type Config = Pick<
  AppConfig,
  | 'jwtSecret'
  | 'jwtRefreshSecret'
  | 'accessTokenTtlSeconds'
  | 'refreshTokenTtlDays'
>;

export function createTokenService(config: Config): TokenService {
  function signAccess(userId: string): { token: string; expiresAt: Date } {
    const token = jwt.sign({ type: 'access' }, config.jwtSecret, {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      subject: userId,
      expiresIn: config.accessTokenTtlSeconds,
    });
    const { exp } = jwt.decode(token) as jwt.JwtPayload;
    return { token, expiresAt: new Date((exp ?? 0) * 1000) };
  }

  async function signRefresh(userId: string): Promise<string> {
    const jti = randomUUID();
    const expiresAt = new Date(
      Date.now() + config.refreshTokenTtlDays * 86_400_000,
    );
    await RefreshTokenModel.create({ _id: jti, user: userId, expiresAt });
    return jwt.sign({ type: 'refresh' }, config.jwtRefreshSecret, {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      subject: userId,
      jwtid: jti,
      expiresIn: config.refreshTokenTtlDays * 86_400,
    });
  }

  function verifyRefresh(token: string): RefreshPayload {
    try {
      const payload = jwt.verify(token, config.jwtRefreshSecret, {
        algorithms: [ALGORITHM],
        issuer: ISSUER,
      }) as RefreshPayload;
      if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
        throw new Error('wrong token type');
      }
      return payload;
    } catch {
      throw AppError.unauthorized('Session expired. Please sign in again.');
    }
  }

  async function issue(userId: string): Promise<AuthTokensDTO> {
    const access = signAccess(userId);
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken: await signRefresh(userId),
    };
  }

  return {
    issue,

    verifyAccessToken(token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret, {
          algorithms: [ALGORITHM],
          issuer: ISSUER,
        }) as AccessPayload;
        if (payload.type !== 'access' || !payload.sub) {
          throw AppError.unauthorized('Invalid access token.');
        }
        return { userId: payload.sub };
      } catch (error) {
        if (error instanceof AppError) throw error;
        if (error instanceof jwt.TokenExpiredError)
          throw AppError.tokenExpired();
        throw AppError.unauthorized('Invalid access token.');
      }
    },

    async rotate(refreshToken) {
      const payload = verifyRefresh(refreshToken);
      const stored = await RefreshTokenModel.findById(payload.jti);
      if (!stored || stored.user.toString() !== payload.sub) {
        throw AppError.unauthorized('Session expired. Please sign in again.');
      }

      const tokens = await issue(payload.sub);
      const newJti = (jwt.decode(tokens.refreshToken) as jwt.JwtPayload).jti;
      // Revoke atomically: if this token was already used, someone is replaying it.
      const claimed = await RefreshTokenModel.findOneAndUpdate(
        { _id: payload.jti, revokedAt: null },
        { revokedAt: new Date(), replacedBy: newJti },
      );
      if (!claimed) {
        await RefreshTokenModel.updateMany(
          { user: payload.sub, revokedAt: null },
          { revokedAt: new Date() },
        );
        throw AppError.unauthorized('Session expired. Please sign in again.');
      }
      return { userId: payload.sub, tokens };
    },

    async revoke(refreshToken) {
      try {
        const payload = verifyRefresh(refreshToken);
        await RefreshTokenModel.updateOne(
          { _id: payload.jti, revokedAt: null },
          { revokedAt: new Date() },
        );
      } catch {
        // Logging out with an already-invalid token is not an error.
      }
    },
  };
}
