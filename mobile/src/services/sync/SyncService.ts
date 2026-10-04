import type { ListResponse, SyncableDTO, UpsertResponse } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore, type SyncOp } from '@/store/syncStore';
import { log } from '@/utils/logger';
import { toApiFailure } from '../api/errors';
import type { SyncAdapter } from './adapters';

/** The slice of the HTTP client the sync engine needs (an AxiosInstance fits). */
export interface SyncTransport {
  put<T>(url: string, body: unknown): Promise<{ data: T }>;
  delete<T>(url: string): Promise<{ data: T }>;
  get<T>(
    url: string,
    config: { params: Record<string, unknown> },
  ): Promise<{ data: T }>;
}

export type SyncOutcome =
  | { status: 'ok'; pushed: number; pulled: number; rejected: number }
  | { status: 'skipped'; reason: 'signed-out' | 'already-running' }
  | { status: 'error'; message: string };

const PAGE_SIZE = 500;
const MAX_PAGES = 20;

function isNewer(a: string, b: string): boolean {
  return Date.parse(a) > Date.parse(b);
}

/**
 * Offline-first synchronisation.
 *
 *  1. PUSH  - send every queued change (idempotent PUT / DELETE).
 *  2. PULL  - fetch records changed on the server since the last cursor.
 *
 * Conflicts use last-write-wins on `updatedAt`. Anything that cannot be sent
 * because of network or server trouble stays queued for the next attempt.
 */
export class SyncService {
  private running: Promise<SyncOutcome> | null = null;

  constructor(
    private readonly transport: SyncTransport,
    private readonly adapters: SyncAdapter[],
    private readonly afterPull: () => void = () => undefined,
  ) {}

  syncNow(): Promise<SyncOutcome> {
    if (this.running)
      return Promise.resolve({ status: 'skipped', reason: 'already-running' });
    this.running = this.run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async run(): Promise<SyncOutcome> {
    if (!useAuthStore.getState().user)
      return { status: 'skipped', reason: 'signed-out' };

    const sync = useSyncStore.getState();
    sync.setStatus('syncing');
    try {
      const { pushed, rejected } = await this.push();
      const pulled = await this.pull();
      this.afterPull();
      useSyncStore.getState().markSynced();
      if (rejected > 0) {
        useSyncStore
          .getState()
          .setStatus(
            'idle',
            `${rejected} change(s) were rejected by the server and skipped.`,
          );
      }
      log.info(
        'sync',
        `Sync complete: ${pushed} sent, ${pulled} received, ${rejected} rejected`,
      );
      return { status: 'ok', pushed, pulled, rejected };
    } catch (error) {
      const failure = toApiFailure(error);
      log.warn('sync', `Sync stopped: ${failure.kind}`);
      useSyncStore.getState().setStatus('error', failure.userMessage);
      return { status: 'error', message: failure.userMessage };
    }
  }

  private adapterFor(entity: SyncOp['entity']): SyncAdapter | undefined {
    return this.adapters.find(adapter => adapter.entity === entity);
  }

  private async push(): Promise<{ pushed: number; rejected: number }> {
    let pushed = 0;
    let rejected = 0;
    // Work from a snapshot; edits made while syncing are queued for next time.
    for (const op of [...useSyncStore.getState().queue]) {
      const adapter = this.adapterFor(op.entity);
      if (!adapter) {
        useSyncStore.getState().dequeue(op.entity, op.id);
        continue;
      }
      try {
        if (await this.pushOne(adapter, op)) pushed += 1;
      } catch (error) {
        const failure = toApiFailure(error);
        if (
          failure.isRetryable ||
          failure.kind === 'session-expired' ||
          failure.kind === 'unauthorized'
        ) {
          throw failure; // stop; the whole queue is retried later
        }
        // The server refused this specific change; retrying cannot help.
        log.error(
          'sync',
          `Server rejected ${op.entity}/${op.id}: ${failure.userMessage}`,
        );
        this.dequeueIfUnchanged(op);
        rejected += 1;
      }
    }
    return { pushed, rejected };
  }

  /** Returns true if something was actually sent. */
  private async pushOne(adapter: SyncAdapter, op: SyncOp): Promise<boolean> {
    const url = `/api/${op.entity}/${op.id}`;

    if (op.action === 'delete') {
      try {
        await this.transport.delete(url);
      } catch (error) {
        if (toApiFailure(error).kind !== 'not-found') throw error;
      }
      this.dequeueIfUnchanged(op);
      return true;
    }

    const record = adapter.get(op.id);
    if (!record || !adapter.shouldSync(record)) {
      this.dequeueIfUnchanged(op);
      return false;
    }
    const response = await this.transport.put<UpsertResponse<SyncableDTO>>(
      url,
      record,
    );
    if (!response.data.applied) {
      // The server already has a newer version; take it.
      adapter.applyRemote(response.data.item);
    }
    this.dequeueIfUnchanged(op);
    return true;
  }

  /** Removes the op unless the record was edited again while the request was in flight. */
  private dequeueIfUnchanged(op: SyncOp): void {
    const current = useSyncStore
      .getState()
      .queue.find(queued => queued.entity === op.entity && queued.id === op.id);
    if (current && current.queuedAt === op.queuedAt) {
      useSyncStore.getState().dequeue(op.entity, op.id);
    }
  }

  private async pull(): Promise<number> {
    let received = 0;
    for (const adapter of this.adapters) {
      let cursor = useSyncStore.getState().cursors[adapter.entity];

      for (let page = 0; page < MAX_PAGES; page++) {
        const response = await this.transport.get<ListResponse<SyncableDTO>>(
          `/api/${adapter.entity}`,
          {
            params: {
              includeDeleted: 'true',
              limit: PAGE_SIZE,
              ...(cursor ? { updatedSince: cursor } : {}),
            },
          },
        );
        for (const item of response.data.items) {
          if (this.applyPulled(adapter, item)) received += 1;
        }
        if (response.data.cursor) {
          cursor = response.data.cursor;
          useSyncStore.getState().setCursor(adapter.entity, cursor);
        }
        if (response.data.items.length < PAGE_SIZE) break;
      }
    }
    return received;
  }

  /** Applies one server record using last-write-wins. Returns true if local data changed. */
  private applyPulled(adapter: SyncAdapter, remote: SyncableDTO): boolean {
    const pending = useSyncStore
      .getState()
      .queue.some(op => op.entity === adapter.entity && op.id === remote.id);
    if (pending) return false; // a newer local edit is waiting to be sent

    const local = adapter.get(remote.id);
    if (remote.deletedAt) {
      if (local && !isNewer(local.updatedAt, remote.updatedAt)) {
        adapter.removeLocal(remote.id);
        return true;
      }
      return false;
    }
    if (!local || isNewer(remote.updatedAt, local.updatedAt)) {
      adapter.applyRemote(remote);
      return true;
    }
    return false;
  }
}
