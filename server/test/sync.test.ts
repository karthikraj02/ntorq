import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  diagnosticPayload,
  maintenancePayload,
  registerUser,
  reminderPayload,
  ridePayload,
  scooterPayload,
  startTestApp,
  type TestUser,
} from './helpers';

interface Resource {
  path: string;
  make: (scooterId: string) => Record<string, unknown>;
  change: Record<string, unknown>;
  invalid: Record<string, unknown>;
  invalidField: string;
}

const RESOURCES: Resource[] = [
  {
    path: 'scooters',
    make: () => scooterPayload(),
    change: { name: 'Renamed scooter' },
    invalid: { name: '' },
    invalidField: 'name',
  },
  {
    path: 'service-reminders',
    make: (scooterId) => reminderPayload(scooterId),
    change: { intervalKm: 4000 },
    invalid: { type: 'warp_drive' },
    invalidField: 'type',
  },
  {
    path: 'maintenance',
    make: (scooterId) => maintenancePayload(scooterId),
    change: { cost: 999 },
    invalid: { date: '2026-13-45' },
    invalidField: 'date',
  },
  {
    path: 'rides',
    make: (scooterId) => ridePayload(scooterId),
    change: { distanceKm: 20 },
    invalid: { distanceKm: -1 },
    invalidField: 'distanceKm',
  },
  {
    path: 'diagnostics',
    make: (scooterId) => diagnosticPayload(scooterId),
    change: { description: 'Updated description' },
    invalid: { severity: 'apocalyptic' },
    invalidField: 'severity',
  },
];

const T1 = '2026-03-02T10:00:00.000Z';
const T2 = '2026-03-03T10:00:00.000Z';

let ctx: Awaited<ReturnType<typeof startTestApp>>;
let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  ctx = await startTestApp();
  alice = await registerUser(ctx.api, 'alice@example.com');
  bob = await registerUser(ctx.api, 'bob@example.com');
});
afterAll(() => ctx.stop());

