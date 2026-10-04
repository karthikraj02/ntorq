import {
  DEFAULT_ENABLED_SERVICE_TYPES,
  SERVICE_ITEM_TYPES,
} from '@shared/constants';
import type { ServiceReminderDTO } from '@shared/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { laterThan, nowIso } from '@/utils/dates';
import { uuid } from '@/utils/uuid';
import { persistOptions } from './storage';
import { enqueueSync } from './syncStore';

export type ReminderPatch = Partial<
  Omit<
    ServiceReminderDTO,
    'id' | 'scooterId' | 'type' | 'createdAt' | 'updatedAt' | 'deletedAt'
  >
>;

interface ServiceState {
  reminders: ServiceReminderDTO[];
  /** Creates one reminder per service type the first time the app runs. */
  ensureDefaults: (scooterId: string) => void;
  updateReminder: (id: string, patch: ReminderPatch) => void;
  addCustomReminder: (scooterId: string, label: string) => ServiceReminderDTO;
  removeReminder: (id: string) => void;
  applyRemote: (remote: ServiceReminderDTO) => void;
  removeLocal: (id: string) => void;
  removeForScooter: (scooterId: string) => void;
  reset: () => void;
}

export function createReminder(
  scooterId: string,
  type: ServiceReminderDTO['type'],
  overrides: Partial<ServiceReminderDTO> = {},
): ServiceReminderDTO {
  const now = nowIso();
  return {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    scooterId,
    type,
    label: null,
    enabled: DEFAULT_ENABLED_SERVICE_TYPES[type],
    // Intervals are NOT preset: the app does not know the official ones.
    intervalKm: null,
    intervalMonths: null,
    lastServiceDate: null,
    lastServiceKm: null,
    manualNextDueKm: null,
    manualNextDueDate: null,
    notes: null,
    ...overrides,
  };
}

export const useServiceStore = create<ServiceState>()(
  persist(
    (set, get) => ({
      reminders: [],

      ensureDefaults: scooterId => {
        if (get().reminders.some(r => r.scooterId === scooterId)) return;
        const defaults = SERVICE_ITEM_TYPES.filter(
          type => type !== 'other',
        ).map(type => createReminder(scooterId, type));
        set({ reminders: [...get().reminders, ...defaults] });
      },

      updateReminder: (id, patch) => {
        const current = get().reminders.find(r => r.id === id);
        if (!current) return;
        const next = {
          ...current,
          ...patch,
          updatedAt: laterThan(current.updatedAt),
        };
        set({ reminders: get().reminders.map(r => (r.id === id ? next : r)) });
        enqueueSync('service-reminders', id);
      },

      addCustomReminder: (scooterId, label) => {
        const reminder = createReminder(scooterId, 'other', {
          label: label.trim(),
          enabled: true,
        });
        set({ reminders: [...get().reminders, reminder] });
        enqueueSync('service-reminders', reminder.id);
        return reminder;
      },

      removeReminder: id => {
        set({ reminders: get().reminders.filter(r => r.id !== id) });
        enqueueSync('service-reminders', id, 'delete');
      },

      applyRemote: remote => {
        const others = get().reminders.filter(r => r.id !== remote.id);
        set({ reminders: [...others, remote] });
      },
      removeLocal: id =>
        set({ reminders: get().reminders.filter(r => r.id !== id) }),
      removeForScooter: scooterId =>
        set({
          reminders: get().reminders.filter(r => r.scooterId !== scooterId),
        }),
      reset: () => set({ reminders: [] }),
    }),
    persistOptions('service'),
  ),
);
