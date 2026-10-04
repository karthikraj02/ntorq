import { create } from 'zustand';
import {
  NO_CAPABILITIES,
  type ConnectionState,
  type TelemetrySnapshot,
  type VehicleCapabilities,
} from '@/types/telemetry';

interface VehicleState {
  connection: ConnectionState;
  /** Name of the connected scooter, e.g. "MOCK VEHICLE". Null when disconnected. */
  deviceName: string | null;
  isSimulated: boolean;
  capabilities: VehicleCapabilities;
  snapshot: TelemetrySnapshot;
  error: string | null;
}

export const initialVehicleState: VehicleState = {
  connection: 'disconnected',
  deviceName: null,
  isSimulated: false,
  capabilities: NO_CAPABILITIES,
  snapshot: {},
  error: null,
};

/** Live vehicle state. Deliberately not persisted: stale telemetry must never look current. */
export const useVehicleStore = create<VehicleState>()(
  () => initialVehicleState,
);
