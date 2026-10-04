import type { Request, Response } from 'express';
import { userIdOf } from '../middleware/auth';
import { UserModel } from '../models';
import { AppError } from '../utils/AppError';
import { toUserDto } from './auth.controller';

export async function getCurrentUser(req: Request, res: Response) {
  const user = await UserModel.findById(userIdOf(req));
  if (!user) throw AppError.unauthorized('Account no longer exists.');
  res.json({ user: toUserDto(user) });
}
