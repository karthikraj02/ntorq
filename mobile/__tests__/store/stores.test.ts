import { SERVICE_ITEM_TYPES } from '@shared/constants';
import type { RideDTO } from '@shared/types';
import { initializeLocalData } from '@/services/bootstrap';
import { laterThan } from '@/utils/dates';
import { recordMaintenance } from '@/services/maintenance/maintenanceActions';
import { useMaintenanceStore, sortRecords } from '@/store/maintenanceStore';
import { useRideStore } from '@/store/rideStore';
import { isPristine, useScooterStore } from '@/store/scooterStore';
import { useServiceStore } from '@/store/serviceStore';
import { normalizeBackendUrl } from '@/store/settingsStore';
import { coalesce, useSyncStore, type SyncOp } from '@/store/syncStore';

function resetAll() {
  useScooterStore.getState().reset();
  useServiceStore.getState().reset();
  useMaintenanceStore.getState().reset();
  useRideStore.getState().reset();
  useSyncStore.getState().reset();
}

beforeEach(resetAll);

describe('first launch', () => {
  it('creates a scooter and one reminder per service type, with no invented intervals', () => {
    initializeLocalData();
    const scooter = useScooterStore.getState().scooter;
    expect(scooter).toMatchObject({
      name: 'My Ntorq',
      vehicleModel: 'TVS Ntorq 125 Race XP',
      odometerKm: null,
    });
    expect(isPristine(scooter!)).toBe(true);

    const reminders = useServiceStore.getState().reminders;
    expect(reminders.map(r => r.type).sort()).toEqual(
      SERVICE_ITEM_TYPES.filter(t => t !== 'other')
        .slice()
        .sort(),
    );
    for (const reminder of reminders) {
      expect(reminder.scooterId).toBe(scooter!.id);
      expect(reminder).toMatchObject({
        intervalKm: null,
        intervalMonths: null,
        lastServiceDate: null,
        lastServiceKm: null,
      });
    }
  });

  it('leaves coolant switched off because it may not apply to this scooter', () => {
    initializeLocalData();
    const coolant = useServiceStore
      .getState()
      .reminders.find(r => r.type === 'coolant');
    expect(coolant?.enabled).toBe(false);
    expect(
      useServiceStore.getState().reminders.find(r => r.type === 'oil_change')
        ?.enabled,
    ).toBe(true);
  });

  it('is idempotent and does not queue anything for upload', () => {
    initializeLocalData();
    const ids = useServiceStore.getState().reminders.map(r => r.id);
    initializeLocalData();
    expect(useServiceStore.getState().reminders.map(r => r.id)).toEqual(ids);
    expect(useSyncStore.getState().queue).toEqual([]);
  });
});

describe('scooter store', () => {
  it('queues an upload when the rider edits, and stamps the odometer time', () => {
    initializeLocalData();
    useScooterStore
      .getState()
      .updateScooter({ odometerKm: 4200, registrationNumber: 'KA01' });
    const scooter = useScooterStore.getState().scooter!;
    expect(scooter.odometerKm).toBe(4200);
    expect(scooter.odometerUpdatedAt).not.toBeNull();
    expect(isPristine(scooter)).toBe(false);
    expect(useSyncStore.getState().queue).toEqual([
      expect.objectContaining({
        entity: 'scooters',
        id: scooter.id,
        action: 'upsert',
      }),
    ]);
  });

  it('keeps odometerUpdatedAt when the odometer is untouched', () => {
    initializeLocalData();
    useScooterStore.getState().updateScooter({ odometerKm: 100 });
    const stamp = useScooterStore.getState().scooter!.odometerUpdatedAt;
    useScooterStore.getState().updateScooter({ name: 'Racer' });
    expect(useScooterStore.getState().scooter!.odometerUpdatedAt).toBe(stamp);
  });

  it('always moves updatedAt forward, even if the clock has not (so "edited" is never missed)', () => {
    const frozen = new Date('2026-06-01T12:00:00.000Z').getTime();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(frozen);
    try {
      const created = useScooterStore.getState().ensureScooter();
      useScooterStore.getState().updateScooter({ name: 'First edit' });
      const first = useScooterStore.getState().scooter!;
      useScooterStore.getState().updateScooter({ name: 'Second edit' });
      const second = useScooterStore.getState().scooter!;

      expect(Date.parse(first.updatedAt)).toBeGreaterThan(
        Date.parse(created.updatedAt),
      );
      expect(Date.parse(second.updatedAt)).toBeGreaterThan(
        Date.parse(first.updatedAt),
      );
      expect(isPristine(second)).toBe(false);
    } finally {
      clock.mockRestore();
    }
  });
});

