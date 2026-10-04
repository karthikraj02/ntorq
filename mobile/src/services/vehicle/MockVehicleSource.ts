import type { TelemetrySnapshot, VehicleCapabilities } from '@/types/telemetry';
import { makeReading } from '../telemetry/readings';
import { MockVehicleModel } from './MockVehicleModel';
import type { VehicleSource } from './VehicleSource';

export const MOCK_VEHICLE_NAME = 'MOCK VEHICLE';

const TICK_MS = 250;
const CONNECT_DELAY_MS = 600;

interface Timers {
  setInterval: (handler: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
  wait: (ms: number) => Promise<void>;
  now: () => number;
}

const realTimers: Timers = {
  setInterval: (handler, ms) => setInterval(handler, ms),
  clearInterval: handle =>
    clearInterval(handle as ReturnType<typeof setInterval>),
  wait: ms => new Promise(resolve => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

/**
 * Simulated scooter. Every reading is tagged source "mock" and verified:false.
 * It deliberately reports no odometer and no engine temperature, so the
 * dashboard shows "N/A" for those - and the rider's real odometer is never
 * touched by simulated riding.
 */
export class MockVehicleSource implements VehicleSource {
  readonly id = 'mock' as const;
  readonly displayName = MOCK_VEHICLE_NAME;
  readonly isSimulated = true;
  readonly capabilities: VehicleCapabilities = {
    telemetry: 'simulated',
    diagnostics: 'unavailable',
    oilReminderRead: 'unavailable',
    oilReminderReset: 'unavailable',
  };

  private handle: unknown = null;

  constructor(
    private readonly model: MockVehicleModel = new MockVehicleModel(),
    private readonly timers: Timers = realTimers,
  ) {}

  async start(
    onSnapshot: (snapshot: TelemetrySnapshot) => void,
  ): Promise<void> {
    await this.timers.wait(CONNECT_DELAY_MS);
    this.stopTicking();
    this.handle = this.timers.setInterval(() => {
      onSnapshot(this.snapshot(this.model.step(TICK_MS / 1000)));
    }, TICK_MS);
  }

  async stop(): Promise<void> {
    this.stopTicking();
  }

  private stopTicking(): void {
    if (this.handle !== null) {
      this.timers.clearInterval(this.handle);
      this.handle = null;
    }
  }

  private snapshot(
    state: ReturnType<MockVehicleModel['step']>,
  ): TelemetrySnapshot {
    const now = this.timers.now();
    return {
      speed: makeReading(state.speedKmh, 'km/h', 'mock', false, now),
      rpm: makeReading(state.rpm, 'rpm', 'mock', false, now),
      fuelLevel: makeReading(state.fuelPercent, '%', 'mock', false, now),
      batteryVoltage: makeReading(state.batteryVolts, 'V', 'mock', false, now),
      engineStatus: makeReading('running' as const, '', 'mock', false, now),
    };
  }
}
