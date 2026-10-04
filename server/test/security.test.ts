import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mountApp, registerUser, startTestApp } from './helpers';

let ctx: Awaited<ReturnType<typeof startTestApp>>;

beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.stop());

describe('HTTP hardening', () => {
  it('serves a health check without authentication', async () => {
    const res = await ctx.api.get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('sets security headers and hides the framework', async () => {
    const res = await ctx.api.get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('returns JSON for unknown routes and malformed bodies', async () => {
    // Unauthenticated callers cannot probe which routes exist.
    await ctx.api.get('/api/nope').expect(401);
    const user = await registerUser(ctx.api);
    const notFound = await ctx.api.get('/api/nope').set(user.auth).expect(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');

    const malformed = await ctx.api
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not leak internals in error responses', async () => {
    const res = await ctx.api
      .get('/api/users/me')
      .set('Authorization', 'Bearer abc.def.ghi')
      .expect(401);
    expect(JSON.stringify(res.body)).not.toMatch(
      /stack|jwt malformed|node_modules/i,
    );
  });
});

describe('CORS', () => {
  it('sends no CORS headers when no origin is configured', async () => {
    const res = await ctx.api
      .get('/api/health')
      .set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows only configured origins', async () => {
    const { api } = await mountApp({
      corsOrigins: ['https://dashboard.example'],
    });
    const allowed = await api
      .get('/api/health')
      .set('Origin', 'https://dashboard.example');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'https://dashboard.example',
    );
    const denied = await api
      .get('/api/health')
      .set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('rate limiting', () => {
  it('throttles the auth endpoints more strictly than the rest of the API', async () => {
    const { api } = await mountApp({
      rateLimit: { windowMs: 60_000, max: 100, authMax: 3 },
    });
    const attempt = () =>
      api
        .post('/api/auth/login')
        .send({ email: 'a@example.com', password: 'whatever-password' });

    for (let i = 0; i < 3; i++) await attempt().expect(401);
    const limited = await attempt().expect(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['ratelimit']).toBeDefined();

    // The general API limit is separate and still has headroom.
    await api.get('/api/health').expect(200);
  });

  it('applies a global ceiling to all API routes', async () => {
    const { api } = await mountApp({
      rateLimit: { windowMs: 60_000, max: 2, authMax: 100 },
    });
    await api.get('/api/health').expect(200);
    await api.get('/api/health').expect(200);
    await api.get('/api/health').expect(429);
  });
});