describe('laterThan', () => {
  it('is never earlier than the previous timestamp, even if the clock went backwards', () => {
    const future = '2999-01-01T00:00:00.000Z';
    expect(Date.parse(laterThan(future))).toBe(Date.parse(future) + 1);
    const past = '2000-01-01T00:00:00.000Z';
    expect(Date.parse(laterThan(past))).toBeGreaterThan(Date.parse(past));
  });
});

describe('service reminder store', () => {
  it('edits a reminder, bumping updatedAt and queueing it', () => {
    initializeLocalData();
    const oil = useServiceStore
      .getState()
      .reminders.find(r => r.type === 'oil_change')!;
    useServiceStore.getState().updateReminder(oil.id, { intervalKm: 3000 });
    const updated = useServiceStore
      .getState()
      .reminders.find(r => r.id === oil.id)!;
    expect(updated.intervalKm).toBe(3000);
    expect(updated.updatedAt >= oil.updatedAt).toBe(true);
    expect(useSyncStore.getState().queue.map(op => op.id)).toContain(oil.id);
  });

  it('adds and deletes custom items, queueing the deletion', () => {
    initializeLocalData();
    const scooterId = useScooterStore.getState().scooter!.id;
    const custom = useServiceStore
      .getState()
      .addCustomReminder(scooterId, '  Chain lube ');
    expect(custom).toMatchObject({
      type: 'other',
      label: 'Chain lube',
      enabled: true,
    });
    useServiceStore.getState().removeReminder(custom.id);
    expect(
      useServiceStore.getState().reminders.find(r => r.id === custom.id),
    ).toBeUndefined();
    expect(useSyncStore.getState().queue).toEqual([
      expect.objectContaining({ id: custom.id, action: 'delete' }),
    ]);
  });
});

describe('recordMaintenance', () => {
  const input = (overrides = {}) => ({
    scooterId: '',
    date: '2026-09-01',
    mileageKm: 5000,
    serviceType: 'oil_change' as const,
    partsReplaced: null,
    oilType: null,
    oilQuantityLitres: null,
    cost: 450,
    currency: 'INR',
    workshop: null,
    notes: null,
    ...overrides,
  });

  beforeEach(() => {
    initializeLocalData();
    useScooterStore.getState().updateScooter({ odometerKm: 4800 });
    useSyncStore.getState().reset();
  });

  const oilReminder = () =>
    useServiceStore.getState().reminders.find(r => r.type === 'oil_change')!;
  const scooterId = () => useScooterStore.getState().scooter!.id;

  it('stores the record, advances the matching reminder and raises the odometer', () => {
    useServiceStore.getState().updateReminder(oilReminder().id, {
      intervalKm: 3000,
      manualNextDueKm: 4000,
    });
    recordMaintenance(input({ scooterId: scooterId() }), {
      updateReminder: true,
      updateOdometer: true,
    });

    expect(useMaintenanceStore.getState().records).toHaveLength(1);
    expect(oilReminder()).toMatchObject({
      lastServiceDate: '2026-09-01',
      lastServiceKm: 5000,
      manualNextDueKm: null, // one-off override cleared
    });
    expect(useScooterStore.getState().scooter!.odometerKm).toBe(5000);
  });

  it('queues the record, reminder and scooter for upload', () => {
    recordMaintenance(input({ scooterId: scooterId() }), {
      updateReminder: true,
      updateOdometer: true,
    });
    const entities = useSyncStore
      .getState()
      .queue.map(op => op.entity)
      .sort();
    expect(entities).toEqual(['maintenance', 'scooters', 'service-reminders']);
  });

  it('leaves reminders and odometer alone when asked', () => {
    recordMaintenance(input({ scooterId: scooterId() }), {
      updateReminder: false,
      updateOdometer: false,
    });
    expect(oilReminder().lastServiceDate).toBeNull();
    expect(useScooterStore.getState().scooter!.odometerKm).toBe(4800);
  });

  it('never lowers the odometer', () => {
    recordMaintenance(input({ scooterId: scooterId(), mileageKm: 3000 }), {
      updateReminder: false,
      updateOdometer: true,
    });
    expect(useScooterStore.getState().scooter!.odometerKm).toBe(4800);
  });

  it('does not let an older service rewind a newer one', () => {
    useServiceStore.getState().updateReminder(oilReminder().id, {
      lastServiceDate: '2026-09-01',
      lastServiceKm: 5000,
    });
    recordMaintenance(
      input({ scooterId: scooterId(), date: '2026-03-01', mileageKm: 1000 }),
      { updateReminder: true, updateOdometer: false },
    );
    expect(oilReminder()).toMatchObject({
      lastServiceDate: '2026-09-01',
      lastServiceKm: 5000,
    });
  });

  it('does not touch reminders for disabled items or custom types', () => {
    const coolant = useServiceStore
      .getState()
      .reminders.find(r => r.type === 'coolant')!;
    recordMaintenance(
      input({ scooterId: scooterId(), serviceType: 'coolant' }),
      { updateReminder: true, updateOdometer: false },
    );
    expect(
      useServiceStore.getState().reminders.find(r => r.id === coolant.id)!
        .lastServiceDate,
    ).toBeNull();
    recordMaintenance(input({ scooterId: scooterId(), serviceType: 'other' }), {
      updateReminder: true,
      updateOdometer: false,
    });
    expect(useMaintenanceStore.getState().records).toHaveLength(2);
  });

  it('sorts history newest first', () => {
    recordMaintenance(input({ scooterId: scooterId(), date: '2026-03-01' }), {
      updateReminder: false,
      updateOdometer: false,
    });
    recordMaintenance(input({ scooterId: scooterId(), date: '2026-08-01' }), {
      updateReminder: false,
      updateOdometer: false,
    });
    expect(
      sortRecords(useMaintenanceStore.getState().records).map(r => r.date),
    ).toEqual(['2026-08-01', '2026-03-01']);
  });
});

