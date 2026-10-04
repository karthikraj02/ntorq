import type { RideDTO } from '@shared/types';
import {
  RideRecorder,
  type RideRecorderDeps,
} from '@/services/telemetry/RideRecorder';
import { TripAccumulator } from '@/services/telemetry/TripAccumulator';
import type { LiveRide } from '@/store/tripStore';
import type { TelemetrySnapshot } from '@/types/telemetry';

const SEC = 1000;

describe('TripAccumulator', () => {
  it('integrates constant speed into distance', () => {
    const trip = new TripAccumulator();
    trip.start(0);
    for (let t = 0; t <= 3600; t += 1) trip.addSample(t * SEC, 36); // 36 km/h for one hour
    const summary = trip.summary(3600 * SEC);
    expect(summary.distanceKm).toBeCloseTo(36, 3);
    expect(summary.averageSpeedKmh).toBeCloseTo(36, 3);
    expect(summary.maxSpeedKmh).toBe(36);
    expect(summary.ridingTimeSec).toBeCloseTo(3600, 1);
    expect(summary.elapsedSec).toBeCloseTo(3600, 1);
  });

  it('uses the trapezoid rule for changing speed', () => {
    const trip = new TripAccumulator();
    trip.start(0);
    trip.addSample(0, 0);
    trip.addSample(3 * SEC, 60); // mean 30 km/h over 3 s
    expect(trip.summary(3 * SEC).distanceKm).toBeCloseTo((30 * 3) / 3600, 6);
  });

  it('does not count stationary time as riding time, so average speed is not dragged down', () => {
    const trip = new TripAccumulator();
    trip.start(0);
    for (let t = 0; t <= 60; t++) trip.addSample(t * SEC, 0); // a minute at a red light
    for (let t = 61; t <= 120; t++) trip.addSample(t * SEC, 30); // a minute at 30 km/h
    const summary = trip.summary(120 * SEC);
    expect(summary.ridingTimeSec).toBeGreaterThan(58);
    expect(summary.ridingTimeSec).toBeLessThan(62);
    expect(summary.averageSpeedKmh).toBeCloseTo(30, 0);
    expect(summary.elapsedSec).toBe(120);
  });

  it('has no average speed before any movement', () => {
    const trip = new TripAccumulator();
    trip.start(0);
    trip.addSample(0, 0);
    trip.addSample(1 * SEC, 0);
    const summary = trip.summary(2 * SEC);
    expect(summary.averageSpeedKmh).toBeNull();
    expect(summary.maxSpeedKmh).toBe(0);
    expect(summary.distanceKm).toBe(0);
  });

  it('never adds distance across a data gap', () => {
    const trip = new TripAccumulator();
    trip.start(0);
    trip.addSample(0, 60);
    trip.addSample(1 * SEC, 60);
    trip.addSample(120 * SEC, 60); // 2 minutes of silence
    expect(trip.summary(120 * SEC).distanceKm).toBeCloseTo(60 / 3600, 6); // only the first second
  });

  it('treats an unavailable speed as a break, not as zero or as the previous value', () => {
    const trip = new TripAccumulator();
    trip.start(0);
    trip.addSample(0, 60);
    trip.addSample(1 * SEC, null);
    trip.addSample(2 * SEC, 60);
    expect(trip.summary(2 * SEC).distanceKm).toBe(0);
    trip.addSample(3 * SEC, 60);
    expect(trip.summary(3 * SEC).distanceKm).toBeCloseTo(60 / 3600, 6);
  });

  it('ignores invalid speeds', () => {
    const trip = new TripAccumulator();
    trip.start(0);
    trip.addSample(0, Number.NaN);
    trip.addSample(SEC, -5);
    trip.addSample(2 * SEC, 40);
    expect(trip.summary(2 * SEC).maxSpeedKmh).toBe(40);
    expect(trip.summary(2 * SEC).distanceKm).toBe(0);
  });

  it('stops measuring while paused and excludes paused time', () => {
    const trip = new TripAccumulator();
    trip.start(0);
    for (let t = 0; t <= 10; t++) trip.addSample(t * SEC, 36); // 10 s at 36 km/h
    trip.pause(10 * SEC);
    for (let t = 11; t <= 39; t++) trip.addSample(t * SEC, 36); // ignored while paused
    expect(trip.summary(40 * SEC).elapsedSec).toBe(10); // the clock is frozen
    expect(trip.summary(40 * SEC).distanceKm).toBeCloseTo(0.1, 4);

    trip.resume(40 * SEC);
    for (let t = 40; t <= 50; t++) trip.addSample(t * SEC, 36); // 10 more seconds
    const summary = trip.summary(50 * SEC);
    expect(summary.distanceKm).toBeCloseTo(0.2, 4);
    expect(summary.elapsedSec).toBe(20);
  });

  it('ignores samples before it is started', () => {
    const trip = new TripAccumulator();
    trip.addSample(0, 50);
    expect(trip.isStarted).toBe(false);
    expect(trip.summary(1000).distanceKm).toBe(0);
  });
});

