import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage, type PersistOptions } from 'zustand/middleware';
import { log } from '@/utils/logger';

const kv = createMMKV({ id: 'ntorq-companion' });

/** Synchronous, on-device key-value storage. Failures are logged, never thrown into the UI. */
const stateStorage = {
  getItem: (name: string): string | null => {
    try {
      return kv.getString(name) ?? null;
    } catch (error) {
      log.error('storage', `Could not read "${name}": ${String(error)}`);
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      kv.set(name, value);
    } catch (error) {
      log.error('storage', `Could not save "${name}": ${String(error)}`);
    }
  },
  removeItem: (name: string): void => {
    try {
      kv.remove(name);
    } catch (error) {
      log.error('storage', `Could not remove "${name}": ${String(error)}`);
    }
  },
};

/** Shared zustand `persist` options: stores are saved as JSON under `ntorq.<name>`. */
export function persistOptions<State, Persisted = State>(
  name: string,
  version = 1,
): Pick<PersistOptions<State, Persisted>, 'name' | 'version' | 'storage'> {
  return {
    name: `ntorq.${name}`,
    version,
    storage: createJSONStorage<Persisted>(() => stateStorage),
  };
}

/** Wipes every persisted store (used by "Clear local data"). */
export function clearAllPersistedData(): void {
  kv.clearAll();
}
