import type { TelemetrySnapshot, VehicleCapabilities } from '@/types/telemetry';

export type VehicleSourceId = 'mock';

/**
 * Where vehicle data comes from. The UI never talks to a source directly -
 * it goes through VehicleService - so a Bluetooth source can be added later
 * without touching any screen.
 */
export interface VehicleSource {
  readonly id: VehicleSourceId;
  /** Name shown as the connected scooter, e.g. "MOCK VEHICLE". */
  readonly displayName: string;
  /** True for simulated data; the UI labels it clearly. */
  readonly isSimulated: boolean;
  readonly capabilities: VehicleCapabilities;
  /** Starts producing snapshots. Rejects if the connection cannot be made. */
  start(onSnapshot: (snapshot: TelemetrySnapshot) => void): Promise<void>;
  stop(): Promise<void>;
}
