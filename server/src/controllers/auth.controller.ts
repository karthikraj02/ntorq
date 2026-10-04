import type { AuthResponseDTO, UserDTO } from '@shared/types';
import type { Request, Response } from 'express';
import { UserModel } from '../models';
import type { PasswordService } from '../services/password.service';
import type { TokenService } from '../services/token.service';
import { AppError } from '../utils/AppError';
import { isDuplicateKeyError } from '../utils/mongo';
import { parse } from '../utils/validation';
import { loginSchema, refreshSchema, registerSchema } from '../validators/auth';

interface UserLike {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

export function toUserDto(user: UserLike): UserDTO {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  };
}

const INVALID_CREDENTIALS = 'Invalid email or password.';

export function createAuthController(deps: {
  tokens: TokenService;
  passwords: PasswordService;
}) {
  const { tokens, passwords } = deps;

  return {
    async register(req: Request, res: Response) {
      const input = parse(registerSchema, req.body, 'registration');
      const passwordHash = await passwords.hash(input.password);
      try {
        const user = await UserModel.create({
          email: input.email,
          displayName: input.displayName,
          passwordHash,
        });
        const body: AuthResponseDTO = {
          user: toUserDto(user),
          tokens: await tokens.issue(user.id),
        };
        res.status(201).json(body);
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw AppError.conflict('An account with this email already exists.');
        }
        throw error;
      }
    },

    async login(req: Request, res: Response) {
      const input = parse(loginSchema, req.body, 'login');
      const user = await UserModel.findOne({ email: input.email }).select(
        '+passwordHash',
      );
      if (!user) {
        await passwords.verifyDummy(input.password);
        throw AppError.unauthorized(INVALID_CREDENTIALS);
      }
      if (!(await passwords.verify(user.passwordHash, input.password))) {
        throw AppError.unauthorized(INVALID_CREDENTIALS);
      }
      await UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
      const body: AuthResponseDTO = {
        user: toUserDto(user),
        tokens: await tokens.issue(user.id),
      };
      res.json(body);
    },

    async refresh(req: Request, res: Response) {
      const input = parse(refreshSchema, req.body, 'refresh request');
      const { userId, tokens: rotated } = await tokens.rotate(
        input.refreshToken,
      );
      const user = await UserModel.findById(userId);
      if (!user) throw AppError.unauthorized();
      const body: AuthResponseDTO = {
        user: toUserDto(user),
        tokens: rotated,
      };
      res.json(body);
    },

    async logout(req: Request, res: Response) {
      const input = parse(refreshSchema, req.body, 'logout request');
      await tokens.revoke(input.refreshToken);
      res.status(204).end();
    },
  };
}
