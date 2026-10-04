import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env';
import { redact } from '../src/utils/logger';

const valid = {
  MONGODB_URI: 'mongodb://user:supersecretpw@db.example/ntorq',
  JWT_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'y'.repeat(32),
};

describe('loadConfig', () => {
  it('applies defaults for optional variables', () => {
    const config = loadConfig(valid);
    expect(config.port).toBe(5000);
    expect(config.nodeEnv).toBe('development');
    expect(config.accessTokenTtlSeconds).toBe(900);
    expect(config.corsOrigins).toEqual([]);
    expect(config.trustProxy).toBe(false);
  });

  it('parses comma-separated CORS origins and flags', () => {
    const config = loadConfig({
      ...valid,
      CORS_ORIGIN: 'https://a.example, https://b.example ,',
      TRUST_PROXY: '1',
    });
    expect(config.corsOrigins).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
    expect(config.trustProxy).toBe(true);
  });

  it('rejects missing and short secrets', () => {
    expect(() => loadConfig({})).toThrow(/MONGODB_URI/);
    expect(() => loadConfig({ ...valid, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('rejects identical access and refresh secrets', () => {
    expect(() =>
      loadConfig({ ...valid, JWT_REFRESH_SECRET: valid.JWT_SECRET }),
    ).toThrow(/must differ/);
  });

  it('never includes secret values in the error message', () => {
    try {
      loadConfig({ ...valid, JWT_SECRET: 'tooshort-but-secret', PORT: 'abc' });
      expect.unreachable();
    } catch (error) {
      const message = (error as Error).message;
      expect(message).not.toContain('supersecretpw');
      expect(message).not.toContain('tooshort-but-secret');
    }
  });
});

describe('logger redaction', () => {
  it('hides passwords, tokens, secrets and emails recursively', () => {
    const cleaned = redact({
      password: 'hunter2',
      nested: { accessToken: 'abc', Authorization: 'Bearer abc', ok: 1 },
      list: [{ refreshToken: 'def' }],
      email: 'me@example.com',
      path: '/api/health',
    });
    expect(cleaned).toEqual({
      password: '[REDACTED]',
      nested: { accessToken: '[REDACTED]', Authorization: '[REDACTED]', ok: 1 },
      list: [{ refreshToken: '[REDACTED]' }],
      email: '[REDACTED]',
      path: '/api/health',
    });
  });
});
