import type { RideDTO, RideSource } from '@shared/types';
import type { LiveRide } from '@/store/tripStore';
import { idleRide } from '@/store/tripStore';
import type { TelemetrySnapshot } from '@/types/telemetry';
import { uuid } from '@/utils/uuid';
import { valueOf } from './readings';
import { TripAccumulator } from './TripAccumulator';

const HISTORY_LENGTH = 120;

export interface RideRecorderDeps {
  /** Subscribe to telemetry; returns an unsubscribe function. */
  onTelemetry: (listener: (snapshot: TelemetrySnapshot) => void) => () => void;
  now: () => number;
  scooterId: () => string;
  rideSource: () => RideSource;
  publish: (live: LiveRide) => void;
  saveRide: (ride: RideDTO) => void;
}

/**
 * Records one ride from telemetry: start -> (pause <-> resume)* -> end.
 * All inputs are injected so the logic is testable without a vehicle.
 */
export class RideRecorder {
  private accumulator = new TripAccumulator();
  private unsubscribe: (() => void) | null = null;
  private startedAt: number | null = null;
  private speedHistory: number[] = [];
  private pauseReason: string | null = null;
  private source: RideSource = 'mock';

  constructor(private readonly deps: RideRecorderDeps) {}

  get isActive(): boolean {
    return this.startedAt !== null;
  }

  start(): void {
    if (this.isActive) return;
    const now = this.deps.now();
    this.startedAt = now;
    this.source = this.deps.rideSource();
    this.speedHistory = [];
    this.pauseReason = null;
    this.accumulator = new TripAccumulator();
    this.accumulator.start(now);
    this.unsubscribe = this.deps.onTelemetry(snapshot =>
      this.onSnapshot(snapshot),
    );
    this.publishLive('recording');
  }

  pause(reason: string | null = null): void {
    if (!this.isActive || this.accumulator.isPaused) return;
    this.accumulator.pause(this.deps.now());
    this.pauseReason = reason;
    this.publishLive('paused');
  }

  resume(): void {
    if (!this.isActive || !this.accumulator.isPaused) return;
    this.accumulator.resume(this.deps.now());
    this.pauseReason = null;
    this.publishLive('recording');
  }

  /** Finishes the ride and stores it. Returns the saved ride, or null if none was active. */
  end(): RideDTO | null {
    if (this.startedAt === null) return null;
    const now = this.deps.now();
    const summary = this.accumulator.summary(now);
    const startedAt = this.startedAt;
    this.reset();

    const stamp = new Date(now).toISOString();
    const ride: RideDTO = {
      id: uuid(),
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
      scooterId: this.deps.scooterId(),
      source: this.source,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: stamp,
      distanceKm: round(summary.distanceKm, 3),
      ridingTimeSec: Math.round(summary.ridingTimeSec),
      elapsedSec: Math.round(summary.elapsedSec),
      averageSpeedKmh:
        summary.averageSpeedKmh === null
          ? null
          : round(summary.averageSpeedKmh, 1),
      maxSpeedKmh:
        summary.maxSpeedKmh === null ? null : round(summary.maxSpeedKmh, 1),
    };
    this.deps.saveRide(ride);
    return ride;
  }

  /** Throws the ride away without saving it. */
  discard(): void {
    this.reset();
  }

  private onSnapshot(snapshot: TelemetrySnapshot): void {
    if (!this.isActive || this.accumulator.isPaused) return;
    const now = this.deps.now();
    const speed = valueOf(snapshot.speed);
    this.accumulator.addSample(now, speed);
    if (speed !== null) {
      this.speedHistory = [...this.speedHistory, speed].slice(-HISTORY_LENGTH);
    }
    this.publishLive('recording');
  }

  private publishLive(status: LiveRide['status']): void {
    this.deps.publish({
      status,
      startedAt: this.startedAt,
      summary: this.accumulator.summary(this.deps.now()),
      speedHistory: this.speedHistory,
      pauseReason: this.pauseReason,
    });
  }

  private reset(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.startedAt = null;
    this.speedHistory = [];
    this.pauseReason = null;
    this.accumulator = new TripAccumulator();
    this.deps.publish(idleRide);
  }
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
