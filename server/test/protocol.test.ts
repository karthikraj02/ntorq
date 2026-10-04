import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { registerUser, startTestApp, type TestUser } from './helpers';

let ctx: Awaited<ReturnType<typeof startTestApp>>;
let alice: TestUser;
let bob: TestUser;

beforeAll(async () => {
  ctx = await startTestApp();
  alice = await registerUser(ctx.api);
  bob = await registerUser(ctx.api);
});
afterAll(() => ctx.stop());

function packet(overrides: Record<string, unknown> = {}) {
  return {
    timestamp: '2026-03-01T10:00:00.451Z',
    direction: 'RX',
    serviceUuid: null,
    characteristicUuid: 'characteristic-placeholder',
    hex: '01 02 03',
    base64: 'AQID',
    length: 3,
    rssi: -61,
    ...overrides,
  };
}

function capture(overrides: Record<string, unknown> = {}) {
  return {
    scooterId: randomUUID(),
    name: 'Idle capture',
    deviceName: null,
    startedAt: '2026-03-01T10:00:00.000Z',
    endedAt: '2026-03-01T10:05:00.000Z',
    notes: null,
    packets: [
      packet(),
      packet({ direction: 'TX', hex: 'FF', base64: '/w==', length: 1 }),
    ],
    ...overrides,
  };
}

describe('protocol captures', () => {
  it('stores raw packets verbatim without interpreting them', async () => {
    const created = await ctx.api
      .post('/api/protocol/capture')
      .set(alice.auth)
      .send(capture())
      .expect(201);
    expect(created.body.item.packets).toHaveLength(2);

    const full = await ctx.api
      .get(`/api/protocol/captures/${created.body.item.id}`)
      .set(alice.auth)
      .expect(200);
    expect(full.body.item.packets[0]).toMatchObject({
      direction: 'RX',
      hex: '01 02 03',
      base64: 'AQID',
      length: 3,
      rssi: -61,
    });
  });

  it('lists capture summaries with a packet count but without packets', async () => {
    await ctx.api
      .post('/api/protocol/capture')
      .set(alice.auth)
      .send(capture())
      .expect(201);
    const res = await ctx.api
      .get('/api/protocol/captures')
      .set(alice.auth)
      .expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item).not.toHaveProperty('packets');
      expect(item.packetCount).toEqual(expect.any(Number));
      expect(item.id).toEqual(expect.any(String));
    }
  });

  it('rejects malformed packets', async () => {
    const bad = capture({ packets: [packet({ hex: 'not hex!' })] });
    const res = await ctx.api
      .post('/api/protocol/capture')
      .set(alice.auth)
      .send(bad)
      .expect(400);
    expect(JSON.stringify(res.body.error.details)).toContain('hex');

    const badDirection = capture({
      packets: [packet({ direction: 'SIDEWAYS' })],
    });
    await ctx.api
      .post('/api/protocol/capture')
      .set(alice.auth)
      .send(badDirection)
      .expect(400);
  });

  it('keeps captures private to their owner', async () => {
    const created = await ctx.api
      .post('/api/protocol/capture')
      .set(alice.auth)
      .send(capture())
      .expect(201);
    await ctx.api
      .get(`/api/protocol/captures/${created.body.item.id}`)
      .set(bob.auth)
      .expect(404);
    const list = await ctx.api
      .get('/api/protocol/captures')
      .set(bob.auth)
      .expect(200);
    expect(list.body.items).toHaveLength(0);
  });

  it('accepts bodies larger than the default limit on this route only', async () => {
    const many = Array.from({ length: 2500 }, () => packet());
    const big = capture({ packets: many });
    expect(JSON.stringify(big).length).toBeGreaterThan(256 * 1024);
    await ctx.api
      .post('/api/protocol/capture')
      .set(alice.auth)
      .send(big)
      .expect(201);

    const res = await ctx.api
      .put(`/api/scooters/${randomUUID()}`)
      .set(alice.auth)
      .send({ padding: 'x'.repeat(300 * 1024) })
      .expect(413);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    await ctx.api.post('/api/protocol/capture').send(capture()).expect(401);
    await ctx.api.get('/api/protocol/captures').expect(401);
  });
});

describe('application settings', () => {
  it('stores and updates a value per key', async () => {
    await ctx.api
      .put('/api/settings/theme')
      .set(alice.auth)
      .send({ value: 'dark' })
      .expect(200);
    await ctx.api
      .put('/api/settings/theme')
      .set(alice.auth)
      .send({ value: { mode: 'light' } })
      .expect(200);

    const res = await ctx.api.get('/api/settings').set(alice.auth).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      key: 'theme',
      value: { mode: 'light' },
    });

    const other = await ctx.api.get('/api/settings').set(bob.auth).expect(200);
    expect(other.body.items).toHaveLength(0);
  });

  it('rejects odd keys and oversized values', async () => {
    await ctx.api
      .put('/api/settings/$where')
      .set(alice.auth)
      .send({ value: 1 })
      .expect(400);
    await ctx.api
      .put('/api/settings/big')
      .set(alice.auth)
      .send({ value: 'x'.repeat(20_000) })
      .expect(400);
  });
});
