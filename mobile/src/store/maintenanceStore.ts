import type { MaintenanceRecordDTO } from '@shared/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { laterThan, nowIso } from '@/utils/dates';
import { uuid } from '@/utils/uuid';
import { persistOptions } from './storage';
import { enqueueSync } from './syncStore';

export type MaintenanceInput = Omit<
  MaintenanceRecordDTO,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

interface MaintenanceState {
  records: MaintenanceRecordDTO[];
  addRecord: (input: MaintenanceInput) => MaintenanceRecordDTO;
  updateRecord: (id: string, input: MaintenanceInput) => void;
  removeRecord: (id: string) => void;
  applyRemote: (remote: MaintenanceRecordDTO) => void;
  removeLocal: (id: string) => void;
  reset: () => void;
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set, get) => ({
      records: [],

      addRecord: input => {
        const now = nowIso();
        const record: MaintenanceRecordDTO = {
          ...input,
          id: uuid(),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        set({ records: [...get().records, record] });
        enqueueSync('maintenance', record.id);
        return record;
      },

      updateRecord: (id, input) => {
        const current = get().records.find(r => r.id === id);
        if (!current) return;
        const next = {
          ...current,
          ...input,
          updatedAt: laterThan(current.updatedAt),
        };
        set({ records: get().records.map(r => (r.id === id ? next : r)) });
        enqueueSync('maintenance', id);
      },

      removeRecord: id => {
        set({ records: get().records.filter(r => r.id !== id) });
        enqueueSync('maintenance', id, 'delete');
      },

      applyRemote: remote => {
        const others = get().records.filter(r => r.id !== remote.id);
        set({ records: [...others, remote] });
      },
      removeLocal: id =>
        set({ records: get().records.filter(r => r.id !== id) }),
      reset: () => set({ records: [] }),
    }),
    persistOptions('maintenance'),
  ),
);

/** Newest service first. */
export function sortRecords(
  records: MaintenanceRecordDTO[],
): MaintenanceRecordDTO[] {
  return [...records].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}
