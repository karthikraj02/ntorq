import type { TelemetrySource } from '../constants/telemetry';

/** One stored sample of decoded telemetry. Absent values are `null`, never faked. */
export interface TelemetrySampleDTO {
  scooterId: string;
  rideId: string | null;
  timestamp: string;
  source: TelemetrySource;
  verified: boolean;
  speedKmh: number | null;
  rpm: number | null;
  fuelPercent: number | null;
  batteryVolts: number | null;
  engineTempC: number | null;
  odometerKm: number | null;
}
