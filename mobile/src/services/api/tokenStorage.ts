import type { AuthTokensDTO } from '@shared/types';
import * as Keychain from 'react-native-keychain';
import { log } from '@/utils/logger';

/** Where the API client reads and writes the rider's tokens. */
export interface TokenAccess {
  get(): Promise<AuthTokensDTO | null>;
  set(tokens: AuthTokensDTO): Promise<void>;
  clear(): Promise<void>;
}

const SERVICE = 'com.ntorqcompanion.auth';
let cached: AuthTokensDTO | null | undefined;

/**
 * Tokens live in the Android Keystore-backed keychain, never in plain
 * app storage. An in-memory copy avoids hitting the keystore on every request.
 */
export const keychainTokens: TokenAccess = {
  async get() {
    if (cached !== undefined) return cached;
    try {
      const entry = await Keychain.getGenericPassword({ service: SERVICE });
      cached = entry ? (JSON.parse(entry.password) as AuthTokensDTO) : null;
    } catch (error) {
      log.error('auth', `Could not read secure storage: ${String(error)}`);
      cached = null;
    }
    return cached;
  },

  async set(tokens) {
    cached = tokens;
    try {
      await Keychain.setGenericPassword('session', JSON.stringify(tokens), {
        service: SERVICE,
      });
    } catch (error) {
      log.error('auth', `Could not write secure storage: ${String(error)}`);
    }
  },

  async clear() {
    cached = null;
    try {
      await Keychain.resetGenericPassword({ service: SERVICE });
    } catch (error) {
      log.error('auth', `Could not clear secure storage: ${String(error)}`);
    }
  },
};