describe('ride store', () => {
  const ride = (id: string, source: RideDTO['source']): RideDTO => ({
    id,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    deletedAt: null,
    scooterId: 's',
    source,
    startedAt: '2026-03-01T09:00:00.000Z',
    endedAt: '2026-03-01T09:30:00.000Z',
    distanceKm: 5,
    ridingTimeSec: 600,
    elapsedSec: 700,
    averageSpeedKmh: 30,
    maxSpeedKmh: 50,
  });

  it('never queues simulated rides for upload', () => {
    useRideStore.getState().addRide(ride('mock-1', 'mock'));
    useRideStore.getState().removeRide('mock-1');
    expect(useSyncStore.getState().queue).toEqual([]);
  });

  it('queues real rides and their deletion', () => {
    useRideStore.getState().addRide(ride('real-1', 'vehicle'));
    expect(useSyncStore.getState().queue).toEqual([
      expect.objectContaining({
        entity: 'rides',
        id: 'real-1',
        action: 'upsert',
      }),
    ]);
    useRideStore.getState().removeRide('real-1');
    expect(useSyncStore.getState().queue).toEqual([
      expect.objectContaining({ id: 'real-1', action: 'delete' }),
    ]);
  });

  it('clears only simulated rides', () => {
    useRideStore.getState().addRide(ride('a', 'mock'));
    useRideStore.getState().addRide(ride('b', 'vehicle'));
    useRideStore.getState().clearMockRides();
    expect(useRideStore.getState().rides.map(r => r.id)).toEqual(['b']);
  });
});

describe('sync queue coalescing', () => {
  const op = (
    action: SyncOp['action'],
    id = '1',
    entity: SyncOp['entity'] = 'maintenance',
  ): SyncOp => ({
    entity,
    id,
    action,
    queuedAt: `t-${action}`,
  });

  it('keeps one entry per record, always the latest', () => {
    let queue: SyncOp[] = [];
    queue = coalesce(queue, op('upsert'));
    queue = coalesce(queue, op('upsert'));
    queue = coalesce(queue, op('upsert'));
    expect(queue).toHaveLength(1);
    queue = coalesce(queue, op('delete'));
    expect(queue).toEqual([op('delete')]);
    queue = coalesce(queue, op('upsert'));
    expect(queue).toEqual([op('upsert')]);
  });

  it('keeps different records and collections apart', () => {
    let queue: SyncOp[] = [];
    queue = coalesce(queue, op('upsert', '1', 'maintenance'));
    queue = coalesce(queue, op('upsert', '2', 'maintenance'));
    queue = coalesce(queue, op('upsert', '1', 'rides'));
    expect(queue).toHaveLength(3);
  });
});

describe('backend address', () => {
  it('trims and removes trailing slashes', () => {
    expect(normalizeBackendUrl(' https://api.example.com/// ')).toEqual({
      url: 'https://api.example.com',
      error: null,
    });
    expect(normalizeBackendUrl('http://192.168.1.5:5000')).toEqual({
      url: 'http://192.168.1.5:5000',
      error: null,
    });
  });

  it('rejects things that are not web addresses', () => {
    for (const bad of [
      '',
      'localhost:5000',
      'ftp://x',
      'javascript' + ':alert(1)',
      'http://',
    ]) {
      expect(normalizeBackendUrl(bad).error).toBeTruthy();
    }
  });
});
