import type { AuthTokensDTO } from '@shared/types';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { createApiClient } from '@/services/api/client';
import { ApiFailure, toApiFailure } from '@/services/api/errors';
import type { TokenAccess } from '@/services/api/tokenStorage';

const tokens = (suffix: string): AuthTokensDTO => ({
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  accessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
});

function memoryTokens(
  initial: AuthTokensDTO | null,
): TokenAccess & { current: AuthTokensDTO | null } {
  const store = {
    current: initial,
    get: async () => store.current,
    set: async (t: AuthTokensDTO) => {
      store.current = t;
    },
    clear: async () => {
      store.current = null;
    },
  };
  return store;
}

function axiosError(
  config: InternalAxiosRequestConfig,
  status: number,
  body: unknown,
) {
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: body,
  });
}

const ok = (config: InternalAxiosRequestConfig, data: unknown) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

function setup(initial: AuthTokensDTO | null = tokens('1')) {
  const store = memoryTokens(initial);
  const onSessionExpired = jest.fn();
  const client = createApiClient({
    getBaseUrl: () => 'https://api.example.test',
    tokens: store,
    onSessionExpired,
  });
  const seen: { url?: string; base?: string; auth?: string }[] = [];
  return { client, store, onSessionExpired, seen };
}

afterEach(() => jest.restoreAllMocks());

describe('createApiClient', () => {
  it('signs requests with the current access token against the configured server', async () => {
    const { client, seen } = setup();
    client.defaults.adapter = async config => {
      seen.push({
        url: config.url,
        base: config.baseURL,
        auth: String(config.headers.get('Authorization')),
      });
      return ok(config, { fine: true });
    };
    await client.get('/api/health');
    expect(seen[0]).toEqual({
      url: '/api/health',
      base: 'https://api.example.test',
      auth: 'Bearer access-1',
    });
  });

  it('sends no Authorization header when signed out', async () => {
    const { client, seen } = setup(null);
    client.defaults.adapter = async config => {
      seen.push({ auth: String(config.headers.get('Authorization')) });
      return ok(config, {});
    };
    await client.get('/x');
    expect(seen[0]?.auth).toBe('undefined');
  });

  it('refreshes an expired token once, even for concurrent requests, then retries them', async () => {
    const { client, store } = setup();
    const refresh = jest.spyOn(axios, 'post').mockImplementation(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 10));
      return { data: { tokens: tokens('2') } };
    });
    const used: string[] = [];
    client.defaults.adapter = async config => {
      const auth = String(config.headers.get('Authorization'));
      used.push(auth);
      if (auth !== 'Bearer access-2') {
        throw axiosError(config, 401, {
          error: { code: 'TOKEN_EXPIRED', message: 'Access token expired.' },
        });
      }
      return ok(config, { path: config.url });
    };

    const [a, b] = await Promise.all([client.get('/a'), client.get('/b')]);
    expect(a.data).toEqual({ path: '/a' });
    expect(b.data).toEqual({ path: '/b' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh.mock.calls[0]?.[1]).toEqual({ refreshToken: 'refresh-1' });
    expect(store.current).toEqual(tokens('2'));
    expect(used.filter(auth => auth === 'Bearer access-2')).toHaveLength(2);
  });

  it('signs the rider out when the refresh token is rejected', async () => {
    const { client, store, onSessionExpired } = setup();
    jest.spyOn(axios, 'post').mockRejectedValue(
      axiosError({} as InternalAxiosRequestConfig, 401, {
        error: { code: 'UNAUTHORIZED', message: 'Session expired.' },
      }),
    );
    client.defaults.adapter = async config => {
      throw axiosError(config, 401, {
        error: { code: 'TOKEN_EXPIRED', message: 'x' },
      });
    };

    await expect(client.get('/a')).rejects.toMatchObject({
      kind: 'session-expired',
    });
    expect(store.current).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does NOT sign out when the refresh fails only because the network is down', async () => {
    const { client, store, onSessionExpired } = setup();
    jest
      .spyOn(axios, 'post')
      .mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
    client.defaults.adapter = async config => {
      throw axiosError(config, 401, {
        error: { code: 'TOKEN_EXPIRED', message: 'x' },
      });
    };

    await expect(client.get('/a')).rejects.toMatchObject({ kind: 'offline' });
    expect(store.current).toEqual(tokens('1'));
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('retries a request at most once', async () => {
    const { client } = setup();
    jest
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { tokens: tokens('2') } });
    let calls = 0;
    client.defaults.adapter = async config => {
      calls += 1;
      throw axiosError(config, 401, {
        error: { code: 'UNAUTHORIZED', message: 'nope' },
      });
    };
    await expect(client.get('/a')).rejects.toBeInstanceOf(ApiFailure);
    expect(calls).toBe(2);
  });

  it('turns failures into friendly ApiFailure objects', async () => {
    const { client } = setup();
    client.defaults.adapter = async config => {
      throw axiosError(config, 400, {
        error: { code: 'VALIDATION_ERROR', message: 'Invalid Scooter.' },
      });
    };
    await expect(client.put('/x', {})).rejects.toMatchObject({
      kind: 'validation',
      userMessage: 'Invalid Scooter.',
    });
  });
});

describe('toApiFailure', () => {
  const failure = (status: number | null, body?: unknown, code?: string) =>
    toApiFailure(
      status === null
        ? new AxiosError('Network Error', code ?? 'ERR_NETWORK')
        : axiosError({} as InternalAxiosRequestConfig, status, body),
    );

  it('classifies network trouble and gives actionable messages', () => {
    expect(failure(null)).toMatchObject({ kind: 'offline', isRetryable: true });
    expect(failure(null).userMessage).toMatch(/Cannot reach the server/);
    expect(failure(null, undefined, 'ECONNABORTED')).toMatchObject({
      kind: 'timeout',
      isRetryable: true,
    });
  });

  it('classifies HTTP statuses', () => {
    expect(failure(500)).toMatchObject({ kind: 'server', isRetryable: true });
    expect(failure(503)).toMatchObject({ kind: 'server' });
    expect(failure(429)).toMatchObject({
      kind: 'rate-limited',
      isRetryable: true,
    });
    expect(
      failure(404, { error: { message: 'Scooter not found.' } }),
    ).toMatchObject({ kind: 'not-found' });
    expect(failure(409, { error: { message: 'Exists.' } })).toMatchObject({
      kind: 'conflict',
      isRetryable: false,
    });
    expect(failure(400, { error: { message: 'Bad.' } })).toMatchObject({
      kind: 'validation',
      userMessage: 'Bad.',
      isRetryable: false,
    });
  });

  it('keeps the server wording for a wrong password but not for an expired token', () => {
    expect(
      failure(401, {
        error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' },
      }),
    ).toMatchObject({
      kind: 'unauthorized',
      userMessage: 'Invalid email or password.',
    });
    expect(
      failure(401, {
        error: { code: 'TOKEN_EXPIRED', message: 'Access token expired.' },
      }),
    ).toMatchObject({
      kind: 'session-expired',
      userMessage: 'Your session has expired. Please sign in again.',
    });
  });

  it('copes with unknown error shapes', () => {
    expect(toApiFailure(new Error('weird'))).toMatchObject({ kind: 'unknown' });
    expect(toApiFailure('a string')).toMatchObject({ kind: 'unknown' });
    const existing = new ApiFailure('offline', 'x');
    expect(toApiFailure(existing)).toBe(existing);
  });
});
