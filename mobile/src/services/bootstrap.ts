import { useScooterStore } from '@/store/scooterStore';
import { useServiceStore } from '@/store/serviceStore';

/**
 * Makes sure the first launch has a scooter profile and its service reminders.
 * Safe to call repeatedly. Nothing created here is synced until the rider edits it.
 */
export function initializeLocalData(): void {
  const scooter = useScooterStore.getState().ensureScooter();
  useServiceStore.getState().ensureDefaults(scooter.id);
}
