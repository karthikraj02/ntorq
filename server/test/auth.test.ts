import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RefreshTokenModel, UserModel } from '../src/models';
import { mountApp, PASSWORD, registerUser, startTestApp } from './helpers';

let ctx: Awaited<ReturnType<typeof startTestApp>>;

beforeAll(async () => {
  ctx = await startTestApp();
});
afterAll(() => ctx.stop());

describe('POST /api/auth/register', () => {
  it('creates an account and returns the user plus tokens', async () => {
    const res = await ctx.api
      .post('/api/auth/register')
      .send({
        email: 'First.Rider@Example.com',
        password: PASSWORD,
        displayName: ' First Rider ',
      })
      .expect(201);

    expect(res.body.user).toMatchObject({
      email: 'first.rider@example.com',
      displayName: 'First Rider',
    });
    expect(res.body.user.id).toEqual(expect.any(String));
    expect(res.body.tokens.accessToken).toEqual(expect.any(String));
    expect(res.body.tokens.refreshToken).toEqual(expect.any(String));
    expect(Date.parse(res.body.tokens.accessTokenExpiresAt)).toBeGreaterThan(
      Date.now(),
    );
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('stores an argon2id hash, never the password', async () => {
    await ctx.api
      .post('/api/auth/register')
      .send({ email: 'hash@example.com', password: PASSWORD, displayName: 'H' })
      .expect(201);
    const stored = await UserModel.findOne({
      email: 'hash@example.com',
    }).select('+passwordHash');
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(stored?.passwordHash).not.toContain(PASSWORD);
  });

  it('rejects a duplicate email with 409', async () => {
    const body = {
      email: 'dupe@example.com',
      password: PASSWORD,
      displayName: 'D',
    };
    await ctx.api.post('/api/auth/register').send(body).expect(201);
    const res = await ctx.api.post('/api/auth/register').send(body).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it.each([
    ['invalid email', { email: 'nope', password: PASSWORD, displayName: 'A' }],
    [
      'short password',
      { email: 'a@example.com', password: 'short', displayName: 'A' },
    ],
    ['missing display name', { email: 'a@example.com', password: PASSWORD }],
  ])('rejects %s with 400 and field details', async (_name, body) => {
    const res = await ctx.api.post('/api/auth/register').send(body).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(expect.any(Array));
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with correct credentials (case-insensitive email)', async () => {
    await registerUser(ctx.api, 'login@example.com');
    const res = await ctx.api
      .post('/api/auth/login')
      .send({ email: 'LOGIN@example.com', password: PASSWORD })
      .expect(200);
    expect(res.body.tokens.accessToken).toEqual(expect.any(String));
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    await registerUser(ctx.api, 'known@example.com');
    const wrongPassword = await ctx.api
      .post('/api/auth/login')
      .send({ email: 'known@example.com', password: 'not the password' })
      .expect(401);
    const unknownEmail = await ctx.api
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: PASSWORD })
      .expect(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/users/me and access tokens', () => {
  it('returns the current user for a valid token', async () => {
    const user = await registerUser(ctx.api, 'me@example.com');
    const res = await ctx.api.get('/api/users/me').set(user.auth).expect(200);
    expect(res.body.user).toMatchObject({
      id: user.userId,
      email: 'me@example.com',
    });
  });

  it('requires a token', async () => {
    const res = await ctx.api.get('/api/users/me').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects garbage and wrong-scheme tokens', async () => {
    await ctx.api
      .get('/api/users/me')
      .set('Authorization', 'Bearer not.a.jwt')
      .expect(401);
    await ctx.api
      .get('/api/users/me')
      .set('Authorization', 'Basic abc')
      .expect(401);
  });

  it('rejects a refresh token used as an access token', async () => {
    const user = await registerUser(ctx.api);
    await ctx.api
      .get('/api/users/me')
      .set('Authorization', `Bearer ${user.refreshToken}`)
      .expect(401);
  });

  it('rejects tokens signed with another secret or the "none" algorithm', async () => {
    const user = await registerUser(ctx.api);
    const forged = jwt.sign({ type: 'access' }, 'c'.repeat(40), {
      subject: user.userId,
      issuer: 'ntorq-companion',
    });
    await ctx.api
      .get('/api/users/me')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
    const unsigned = jwt.sign({ type: 'access' }, '', {
      algorithm: 'none',
      subject: user.userId,
      issuer: 'ntorq-companion',
    });
    await ctx.api
      .get('/api/users/me')
      .set('Authorization', `Bearer ${unsigned}`)
      .expect(401);
  });

  it('reports TOKEN_EXPIRED for an expired access token', async () => {
    // Same database, but tokens are issued already expired.
    const { api } = await mountApp({ accessTokenTtlSeconds: -30 });
    const user = await registerUser(api);
    const res = await api.get('/api/users/me').set(user.auth).expect(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

describe('refresh token rotation', () => {
  it('issues a new pair and revokes the old refresh token', async () => {
    const user = await registerUser(ctx.api);
    const res = await ctx.api
      .post('/api/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(200);
    expect(res.body.tokens.refreshToken).not.toBe(user.refreshToken);

    const next = { Authorization: `Bearer ${res.body.tokens.accessToken}` };
    await ctx.api.get('/api/users/me').set(next).expect(200);
  });

  it('treats a replayed refresh token as theft and revokes the whole session', async () => {
    const user = await registerUser(ctx.api);
    const first = await ctx.api
      .post('/api/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(200);

    // The old token is used again (e.g. by an attacker who copied it).
    await ctx.api
      .post('/api/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(401);

    // ...which also invalidates the token that was legitimately issued.
    await ctx.api
      .post('/api/auth/refresh')
      .send({ refreshToken: first.body.tokens.refreshToken })
      .expect(401);
  });

  it('rejects an access token passed as a refresh token', async () => {
    const user = await registerUser(ctx.api);
    await ctx.api
      .post('/api/auth/refresh')
      .send({ refreshToken: user.accessToken })
      .expect(401);
  });

  it('logout revokes the refresh token', async () => {
    const user = await registerUser(ctx.api);
    await ctx.api
      .post('/api/auth/logout')
      .send({ refreshToken: user.refreshToken })
      .expect(204);
    await ctx.api
      .post('/api/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(401);
  });

  it('logout with an invalid token is not an error', async () => {
    await ctx.api
      .post('/api/auth/logout')
      .send({ refreshToken: 'x'.repeat(40) })
      .expect(204);
  });

  it('expires refresh-token rows automatically (TTL index)', async () => {
    const indexes = await RefreshTokenModel.collection.indexes();
    const ttl = indexes.find((index) => index.key.expiresAt === 1);
    expect(ttl?.expireAfterSeconds).toBe(0);
    expect(mongoose.connection.readyState).toBe(1);
  });
});
