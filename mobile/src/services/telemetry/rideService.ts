import { useRideStore } from '@/store/rideStore';
import { useScooterStore } from '@/store/scooterStore';
import { idleRide, useTripStore } from '@/store/tripStore';
import { useVehicleStore } from '@/store/vehicleStore';
import { log } from '@/utils/logger';
import { vehicleService } from '../vehicle';
import { RideRecorder } from './RideRecorder';

export const recorder = new RideRecorder({
  onTelemetry: listener => vehicleService.onTelemetry(listener),
  now: () => Date.now(),
  scooterId: () => useScooterStore.getState().ensureScooter().id,
  rideSource: () =>
    useVehicleStore.getState().isSimulated ? 'mock' : 'vehicle',
  publish: live => useTripStore.setState(live, true),
  saveRide: ride => {
    useRideStore.getState().addRide(ride);
    log.info('ride', `Saved ride ${ride.id} (${ride.distanceKm} km)`);
  },
});

export type StartRideResult = { ok: true } | { ok: false; message: string };

export function startRide(): StartRideResult {
  if (useVehicleStore.getState().connection !== 'connected') {
    return {
      ok: false,
      message:
        'Connect to your scooter (or start the mock vehicle) before starting a ride.',
    };
  }
  recorder.start();
  return { ok: true };
}

// A ride cannot be measured without data, so losing the connection pauses it.
useVehicleStore.subscribe((state, previous) => {
  if (previous.connection === 'connected' && state.connection !== 'connected') {
    recorder.pause('Connection to the scooter was lost.');
  }
});

/** For tests and "Clear local data". */
export function resetLiveRide(): void {
  recorder.discard();
  useTripStore.setState(idleRide, true);
}
