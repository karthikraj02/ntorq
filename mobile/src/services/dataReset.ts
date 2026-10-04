import { authApi } from '@/services/api';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { useRideStore } from '@/store/rideStore';
import { useScooterStore } from '@/store/scooterStore';
import { useServiceStore } from '@/store/serviceStore';
import { useSyncStore } from '@/store/syncStore';
import { log } from '@/utils/logger';
import { initializeLocalData } from './bootstrap';
import { resetLiveRide } from './telemetry/rideService';

/**
 * Erases the scooter profile, reminders, maintenance, rides and the sync queue
 * from this phone and signs out. App settings (theme, backend address) are kept.
 * Data already uploaded to the account is not deleted.
 */
export async function clearLocalData(): Promise<void> {
  resetLiveRide();
  await authApi.logout();
  useMaintenanceStore.getState().reset();
  useRideStore.getState().reset();
  useServiceStore.getState().reset();
  useScooterStore.getState().reset();
  useSyncStore.getState().reset();
  initializeLocalData();
  log.info('data', 'Local data cleared');
}
