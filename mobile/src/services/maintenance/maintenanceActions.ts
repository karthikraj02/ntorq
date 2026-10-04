import type { MaintenanceRecordDTO } from '@shared/types';
import {
  useMaintenanceStore,
  type MaintenanceInput,
} from '@/store/maintenanceStore';
import { useScooterStore } from '@/store/scooterStore';
import { useServiceStore } from '@/store/serviceStore';
import { completedPatch } from './serviceCalculations';

export interface RecordMaintenanceOptions {
  /** Also mark the matching service reminder as just carried out. */
  updateReminder: boolean;
  /** Raise the stored odometer to the mileage of this service, if it is higher. */
  updateOdometer: boolean;
}

/**
 * Records a completed service in the app's own database. This never talks to
 * the vehicle: it updates the app reminder only, not the instrument cluster.
 */
export function recordMaintenance(
  input: MaintenanceInput,
  options: RecordMaintenanceOptions,
): MaintenanceRecordDTO {
  const record = useMaintenanceStore.getState().addRecord(input);
  if (options.updateReminder) advanceReminder(input);
  if (options.updateOdometer) raiseOdometer(input.mileageKm);
  return record;
}

function advanceReminder(input: MaintenanceInput): void {
  if (input.serviceType === 'other') return; // custom items are matched by the rider, not by type
  const reminder = useServiceStore
    .getState()
    .reminders.find(
      r =>
        r.scooterId === input.scooterId &&
        r.type === input.serviceType &&
        r.enabled,
    );
  if (!reminder) return;
  // Entering an old service from the past must not rewind a more recent one.
  if (reminder.lastServiceDate && input.date < reminder.lastServiceDate) return;
  useServiceStore
    .getState()
    .updateReminder(reminder.id, completedPatch(input.date, input.mileageKm));
}

function raiseOdometer(mileageKm: number | null): void {
  if (mileageKm === null) return;
  const current = useScooterStore.getState().scooter?.odometerKm ?? null;
  if (current === null || mileageKm > current) {
    useScooterStore.getState().updateScooter({ odometerKm: mileageKm });
  }
}
