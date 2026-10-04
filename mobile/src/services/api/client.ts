import type { AuthResponseDTO } from '@shared/types';
import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { log } from '@/utils/logger';
import { ApiFailure, toApiFailure } from './errors';
import type { TokenAccess } from './tokenStorage';

const TIMEOUT_MS = 15_000;

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export interface ApiClientOptions {
  getBaseUrl: () => string;
  tokens: TokenAccess;
  /** Called when the refresh token is rejected and the rider must sign in again. */
  onSessionExpired: () => void;
}

/**
 * Axios client that signs requests with the access token and, on a 401,
 * refreshes the token once (shared between concurrent requests) and retries.
 */
export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const { getBaseUrl, tokens, onSessionExpired } = options;
  const client = axios.create({ timeout: TIMEOUT_MS });
  let refreshing: Promise<string> | null = null;

  async function refreshAccessToken(): Promise<string> {
    const current = await tokens.get();
    if (!current) throw new ApiFailure('session-expired', 'Please sign in.');
    try {
      // A bare axios call: this request must not go through the interceptors.
      const response = await axios.post<AuthResponseDTO>(
        `${getBaseUrl()}/api/auth/refresh`,
        { refreshToken: current.refreshToken },
        { timeout: TIMEOUT_MS },
      );
      await tokens.set(response.data.tokens);
      return response.data.tokens.accessToken;
    } catch (error) {
      const failure = toApiFailure(error);
      // Only an explicit rejection ends the session; being offline must not sign the rider out.
      if (
        failure.kind === 'session-expired' ||
        failure.kind === 'unauthorized'
      ) {
        log.warn('auth', 'Refresh token rejected; signing out');
        await tokens.clear();
        onSessionExpired();
        throw new ApiFailure(
          'session-expired',
          'Your session has expired. Please sign in again.',
          401,
        );
      }
      throw failure;
    }
  }

  client.interceptors.request.use(async config => {
    config.baseURL = getBaseUrl();
    const current = await tokens.get();
    if (current)
      config.headers.set('Authorization', `Bearer ${current.accessToken}`);
    return config;
  });

  client.interceptors.response.use(
    response => response,
    async error => {
      const config = error?.config as RetriableConfig | undefined;
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        config &&
        !config._retried
      ) {
        config._retried = true;
        refreshing ??= refreshAccessToken().finally(() => {
          refreshing = null;
        });
        try {
          const accessToken = await refreshing;
          config.headers.set('Authorization', `Bearer ${accessToken}`);
          return await client.request(config);
        } catch (refreshError) {
          throw toApiFailure(refreshError);
        }
      }
      throw toApiFailure(error);
    },
  );

  return client;
}
