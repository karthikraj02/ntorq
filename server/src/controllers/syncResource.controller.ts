import type { ListResponse, UpsertResponse } from '@shared/types';
import type { Request, Response } from 'express';
import type { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { userIdOf } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { isDuplicateKeyError } from '../utils/mongo';
import { parse } from '../utils/validation';
import { dateTime, idParam } from '../validators/common';

// The factory is shared by several unrelated collections, so the model is untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SyncModel = Model<any>;

interface SyncInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  [field: string]: unknown;
}

interface Options {
  model: SyncModel;
  /** Human-readable name used in error messages, e.g. "Maintenance record". */
  label: string;
  upsertSchema: z.ZodType<SyncInput>;
  createSchema: z.ZodType<Partial<SyncInput> & Record<string, unknown>>;
}

const listQuerySchema = z.object({
  updatedSince: dateTime.optional(),
  includeDeleted: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  scooterId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
});

/** Client clocks can be wrong; never trust a modification time far in the future. */
const MAX_CLOCK_SKEW_MS = 5 * 60_000;

function clampUpdatedAt(value: string): Date {
  return new Date(Math.min(Date.parse(value), Date.now() + MAX_CLOCK_SKEW_MS));
}

/** Maps a stored document to the public DTO (client id, no server-only fields). */
export function toDto(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, user: _user, serverUpdatedAt: _cursor, __v: _v, ...rest } = doc;
  return { id: _id, ...rest };
}

/**
 * CRUD handlers for records created offline on the phone.
 *
 *  - Ids are client-generated UUIDs, so PUT /:id is an idempotent upsert that
 *    the sync queue can safely retry.
 *  - Conflicts are resolved last-write-wins on the client's `updatedAt`: an
 *    older write never replaces a newer stored version.
 *  - DELETE is a soft delete (`deletedAt`) so deletions can be pulled by
 *    other devices.
 */
export function createSyncResourceController(options: Options) {
  const { model, label, upsertSchema, createSchema } = options;
  const hasScooterId = model.schema.path('scooterId') !== undefined;

  return {
    async list(req: Request, res: Response) {
      const userId = userIdOf(req);
      const query = parse(listQuerySchema, req.query, 'query');
      const filter: Record<string, unknown> = { user: userId };
      if (!query.includeDeleted) filter.deletedAt = null;
      if (hasScooterId && query.scooterId) filter.scooterId = query.scooterId;
      if (query.updatedSince) {
        filter.serverUpdatedAt = { $gte: new Date(query.updatedSince) };
      }

      const docs = await model
        .find(filter)
        .sort({ serverUpdatedAt: 1 })
        .limit(query.limit)
        .lean();
      const last = docs.at(-1) as { serverUpdatedAt?: Date } | undefined;
      const body: ListResponse<Record<string, unknown>> = {
        items: docs.map((doc) => toDto(doc as Record<string, unknown>)),
        cursor: last?.serverUpdatedAt?.toISOString() ?? null,
      };
      res.json(body);
    },

    async get(req: Request, res: Response) {
      const userId = userIdOf(req);
      const id = parse(idParam, req.params.id, 'id');
      const doc = await model
        .findOne({ _id: id, user: userId, deletedAt: null })
        .lean();
      if (!doc) throw AppError.notFound(label);
      res.json({ item: toDto(doc as Record<string, unknown>) });
    },

    async create(req: Request, res: Response) {
      const userId = userIdOf(req);
      const input = parse(createSchema, req.body, label);
      const now = new Date().toISOString();
      const { id, ...fields } = input;
      const record = {
        ...fields,
        _id: id ?? randomUUID(),
        user: userId,
        createdAt: input.createdAt ?? now,
        updatedAt: clampUpdatedAt(input.updatedAt ?? now),
      };
      try {
        const created = await model.create(record);
        const body: UpsertResponse<Record<string, unknown>> = {
          item: toDto(created.toObject() as Record<string, unknown>),
          applied: true,
        };
        res.status(201).json(body);
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          throw AppError.conflict(`${label} id already exists.`);
        }
        throw error;
      }
    },

    async upsert(req: Request, res: Response) {
      const userId = userIdOf(req);
      const id = parse(idParam, req.params.id, 'id');
      const input = parse(upsertSchema, req.body, label);
      if (input.id !== id) {
        throw AppError.validation('Body id does not match the URL id.');
      }

      const { id: _id, createdAt, ...fields } = input;
      const updatedAt = clampUpdatedAt(input.updatedAt);
      try {
        // Matches only when the stored copy is not newer; otherwise Mongo tries
        // to insert the same _id and raises a duplicate-key error (handled below).
        const doc = await model
          .findOneAndUpdate(
            { _id: id, user: userId, updatedAt: { $lte: updatedAt } },
            { $set: { ...fields, updatedAt }, $setOnInsert: { createdAt } },
            { upsert: true, returnDocument: 'after', runValidators: true },
          )
          .lean();
        const body: UpsertResponse<Record<string, unknown>> = {
          item: toDto(doc as Record<string, unknown>),
          applied: true,
        };
        res.json(body);
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        const existing = await model.findOne({ _id: id, user: userId }).lean();
        if (!existing) {
          throw AppError.conflict(`${label} id is already in use.`);
        }
        const body: UpsertResponse<Record<string, unknown>> = {
          item: toDto(existing as Record<string, unknown>),
          applied: false,
        };
        res.json(body);
      }
    },

    async remove(req: Request, res: Response) {
      const userId = userIdOf(req);
      const id = parse(idParam, req.params.id, 'id');
      const now = new Date();
      const doc = await model
        .findOneAndUpdate(
          { _id: id, user: userId, deletedAt: null },
          { $set: { deletedAt: now, updatedAt: now } },
          { returnDocument: 'after' },
        )
        .lean();
      if (doc) {
        res.json({
          item: toDto(doc as Record<string, unknown>),
          applied: true,
        });
        return;
      }
      // Deleting something already deleted is a success (idempotent for the sync queue).
      const existing = await model.findOne({ _id: id, user: userId }).lean();
      if (!existing) throw AppError.notFound(label);
      res.json({
        item: toDto(existing as Record<string, unknown>),
        applied: false,
      });
    },
  };
}