describe('RideRecorder', () => {
  function setup(rideSource: 'mock' | 'vehicle' = 'mock') {
    let now = 1_000_000;
    let listener: ((snapshot: TelemetrySnapshot) => void) | null = null;
    const published: LiveRide[] = [];
    const saved: RideDTO[] = [];
    const unsubscribe = jest.fn();

    const deps: RideRecorderDeps = {
      onTelemetry: l => {
        listener = l;
        return unsubscribe;
      },
      now: () => now,
      scooterId: () => 'scooter-1',
      rideSource: () => rideSource,
      publish: live => published.push(live),
      saveRide: ride => saved.push(ride),
    };
    const recorder = new RideRecorder(deps);
    const feed = (speed: number | null, advanceMs = 1000) => {
      now += advanceMs;
      listener?.(
        speed === null
          ? {}
          : {
              speed: {
                value: speed,
                unit: 'km/h',
                timestamp: now,
                source: 'mock',
                verified: false,
              },
            },
      );
    };
    return {
      recorder,
      feed,
      published,
      saved,
      unsubscribe,
      tick: (ms: number) => (now += ms),
    };
  }

  it('records a ride from telemetry and saves it with its source', () => {
    const { recorder, feed, saved, published } = setup('mock');
    recorder.start();
    expect(recorder.isActive).toBe(true);
    expect(published.at(-1)?.status).toBe('recording');

    feed(0);
    for (let i = 0; i < 60; i++) feed(36); // 60 s at 36 km/h
    const ride = recorder.end();

    expect(ride).not.toBeNull();
    expect(saved).toHaveLength(1);
    expect(ride).toMatchObject({
      scooterId: 'scooter-1',
      source: 'mock',
      deletedAt: null,
      maxSpeedKmh: 36,
    });
    // 59 s at 36 km/h plus the first second ramping 0 -> 36 (trapezoid rule)
    expect(ride?.distanceKm).toBeCloseTo(0.595, 3);
    expect(ride?.averageSpeedKmh).toBeCloseTo(36, 0);
    expect(ride?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(published.at(-1)?.status).toBe('idle');
    expect(recorder.isActive).toBe(false);
  });

  it('tags real-vehicle rides as "vehicle"', () => {
    const { recorder, saved } = setup('vehicle');
    recorder.start();
    recorder.end();
    expect(saved[0]?.source).toBe('vehicle');
  });

  it('stops listening when the ride ends and never double-saves', () => {
    const { recorder, saved, unsubscribe } = setup();
    recorder.start();
    expect(recorder.end()).not.toBeNull();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(recorder.end()).toBeNull();
    expect(saved).toHaveLength(1);
  });

  it('records nothing while paused, and resumes cleanly', () => {
    const { recorder, feed, published } = setup();
    recorder.start();
    feed(36);
    feed(36);
    recorder.pause('Connection to the scooter was lost.');
    expect(published.at(-1)).toMatchObject({
      status: 'paused',
      pauseReason: 'Connection to the scooter was lost.',
    });
    const distanceWhenPaused = published.at(-1)?.summary.distanceKm;
    feed(36);
    feed(36);
    expect(published.at(-1)?.summary.distanceKm).toBe(distanceWhenPaused);

    recorder.resume();
    expect(published.at(-1)).toMatchObject({
      status: 'recording',
      pauseReason: null,
    });
    feed(36);
    feed(36);
    expect(published.at(-1)?.summary.distanceKm).toBeGreaterThan(
      distanceWhenPaused ?? 0,
    );
  });

  it('keeps a bounded speed history for the live chart and skips unavailable speeds', () => {
    const { recorder, feed, published } = setup();
    recorder.start();
    for (let i = 0; i < 300; i++) feed(i % 50);
    feed(null);
    const history = published.at(-1)?.speedHistory ?? [];
    expect(history.length).toBe(120);
    expect(history.every(Number.isFinite)).toBe(true);
  });

  it('discard() throws the ride away without saving', () => {
    const { recorder, saved, published } = setup();
    recorder.start();
    recorder.discard();
    expect(saved).toHaveLength(0);
    expect(published.at(-1)?.status).toBe('idle');
  });

  it('ignores pause/resume/end when idle', () => {
    const { recorder, saved } = setup();
    recorder.pause();
    recorder.resume();
    expect(recorder.end()).toBeNull();
    expect(saved).toHaveLength(0);
  });
});