describe.each(RESOURCES)('/api/$path sync contract', (resource) => {
  const url = `/api/${resource.path}`;
  const scooterId = randomUUID();

  it('requires authentication', async () => {
    await ctx.api.get(url).expect(401);
    await ctx.api.put(`${url}/${randomUUID()}`).send({}).expect(401);
  });

  it('PUT creates a record with the client-supplied id', async () => {
    const payload = resource.make(scooterId);
    const res = await ctx.api
      .put(`${url}/${payload.id}`)
      .set(alice.auth)
      .send(payload)
      .expect(200);
    expect(res.body.applied).toBe(true);
    expect(res.body.item.id).toBe(payload.id);
    expect(res.body.item).not.toHaveProperty('user');
    expect(res.body.item).not.toHaveProperty('_id');
    expect(res.body.item).not.toHaveProperty('serverUpdatedAt');

    const fetched = await ctx.api
      .get(`${url}/${payload.id}`)
      .set(alice.auth)
      .expect(200);
    expect(fetched.body.item.id).toBe(payload.id);
  });

  it('PUT is idempotent, so the sync queue can safely retry', async () => {
    const payload = resource.make(scooterId);
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await ctx.api
        .put(`${url}/${payload.id}`)
        .set(alice.auth)
        .send(payload)
        .expect(200);
      expect(res.body.applied).toBe(true);
    }
    const list = await ctx.api.get(url).set(alice.auth).expect(200);
    const matches = list.body.items.filter(
      (item: { id: string }) => item.id === payload.id,
    );
    expect(matches).toHaveLength(1);
  });

  it('last write wins: newer updates apply, stale ones are ignored', async () => {
    const original = resource.make(scooterId);
    await ctx.api
      .put(`${url}/${original.id}`)
      .set(alice.auth)
      .send(original)
      .expect(200);

    const newer = { ...original, ...resource.change, updatedAt: T2 };
    const applied = await ctx.api
      .put(`${url}/${original.id}`)
      .set(alice.auth)
      .send(newer)
      .expect(200);
    expect(applied.body.applied).toBe(true);

    const stale = { ...original, updatedAt: T1 };
    const rejected = await ctx.api
      .put(`${url}/${original.id}`)
      .set(alice.auth)
      .send(stale)
      .expect(200);
    expect(rejected.body.applied).toBe(false);
    expect(rejected.body.item).toMatchObject(resource.change);
    expect(rejected.body.item.updatedAt).toBe(T2);
  });

  it('clamps modification times set far in the future', async () => {
    const base = resource.make(scooterId);
    const payload = { ...base, updatedAt: '2099-01-01T00:00:00.000Z' };
    const res = await ctx.api
      .put(`${url}/${base.id}`)
      .set(alice.auth)
      .send(payload)
      .expect(200);
    expect(Date.parse(res.body.item.updatedAt)).toBeLessThanOrEqual(
      Date.now() + 5 * 60_000 + 1000,
    );
  });

  it('rejects a body whose id differs from the URL', async () => {
    const payload = resource.make(scooterId);
    const res = await ctx.api
      .put(`${url}/${randomUUID()}`)
      .set(alice.auth)
      .send(payload)
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid data and names the offending field', async () => {
    const payload = { ...resource.make(scooterId), ...resource.invalid };
    const res = await ctx.api
      .put(`${url}/${payload.id}`)
      .set(alice.auth)
      .send(payload)
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(res.body.error.details)).toContain(
      resource.invalidField,
    );
  });

  it('rejects a non-UUID id in the URL', async () => {
    await ctx.api.get(`${url}/123`).set(alice.auth).expect(400);
  });

  it('POST generates an id and timestamps when omitted, and 409s on a duplicate id', async () => {
    const { id, createdAt, updatedAt, ...rest } = resource.make(scooterId);
    void createdAt;
    void updatedAt;
    const created = await ctx.api
      .post(url)
      .set(alice.auth)
      .send(rest)
      .expect(201);
    expect(created.body.item.id).toEqual(expect.any(String));
    expect(created.body.item.id).not.toBe(id);
    expect(created.body.item.createdAt).toEqual(expect.any(String));

    await ctx.api
      .post(url)
      .set(alice.auth)
      .send({ ...rest, id: created.body.item.id })
      .expect(409);
  });

  it('DELETE is a soft delete that is idempotent', async () => {
    const payload = resource.make(scooterId);
    await ctx.api
      .put(`${url}/${payload.id}`)
      .set(alice.auth)
      .send(payload)
      .expect(200);

    const removed = await ctx.api
      .delete(`${url}/${payload.id}`)
      .set(alice.auth)
      .expect(200);
    expect(removed.body.item.deletedAt).toEqual(expect.any(String));

    await ctx.api.get(`${url}/${payload.id}`).set(alice.auth).expect(404);
    const defaultList = await ctx.api.get(url).set(alice.auth).expect(200);
    expect(
      defaultList.body.items.map((i: { id: string }) => i.id),
    ).not.toContain(payload.id);

    const withDeleted = await ctx.api
      .get(`${url}?includeDeleted=true`)
      .set(alice.auth)
      .expect(200);
    const found = withDeleted.body.items.find(
      (i: { id: string }) => i.id === payload.id,
    );
    expect(found?.deletedAt).toEqual(expect.any(String));

    const again = await ctx.api
      .delete(`${url}/${payload.id}`)
      .set(alice.auth)
      .expect(200);
    expect(again.body.applied).toBe(false);
    await ctx.api.delete(`${url}/${randomUUID()}`).set(alice.auth).expect(404);
  });

  it('pulls only newer changes using the cursor', async () => {
    const older = resource.make(scooterId);
    await ctx.api
      .put(`${url}/${older.id}`)
      .set(alice.auth)
      .send(older)
      .expect(200);
    await new Promise((resolve) => setTimeout(resolve, 15));
    const latest = resource.make(scooterId);
    await ctx.api
      .put(`${url}/${latest.id}`)
      .set(alice.auth)
      .send(latest)
      .expect(200);

    const page = await ctx.api
      .get(`${url}?limit=1000`)
      .set(alice.auth)
      .expect(200);
    const cursor: string = page.body.cursor;
    expect(Date.parse(cursor)).not.toBeNaN();

    await new Promise((resolve) => setTimeout(resolve, 15));
    const newest = resource.make(scooterId);
    await ctx.api
      .put(`${url}/${newest.id}`)
      .set(alice.auth)
      .send(newest)
      .expect(200);

    const delta = await ctx.api
      .get(`${url}?updatedSince=${encodeURIComponent(cursor)}`)
      .set(alice.auth)
      .expect(200);
    const ids = delta.body.items.map((i: { id: string }) => i.id);
    expect(ids).toContain(newest.id);
    // The cursor is inclusive so same-millisecond writes are never skipped;
    // clients de-duplicate by id.
    expect(ids).toContain(latest.id);
    expect(ids).not.toContain(older.id);
  });

  it('respects the page limit', async () => {
    const res = await ctx.api.get(`${url}?limit=1`).set(alice.auth).expect(200);
    expect(res.body.items).toHaveLength(1);
    await ctx.api.get(`${url}?limit=0`).set(alice.auth).expect(400);
  });

  it("keeps each user's data private", async () => {
    const payload = resource.make(scooterId);
    await ctx.api
      .put(`${url}/${payload.id}`)
      .set(alice.auth)
      .send(payload)
      .expect(200);

    await ctx.api.get(`${url}/${payload.id}`).set(bob.auth).expect(404);
    await ctx.api.delete(`${url}/${payload.id}`).set(bob.auth).expect(404);

    // Bob cannot overwrite or take over Alice's id.
    const hijack = await ctx.api
      .put(`${url}/${payload.id}`)
      .set(bob.auth)
      .send({ ...payload, ...resource.change, updatedAt: T2 })
      .expect(409);
    expect(hijack.body.error.code).toBe('CONFLICT');

    const bobList = await ctx.api.get(url).set(bob.auth).expect(200);
    expect(bobList.body.items).toHaveLength(0);

    const still = await ctx.api
      .get(`${url}/${payload.id}`)
      .set(alice.auth)
      .expect(200);
    expect(still.body.item).toMatchObject({ id: payload.id });
  });
});

