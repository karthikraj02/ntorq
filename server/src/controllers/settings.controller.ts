import type { ApplicationSettingDTO } from '@shared/types';
import type { Request, Response } from 'express';
import { userIdOf } from '../middleware/auth';
import { ApplicationSettingModel } from '../models';
import { parse } from '../utils/validation';
import { settingBodySchema, settingKeySchema } from '../validators/protocol';

interface StoredSetting {
  key: string;
  value: unknown;
  updatedAt: Date;
}

function toSettingDto(doc: StoredSetting): ApplicationSettingDTO {
  return {
    key: doc.key,
    value: doc.value,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listSettings(req: Request, res: Response) {
  const docs = await ApplicationSettingModel.find({ user: userIdOf(req) })
    .sort({ key: 1 })
    .lean();
  res.json({ items: docs.map((doc) => toSettingDto(doc as StoredSetting)) });
}

export async function putSetting(req: Request, res: Response) {
  const key = parse(settingKeySchema, req.params.key, 'setting key');
  const { value } = parse(settingBodySchema, req.body, 'setting');
  const doc = await ApplicationSettingModel.findOneAndUpdate(
    { user: userIdOf(req), key },
    { $set: { value: value ?? null } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  res.json({ item: toSettingDto(doc as StoredSetting) });
}
