import { VEHICLE_MODEL } from '@shared/constants';
import type { ScooterDTO } from '@shared/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { laterThan, nowIso } from '@/utils/dates';
import { uuid } from '@/utils/uuid';
import { persistOptions } from './storage';
import { enqueueSync } from './syncStore';

/** Fields the rider can edit. */
export type ScooterPatch = Partial<
  Omit<ScooterDTO, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
>;

interface ScooterState {
  scooter: ScooterDTO | null;
  /** Creates the profile on first launch. Not synced until the rider edits it. */
  ensureScooter: () => ScooterDTO;
  updateScooter: (patch: ScooterPatch) => void;
  /** Merges a server copy without queueing it for upload. */
  applyRemote: (remote: ScooterDTO) => void;
  reset: () => void;
}

export function createDefaultScooter(): ScooterDTO {
  const now = nowIso();
  return {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    name: 'My Ntorq',
    vehicleModel: VEHICLE_MODEL,
    modelYear: null,
    registrationNumber: null,
    vin: null,
    engineNumber: null,
    odometerKm: null,
    odometerUpdatedAt: null,
  };
}

/** True while the profile has never been edited. */
export function isPristine(scooter: ScooterDTO): boolean {
  return scooter.createdAt === scooter.updatedAt;
}

export const useScooterStore = create<ScooterState>()(
  persist(
    (set, get) => ({
      scooter: null,

      ensureScooter: () => {
        const existing = get().scooter;
        if (existing) return existing;
        const created = createDefaultScooter();
        set({ scooter: created });
        return created;
      },

      updateScooter: patch => {
        const current = get().ensureScooter();
        const now = laterThan(current.updatedAt);
        const next: ScooterDTO = {
          ...current,
          ...patch,
          updatedAt: now,
          odometerUpdatedAt:
            patch.odometerKm !== undefined ? now : current.odometerUpdatedAt,
        };
        set({ scooter: next });
        enqueueSync('scooters', next.id);
      },

      applyRemote: remote => set({ scooter: remote }),
      reset: () => set({ scooter: null }),
    }),
    persistOptions('scooter'),
  ),
);

export function selectOdometer(state: ScooterState): number | null {
  return state.scooter?.odometerKm ?? null;
}
