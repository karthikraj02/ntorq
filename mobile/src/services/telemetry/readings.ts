import type { TelemetrySource } from '@shared/constants';
import type { TelemetryReading } from '@/types/telemetry';

export function makeReading<T = number>(
  value: T,
  unit: string,
  source: TelemetrySource,
  verified: boolean,
  timestamp: number = Date.now(),
): TelemetryReading<T> {
  return { value, unit, timestamp, source, verified };
}

/** The numeric value of a reading, or null when it is unavailable. */
export function valueOf(reading: TelemetryReading | undefined): number | null {
  return reading && Number.isFinite(reading.value) ? reading.value : null;
}
