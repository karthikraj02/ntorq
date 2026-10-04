import { api } from '../api';
import { initializeLocalData } from '../bootstrap';
import { SYNC_ADAPTERS } from './adapters';
import { SyncService } from './SyncService';

/** App-wide sync engine, wired to the real API client and local stores. */
export const syncService = new SyncService(
  api,
  SYNC_ADAPTERS,
  initializeLocalData,
);
