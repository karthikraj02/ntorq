import type { TelemetrySource } from '@shared/constants';

/**
 * One measured value. Every parameter carries where it came from and whether
 * its decoding has been verified, so the UI can never present a guess as fact.
 */
export interface TelemetryReading<T = number> {
  value: T;
  unit: string;
  /** Epoch milliseconds at which the value was produced. */
  timestamp: number;
  source: TelemetrySource;
  /** True only once this field's decoding was verified on the real vehicle. */
  verified: boolean;
}

export type EngineStatus = 'running' | 'stopped' | 'unknown';

/** A parameter that is missing from the snapshot is "unavailable" - shown as N/A. */
export interface TelemetrySnapshot {
  speed?: TelemetryReading;
  rpm?: TelemetryReading;
  fuelLevel?: TelemetryReading;
  engineTemperature?: TelemetryReading;
  batteryVoltage?: TelemetryReading;
  odometer?: TelemetryReading;
  engineStatus?: TelemetryReading<EngineStatus>;
}

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/**
 *  - unavailable: the app has no way to do this
 *  - simulated:   only the mock vehicle provides it
 *  - verified:    confirmed to work on the rider's own scooter
 */
export type CapabilityStatus = 'unavailable' | 'simulated' | 'verified';

export interface VehicleCapabilities {
  telemetry: CapabilityStatus;
  diagnostics: CapabilityStatus;
  oilReminderRead: CapabilityStatus;
  oilReminderReset: CapabilityStatus;
}

export const NO_CAPABILITIES: VehicleCapabilities = {
  telemetry: 'unavailable',
  diagnostics: 'unavailable',
  oilReminderRead: 'unavailable',
  oilReminderReset: 'unavailable',
};

export type CommandStatus = 'NOT_SUPPORTED' | 'SUCCESS' | 'FAILED';

export interface CommandResult {
  status: CommandStatus;
  message: string;
}

export interface TripSummary {
  distanceKm: number;
  /** Time spent actually moving. */
  ridingTimeSec: number;
  /** Recording time excluding paused periods. */
  elapsedSec: number;
  averageSpeedKmh: number | null;
  maxSpeedKmh: number | null;
}
