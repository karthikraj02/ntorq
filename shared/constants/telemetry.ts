/**
 * Where a telemetry value came from.
 *  - vehicle:     decoded from the scooter (only once a protocol is verified)
 *  - mock:        produced by the built-in simulator
 *  - app-derived: computed by the app from other readings (e.g. trip distance)
 *  - user:        typed in by the rider (e.g. odometer)
 */
export const TELEMETRY_SOURCES = [
  'vehicle',
  'mock',
  'app-derived',
  'user',
] as const;

export type TelemetrySource = (typeof TELEMETRY_SOURCES)[number];
