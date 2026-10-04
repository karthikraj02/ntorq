import type { SyncEntity } from '@shared/constants';
import type {
  MaintenanceRecordDTO,
  RideDTO,
  ScooterDTO,
  ServiceReminderDTO,
  SyncableDTO,
} from '@shared/types';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { isSyncable, useRideStore } from '@/store/rideStore';
import { isPristine, useScooterStore } from '@/store/scooterStore';
import { useServiceStore } from '@/store/serviceStore';
import { useSyncStore } from '@/store/syncStore';
import { log } from '@/utils/logger';

/** How the sync engine reads and writes one kind of local record. */
export interface SyncAdapter<T extends SyncableDTO = SyncableDTO> {
  entity: SyncEntity;
  get(id: string): T | undefined;
  /** Records that must stay on the phone (e.g. simulated rides) return false. */
  shouldSync(record: T): boolean;
  /** Stores a server copy locally without queueing it for upload. */
  applyRemote(remote: T): void;
  removeLocal(id: string): void;
}

const scooterAdapter: SyncAdapter<ScooterDTO> = {
  entity: 'scooters',
  get: id => {
    const scooter = useScooterStore.getState().scooter;
    return scooter?.id === id ? scooter : undefined;
  },
  shouldSync: () => true,
  applyRemote: remote => {
    const { scooter: local } = useScooterStore.getState();
    if (!local || local.id === remote.id) {
      useScooterStore.getState().applyRemote(remote);
      return;
    }
    // A different scooter exists on the server (e.g. a reinstall or new phone).
    // Adopt it only if this phone has nothing of its own worth keeping.
    const untouched =
      isPristine(local) &&
      useSyncStore.getState().queue.length === 0 &&
      useMaintenanceStore.getState().records.length === 0;
    if (untouched) {
      useServiceStore.getState().removeForScooter(local.id);
      useScooterStore.getState().applyRemote(remote);
      log.info('sync', 'Adopted the scooter profile stored on the server');
    } else {
      log.warn(
        'sync',
        'Ignored a different scooter on the server; local data was kept',
      );
    }
  },
  removeLocal: () => {
    // The single local scooter profile is never removed by a remote deletion.
  },
};

function belongsToLocalScooter(record: { scooterId: string }): boolean {
  return record.scooterId === useScooterStore.getState().scooter?.id;
}

const reminderAdapter: SyncAdapter<ServiceReminderDTO> = {
  entity: 'service-reminders',
  get: id => useServiceStore.getState().reminders.find(r => r.id === id),
  shouldSync: () => true,
  applyRemote: remote => {
    if (belongsToLocalScooter(remote))
      useServiceStore.getState().applyRemote(remote);
  },
  removeLocal: id => useServiceStore.getState().removeLocal(id),
};

const maintenanceAdapter: SyncAdapter<MaintenanceRecordDTO> = {
  entity: 'maintenance',
  get: id => useMaintenanceStore.getState().records.find(r => r.id === id),
  shouldSync: () => true,
  applyRemote: remote => {
    if (belongsToLocalScooter(remote))
      useMaintenanceStore.getState().applyRemote(remote);
  },
  removeLocal: id => useMaintenanceStore.getState().removeLocal(id),
};

const rideAdapter: SyncAdapter<RideDTO> = {
  entity: 'rides',
  get: id => useRideStore.getState().rides.find(r => r.id === id),
  shouldSync: isSyncable,
  applyRemote: remote => {
    if (belongsToLocalScooter(remote))
      useRideStore.getState().applyRemote(remote);
  },
  removeLocal: id => useRideStore.getState().removeLocal(id),
};

/** In dependency order: the scooter first, so later records can be matched to it. */
export const SYNC_ADAPTERS = [
  scooterAdapter,
  reminderAdapter,
  maintenanceAdapter,
  rideAdapter,
] as unknown as SyncAdapter[];