describe('scooter-specific rules', () => {
  it('stores missing optional profile fields as null, not as empty values', async () => {
    const payload = scooterPayload();
    delete (payload as Record<string, unknown>).vin;
    const res = await ctx.api
      .put(`/api/scooters/${payload.id}`)
      .set(alice.auth)
      .send(payload)
      .expect(200);
    expect(res.body.item.vin).toBeNull();
    expect(res.body.item.engineNumber).toBeNull();
  });

  it('rejects an impossible odometer value', async () => {
    const payload = scooterPayload({ odometerKm: -5 });
    await ctx.api
      .put(`/api/scooters/${payload.id}`)
      .set(alice.auth)
      .send(payload)
      .expect(400);
  });
});

describe('reminder and maintenance filtering', () => {
  it('filters by scooterId', async () => {
    const scooterA = randomUUID();
    const scooterB = randomUUID();
    const a = maintenancePayload(scooterA);
    const b = maintenancePayload(scooterB);
    for (const record of [a, b]) {
      await ctx.api
        .put(`/api/maintenance/${record.id}`)
        .set(alice.auth)
        .send(record)
        .expect(200);
    }
    const res = await ctx.api
      .get(`/api/maintenance?scooterId=${scooterA}`)
      .set(alice.auth)
      .expect(200);
    expect(res.body.items.map((i: { id: string }) => i.id)).toEqual([a.id]);
  });
});
