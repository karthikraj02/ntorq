import type { SyncEntity } from '@shared/constants';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistOptions } from './storage';

export type SyncAction = 'upsert' | 'delete';

/** A pending change. It holds only a reference: the payload is read from the live store when sent. */
export interface SyncOp {
  entity: SyncEntity;
  id: string;
  action: SyncAction;
  queuedAt: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
  queue: SyncOp[];
  /** Per-collection pull cursor returned by the server. */
  cursors: Partial<Record<SyncEntity, string>>;
  lastSyncAt: string | null;
  status: SyncStatus;
  lastError: string | null;

  enqueue: (op: Omit<SyncOp, 'queuedAt'>) => void;
  dequeue: (entity: SyncEntity, id: string) => void;
  setCursor: (entity: SyncEntity, cursor: string) => void;
  setStatus: (status: SyncStatus, error?: string | null) => void;
  markSynced: () => void;
  reset: () => void;
}

/**
 * Combines a new change with any pending change for the same record, so the
 * queue never grows beyond one entry per record however often it is edited.
 */
export function coalesce(queue: SyncOp[], incoming: SyncOp): SyncOp[] {
  const others = queue.filter(
    op => !(op.entity === incoming.entity && op.id === incoming.id),
  );
  return [...others, incoming];
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      queue: [],
      cursors: {},
      lastSyncAt: null,
      status: 'idle',
      lastError: null,

      enqueue: op =>
        set({
          queue: coalesce(get().queue, {
            ...op,
            queuedAt: new Date().toISOString(),
          }),
        }),
      dequeue: (entity, id) =>
        set({
          queue: get().queue.filter(
            op => !(op.entity === entity && op.id === id),
          ),
        }),
      setCursor: (entity, cursor) =>
        set({ cursors: { ...get().cursors, [entity]: cursor } }),
      setStatus: (status, error = null) => set({ status, lastError: error }),
      markSynced: () =>
        set({
          status: 'idle',
          lastError: null,
          lastSyncAt: new Date().toISOString(),
        }),
      reset: () =>
        set({
          queue: [],
          cursors: {},
          lastSyncAt: null,
          status: 'idle',
          lastError: null,
        }),
    }),
    {
      ...persistOptions('sync'),
      partialize: state => ({
        queue: state.queue,
        cursors: state.cursors,
        lastSyncAt: state.lastSyncAt,
      }),
    },
  ),
);

/** Records that a local record changed and should be sent to the server. */
export function enqueueSync(
  entity: SyncEntity,
  id: string,
  action: SyncAction = 'upsert',
): void {
  useSyncStore.getState().enqueue({ entity, id, action });
}
