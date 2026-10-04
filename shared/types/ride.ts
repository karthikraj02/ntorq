import type { SyncableDTO } from './common';

export type RideSource = 'vehicle' | 'mock';

export interface RideDTO extends SyncableDTO {
  scooterId: string;
  source: RideSource;
  startedAt: string;
  endedAt: string;
  distanceKm: number;
  /** Time spent moving. */
  ridingTimeSec: number;
  /** Wall-clock time between start and end, excluding paused periods. */
  elapsedSec: number;
  averageSpeedKmh: number | null;
  maxSpeedKmh: number | null;
}
