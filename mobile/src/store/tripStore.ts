import { create } from 'zustand';
import type { TripSummary } from '@/types/telemetry';

export type RideStatus = 'idle' | 'recording' | 'paused';

export interface LiveRide {
  status: RideStatus;
  startedAt: number | null;
  summary: TripSummary;
  /** Recent speeds (km/h) for the live chart. */
  speedHistory: number[];
  /** Why recording was paused automatically, if it was. */
  pauseReason: string | null;
}

export const EMPTY_SUMMARY: TripSummary = {
  distanceKm: 0,
  ridingTimeSec: 0,
  elapsedSec: 0,
  averageSpeedKmh: null,
  maxSpeedKmh: null,
};

export const idleRide: LiveRide = {
  status: 'idle',
  startedAt: null,
  summary: EMPTY_SUMMARY,
  speedHistory: [],
  pauseReason: null,
};

/** The ride currently being recorded. In memory only. */
export const useTripStore = create<LiveRide>()(() => idleRide);
