import type { RideDTO } from '@shared/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistOptions } from './storage';
import { enqueueSync } from './syncStore';

interface RideState {
  rides: RideDTO[];
  addRide: (ride: RideDTO) => void;
  removeRide: (id: string) => void;
  applyRemote: (remote: RideDTO) => void;
  removeLocal: (id: string) => void;
  /** Deletes simulated rides (they are never uploaded). */
  clearMockRides: () => void;
  reset: () => void;
}

/** Simulated rides stay on the phone: they must never mix into the rider's real history. */
export function isSyncable(ride: RideDTO): boolean {
  return ride.source !== 'mock';
}

export const useRideStore = create<RideState>()(
  persist(
    (set, get) => ({
      rides: [],

      addRide: ride => {
        set({ rides: [ride, ...get().rides] });
        if (isSyncable(ride)) enqueueSync('rides', ride.id);
      },

      removeRide: id => {
        const ride = get().rides.find(r => r.id === id);
        set({ rides: get().rides.filter(r => r.id !== id) });
        if (ride && isSyncable(ride)) enqueueSync('rides', id, 'delete');
      },

      applyRemote: remote => {
        const others = get().rides.filter(r => r.id !== remote.id);
        set({ rides: [remote, ...others] });
      },
      removeLocal: id => set({ rides: get().rides.filter(r => r.id !== id) }),
      clearMockRides: () => set({ rides: get().rides.filter(isSyncable) }),
      reset: () => set({ rides: [] }),
    }),
    persistOptions('rides'),
  ),
);
