import type { ListResponse, ProtocolCaptureSummaryDTO } from '@shared/types';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { userIdOf } from '../middleware/auth';
import { ProtocolCaptureModel } from '../models';
import { AppError } from '../utils/AppError';
import { isDuplicateKeyError } from '../utils/mongo';
import { parse } from '../utils/validation';
import { idParam } from '../validators/common';
import { protocolCaptureSchema } from '../validators/protocol';
import { toDto } from './syncResource.controller';

export async function createCapture(req: Request, res: Response) {
  const userId = userIdOf(req);
  const { id, ...input } = parse(protocolCaptureSchema, req.body, 'capture');
  try {
    const created = await ProtocolCaptureModel.create({
      ...input,
      _id: id ?? randomUUID(),
      user: userId,
    });
    res
      .status(201)
      .json({ item: toDto(created.toObject() as Record<string, unknown>) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw AppError.conflict('Capture id already exists.');
    }
    throw error;
  }
}

/** Lists captures without their packets (which can be large). */
export async function listCaptures(req: Request, res: Response) {
  const rows = await ProtocolCaptureModel.aggregate([
    { $match: { user: new Types.ObjectId(userIdOf(req)) } },
    { $sort: { createdAt: -1 } },
    { $limit: 200 },
    {
      $project: {
        scooterId: 1,
        name: 1,
        deviceName: 1,
        startedAt: 1,
        endedAt: 1,
        notes: 1,
        createdAt: 1,
        packetCount: { $size: '$packets' },
      },
    },
  ]);
  const body: ListResponse<ProtocolCaptureSummaryDTO> = {
    items: rows.map(
      (row) => toDto(row) as unknown as ProtocolCaptureSummaryDTO,
    ),
    cursor: null,
  };
  res.json(body);
}

export async function getCapture(req: Request, res: Response) {
  const id = parse(idParam, req.params.id, 'id');
  const capture = await ProtocolCaptureModel.findOne({
    _id: id,
    user: userIdOf(req),
  }).lean();
  if (!capture) throw AppError.notFound('Capture');
  res.json({ item: toDto(capture as Record<string, unknown>) });
}
