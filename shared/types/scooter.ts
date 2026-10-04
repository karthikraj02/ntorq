import type { SyncableDTO } from './common';

export interface ScooterDTO extends SyncableDTO {
  name: string;
  vehicleModel: string;
  modelYear: number | null;
  registrationNumber: string | null;
  vin: string | null;
  engineNumber: string | null;
  /** Typed in by the rider until an electronic odometer source is verified. */
  odometerKm: number | null;
  odometerUpdatedAt: string | null;
}
