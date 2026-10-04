import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { syncService } from '@/services/sync';
import { log } from '@/utils/logger';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

const QUEUE_DEBOUNCE_MS = 3000;

/**
 * Starts a sync when the situation suggests it could succeed:
 * the phone regains connectivity, the app comes to the foreground,
 * or the rider has just changed something (after a short pause).
 */
export function useSyncTriggers(): void {
  useEffect(() => {
    const syncIfPossible = () => {
      if (!useAuthStore.getState().user) return;
      NetInfo.fetch()
        .then(network =>
          network.isConnected ? syncService.syncNow() : undefined,
        )
        .catch(error =>
          log.warn('sync', `Could not start a sync: ${String(error)}`),
        );
    };

    const unsubscribeNetwork = NetInfo.addEventListener(state => {
      if (state.isConnected) syncIfPossible();
    });
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') syncIfPossible();
    });

    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeQueue = useSyncStore.subscribe((state, previous) => {
      if (state.queue !== previous.queue && state.queue.length > 0) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(syncIfPossible, QUEUE_DEBOUNCE_MS);
      }
    });

    syncIfPossible();
    return () => {
      unsubscribeNetwork();
      appState.remove();
      unsubscribeQueue();
      if (timer) clearTimeout(timer);
    };
  }, []);
}
