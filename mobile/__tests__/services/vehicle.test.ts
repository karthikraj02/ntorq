import { MockVehicleModel } from '@/services/vehicle/MockVehicleModel';
import { MockVehicleSource } from '@/services/vehicle/MockVehicleSource';
import {
  OIL_RESET_UNAVAILABLE_MESSAGE,
  VehicleService,
} from '@/services/vehicle/VehicleService';
import type { VehicleSource } from '@/services/vehicle/VehicleSource';
import { initialVehicleState, useVehicleStore } from '@/store/vehicleStore';
import type { TelemetrySnapshot } from '@/types/telemetry';

/** Deterministic pseudo-random numbers so simulation tests are repeatable. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('MockVehicleModel', () => {
  it('stays inside physically plausible ranges over a long simulated ride', () => {
    const model = new MockVehicleModel(seeded(42));
    let maxSpeed = 0;
    let sawMoving = false;
    let sawStopped = false;
    for (let i = 0; i < 4 * 600; i++) {
      const s = model.step(0.25); // ten simulated minutes
      expect(s.speedKmh).toBeGreaterThanOrEqual(0);
      expect(s.speedKmh).toBeLessThan(100);
      expect(s.rpm).toBeGreaterThan(1000);
      expect(s.rpm).toBeLessThanOrEqual(9000);
      expect(s.fuelPercent).toBeGreaterThanOrEqual(0);
      expect(s.fuelPercent).toBeLessThanOrEqual(100);
      expect(s.batteryVolts).toBeGreaterThan(12);
      expect(s.batteryVolts).toBeLessThan(15);
      maxSpeed = Math.max(maxSpeed, s.speedKmh);
      if (s.speedKmh > 1) sawMoving = true;
      if (s.speedKmh < 0.1) sawStopped = true;
    }
    expect(sawMoving).toBe(true);
    expect(sawStopped).toBe(true);
    expect(maxSpeed).toBeGreaterThan(20);
  });

  it('only ever burns fuel', () => {
    const model = new MockVehicleModel(seeded(7));
    let previous = model.state().fuelPercent;
    for (let i = 0; i < 2000; i++) {
      const { fuelPercent } = model.step(0.25);
      expect(fuelPercent).toBeLessThanOrEqual(previous);
      previous = fuelPercent;
    }
  });

  it('is repeatable for a given seed', () => {
    const a = new MockVehicleModel(seeded(1));
    const b = new MockVehicleModel(seeded(1));
    for (let i = 0; i < 200; i++) expect(a.step(0.25)).toEqual(b.step(0.25));
  });
});

describe('MockVehicleSource', () => {
  function fakeTimers() {
    let handler: (() => void) | null = null;
    return {
      timers: {
        setInterval: (fn: () => void) => {
          handler = fn;
          return 1;
        },
        clearInterval: jest.fn(() => {
          handler = null;
        }),
        wait: async () => undefined,
        now: () => 1234,
      },
      tick: () => handler?.(),
      isRunning: () => handler !== null,
    };
  }

  it('labels every reading as simulated and unverified', async () => {
    const { timers, tick } = fakeTimers();
    const source = new MockVehicleSource(
      new MockVehicleModel(seeded(3)),
      timers,
    );
    const snapshots: TelemetrySnapshot[] = [];
    await source.start(s => snapshots.push(s));
    tick();

    expect(source.isSimulated).toBe(true);
    expect(source.displayName).toBe('MOCK VEHICLE');
    const snapshot = snapshots[0] as TelemetrySnapshot;
    for (const reading of [
      snapshot.speed,
      snapshot.rpm,
      snapshot.fuelLevel,
      snapshot.batteryVoltage,
      snapshot.engineStatus,
    ]) {
      expect(reading).toMatchObject({
        source: 'mock',
        verified: false,
        timestamp: 1234,
      });
    }
    expect(snapshot.speed?.unit).toBe('km/h');
    expect(snapshot.fuelLevel?.unit).toBe('%');
    expect(snapshot.batteryVoltage?.unit).toBe('V');
  });

  it('does not invent odometer or engine temperature', async () => {
    const { timers, tick } = fakeTimers();
    const source = new MockVehicleSource(
      new MockVehicleModel(seeded(3)),
      timers,
    );
    const snapshots: TelemetrySnapshot[] = [];
    await source.start(s => snapshots.push(s));
    tick();
    expect(snapshots[0]).not.toHaveProperty('odometer');
    expect(snapshots[0]).not.toHaveProperty('engineTemperature');
  });

  it('claims only simulated telemetry and nothing about the cluster', () => {
    const source = new MockVehicleSource();
    expect(source.capabilities).toEqual({
      telemetry: 'simulated',
      diagnostics: 'unavailable',
      oilReminderRead: 'unavailable',
      oilReminderReset: 'unavailable',
    });
  });

  it('stops producing data after stop()', async () => {
    const { timers, isRunning } = fakeTimers();
    const source = new MockVehicleSource(
      new MockVehicleModel(seeded(3)),
      timers,
    );
    await source.start(() => undefined);
    expect(isRunning()).toBe(true);
    await source.stop();
    expect(isRunning()).toBe(false);
  });
});

describe('VehicleService', () => {
  beforeEach(() => useVehicleStore.setState(initialVehicleState, true));

  function controllableSource(overrides: Partial<VehicleSource> = {}) {
    let emit: (s: TelemetrySnapshot) => void = () => undefined;
    const source: VehicleSource = {
      id: 'mock',
      displayName: 'TEST VEHICLE',
      isSimulated: true,
      capabilities: {
        telemetry: 'simulated',
        diagnostics: 'unavailable',
        oilReminderRead: 'unavailable',
        oilReminderReset: 'unavailable',
      },
      start: async onSnapshot => {
        emit = onSnapshot;
      },
      stop: jest.fn(async () => undefined),
      ...overrides,
    };
    return { source, emit: (s: TelemetrySnapshot) => emit(s) };
  }

  const reading = (value: number) => ({
    value,
    unit: 'km/h',
    timestamp: 1,
    source: 'mock' as const,
    verified: false,
  });

  it('moves through connecting -> connected and publishes snapshots', async () => {
    const { source, emit } = controllableSource();
    const service = new VehicleService(() => source);
    const promise = service.connect('mock');
    expect(useVehicleStore.getState().connection).toBe('connecting');
    await promise;

    const state = useVehicleStore.getState();
    expect(state.connection).toBe('connected');
    expect(state.deviceName).toBe('TEST VEHICLE');
    expect(state.isSimulated).toBe(true);

    emit({ speed: reading(50) });
    expect(useVehicleStore.getState().snapshot.speed?.value).toBe(50);
  });

  it('forwards snapshots to telemetry listeners until they unsubscribe', async () => {
    const { source, emit } = controllableSource();
    const service = new VehicleService(() => source);
    await service.connect('mock');
    const listener = jest.fn();
    const off = service.onTelemetry(listener);
    emit({ speed: reading(10) });
    off();
    emit({ speed: reading(20) });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('clears all values on disconnect so nothing stale is shown', async () => {
    const { source, emit } = controllableSource();
    const service = new VehicleService(() => source);
    await service.connect('mock');
    emit({ speed: reading(50) });
    await service.disconnect();

    expect(source.stop).toHaveBeenCalled();
    expect(useVehicleStore.getState()).toMatchObject({
      ...initialVehicleState,
    });
    expect(useVehicleStore.getState().snapshot).toEqual({});
  });

  it('ignores late snapshots from a source that was disconnected', async () => {
    const { source, emit } = controllableSource();
    const service = new VehicleService(() => source);
    await service.connect('mock');
    await service.disconnect();
    emit({ speed: reading(99) });
    expect(useVehicleStore.getState().snapshot).toEqual({});
  });

  it('reports a friendly error when the connection fails', async () => {
    const { source } = controllableSource({
      start: async () => {
        throw new Error('GATT 133 internal detail');
      },
    });
    const service = new VehicleService(() => source);
    await service.connect('mock');
    const state = useVehicleStore.getState();
    expect(state.connection).toBe('error');
    expect(state.error).toBe(
      'Could not connect to the scooter. Please try again.',
    );
    expect(state.error).not.toContain('GATT');
  });

  it('does not connect twice', async () => {
    const create = jest.fn(() => controllableSource().source);
    const service = new VehicleService(create);
    await service.connect('mock');
    await service.connect('mock');
    expect(create).toHaveBeenCalledTimes(1);
  });

  describe('resetOilReminder', () => {
    it('is NOT_SUPPORTED when disconnected', async () => {
      const service = new VehicleService(() => controllableSource().source);
      const result = await service.resetOilReminder();
      expect(result).toEqual({
        status: 'NOT_SUPPORTED',
        message: OIL_RESET_UNAVAILABLE_MESSAGE,
      });
      expect(result.message).toMatch(/Vehicle-level reset unavailable/);
    });

    it('is NOT_SUPPORTED while connected to the mock vehicle and sends nothing', async () => {
      const { source } = controllableSource();
      const service = new VehicleService(() => source);
      await service.connect('mock');
      const result = await service.resetOilReminder();
      expect(result.status).toBe('NOT_SUPPORTED');
      expect(source.stop).not.toHaveBeenCalled();
    });

    it('never reports success unless a reset was verified AND implemented', async () => {
      const { source } = controllableSource({
        capabilities: {
          telemetry: 'verified',
          diagnostics: 'unavailable',
          oilReminderRead: 'unavailable',
          oilReminderReset: 'verified',
        },
      });
      const service = new VehicleService(() => source);
      await service.connect('mock');
      const result = await service.resetOilReminder();
      expect(result.status).not.toBe('SUCCESS');
    });
  });
});
