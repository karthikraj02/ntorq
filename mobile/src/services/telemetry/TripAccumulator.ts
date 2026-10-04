import type { TripSummary } from '@/types/telemetry';

/** Gaps longer than this are treated as lost data rather than integrated over. */
const MAX_GAP_MS = 5000;
/** Below this speed the scooter counts as stationary (no riding time). */
const MOVING_THRESHOLD_KMH = 1;

/**
 * Integrates speed samples into trip figures.
 *
 * It only uses speed values it is given. Unavailable speed readings must be
 * passed as `null`: they end the current integration segment instead of being
 * guessed, so a data dropout can never add distance.
 */
export class TripAccumulator {
  private startedAt: number | null = null;
  private pausedAt: number | null = null;
  private pausedTotalMs = 0;
  private lastSample: { t: number; speedKmh: number } | null = null;
  private distanceKm = 0;
  private movingMs = 0;
  private maxSpeedKmh: number | null = null;

  get isStarted(): boolean {
    return this.startedAt !== null;
  }

  get isPaused(): boolean {
    return this.pausedAt !== null;
  }

  start(nowMs: number): void {
    this.startedAt = nowMs;
    this.pausedAt = null;
    this.pausedTotalMs = 0;
    this.lastSample = null;
    this.distanceKm = 0;
    this.movingMs = 0;
    this.maxSpeedKmh = null;
  }

  pause(nowMs: number): void {
    if (this.startedAt === null || this.pausedAt !== null) return;
    this.pausedAt = nowMs;
    this.lastSample = null;
  }

  resume(nowMs: number): void {
    if (this.pausedAt === null) return;
    this.pausedTotalMs += nowMs - this.pausedAt;
    this.pausedAt = null;
    this.lastSample = null;
  }

  addSample(nowMs: number, speedKmh: number | null): void {
    if (this.startedAt === null || this.pausedAt !== null) return;
    if (speedKmh === null || !Number.isFinite(speedKmh) || speedKmh < 0) {
      this.lastSample = null;
      return;
    }

    this.maxSpeedKmh = Math.max(this.maxSpeedKmh ?? 0, speedKmh);

    const previous = this.lastSample;
    this.lastSample = { t: nowMs, speedKmh };
    if (!previous) return;

    const dtMs = nowMs - previous.t;
    if (dtMs <= 0 || dtMs > MAX_GAP_MS) return;

    // Trapezoid rule between the two samples.
    const meanKmh = (previous.speedKmh + speedKmh) / 2;
    this.distanceKm += (meanKmh * dtMs) / 3_600_000;
    if (Math.max(previous.speedKmh, speedKmh) >= MOVING_THRESHOLD_KMH) {
      this.movingMs += dtMs;
    }
  }

  summary(nowMs: number): TripSummary {
    const startedAt = this.startedAt ?? nowMs;
    const endOfActive = this.pausedAt ?? nowMs;
    const elapsedMs = Math.max(0, endOfActive - startedAt - this.pausedTotalMs);
    const ridingTimeSec = this.movingMs / 1000;

    return {
      distanceKm: this.distanceKm,
      ridingTimeSec,
      elapsedSec: elapsedMs / 1000,
      averageSpeedKmh:
        this.movingMs > 0
          ? this.distanceKm / (this.movingMs / 3_600_000)
          : null,
      maxSpeedKmh: this.maxSpeedKmh,
    };
  }
}
