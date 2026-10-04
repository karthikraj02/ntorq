import type {
  AuthResponseDTO,
  LoginRequest,
  RegisterRequest,
  UserDTO,
} from '@shared/types';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { log } from '@/utils/logger';
import { createApiClient } from './client';
import { toApiFailure } from './errors';
import { keychainTokens } from './tokenStorage';

const getBaseUrl = () => useSettingsStore.getState().backendUrl;

/** Authenticated client used for all data requests. */
export const api = createApiClient({
  getBaseUrl,
  tokens: keychainTokens,
  onSessionExpired: () => useAuthStore.getState().expireSession(),
});

async function post<T>(path: string, body: unknown): Promise<T> {
  try {
    const response = await axios.post<T>(`${getBaseUrl()}${path}`, body, {
      timeout: 15_000,
    });
    return response.data;
  } catch (error) {
    throw toApiFailure(error);
  }
}

async function completeSignIn(response: AuthResponseDTO): Promise<UserDTO> {
  await keychainTokens.set(response.tokens);
  useAuthStore.getState().signIn(response.user);
  log.info('auth', 'Signed in');
  return response.user;
}

export const authApi = {
  async register(input: RegisterRequest): Promise<UserDTO> {
    return completeSignIn(
      await post<AuthResponseDTO>('/api/auth/register', input),
    );
  },

  async login(input: LoginRequest): Promise<UserDTO> {
    return completeSignIn(
      await post<AuthResponseDTO>('/api/auth/login', input),
    );
  },

  /** Signs out locally even if the server cannot be reached. */
  async logout(): Promise<void> {
    const tokens = await keychainTokens.get();
    await keychainTokens.clear();
    useAuthStore.getState().signOut();
    if (tokens) {
      await post('/api/auth/logout', {
        refreshToken: tokens.refreshToken,
      }).catch(() =>
        log.warn('auth', 'Could not revoke the session on the server'),
      );
    }
  },

  async isSignedIn(): Promise<boolean> {
    return (await keychainTokens.get()) !== null;
  },
};
