import type { SyncEntity } from '@shared/constants';
import type {
  MaintenanceRecordDTO,
  RideDTO,
  ScooterDTO,
  ServiceReminderDTO,
  SyncableDTO,
} from '@shared/types';
import { AxiosError } from 'axios';
import { initializeLocalData } from '@/services/bootstrap';
import { SYNC_ADAPTERS } from '@/services/sync/adapters';
import { SyncService, type SyncTransport } from '@/services/sync/SyncService';
import { useAuthStore } from '@/store/authStore';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { useRideStore } from '@/store/rideStore';
import { useScooterStore } from '@/store/scooterStore';
import { useServiceStore } from '@/store/serviceStore';
import { enqueueSync, useSyncStore } from '@/store/syncStore';

/* ---------- A fake server that follows the real API's contract ---------- */

type Item = SyncableDTO & { seq: number } & Record<string, unknown>;

class FakeServer implements SyncTransport {
  docs: Record<string, Map<string, Item>> = {};
  calls: string[] = [];
  private seq = 0;
  private failures: Error[] = [];

  failNext(error: Error, times = 1) {
    this.failures.push(...Array.from({ length: times }, () => error));
  }

  seed<T extends SyncableDTO>(entity: SyncEntity, item: T) {
    (this.docs[entity] ??= new Map()).set(item.id, {
      ...item,
      seq: ++this.seq,
    } as Item);
  }

  private parse(url: string) {
    const [, , entity = '', id] = url.split('/');
    return { entity, id, store: (this.docs[entity] ??= new Map()) };
  }

  private maybeFail() {
    const failure = this.failures.shift();
    if (failure) throw failure;
  }

  private strip(item: Item) {
    const copy: Partial<Item> = { ...item };
    delete copy.seq;
    return copy;
  }

  async put<T>(url: string, body: unknown) {
    this.calls.push(`PUT ${url}`);
    this.maybeFail();
    const { id, store } = this.parse(url);
    const incoming = body as SyncableDTO;
    const existing = store.get(id as string);
    if (
      existing &&
      Date.parse(existing.updatedAt) > Date.parse(incoming.updatedAt)
    ) {
      return { data: { item: this.strip(existing), applied: false } as T };
    }
    const saved = { ...incoming, seq: ++this.seq } as Item;
    store.set(id as string, saved);
    return { data: { item: this.strip(saved), applied: true } as T };
  }

  async delete<T>(url: string) {
    this.calls.push(`DELETE ${url}`);
    this.maybeFail();
    const { id, store } = this.parse(url);
    const existing = store.get(id as string);
    if (!existing) throw httpError(404, 'Not found.');
    const now = new Date().toISOString();
    store.set(id as string, {
      ...existing,
      deletedAt: now,
      updatedAt: now,
      seq: ++this.seq,
    });
    return { data: { applied: true } as T };
  }

  async get<T>(url: string, config: { params: Record<string, unknown> }) {
    this.calls.push(`GET ${url}`);
    this.maybeFail();
    const { store } = this.parse(url);
    const since = config.params.updatedSince
      ? Number(config.params.updatedSince)
      : 0;
    const items = [...store.values()]
      .filter(item => item.seq >= since)
      .sort((a, b) => a.seq - b.seq);
    const last = items.at(-1);
    return {
      data: {
        items: items.map(i => this.strip(i)),
        cursor: last ? String(last.seq) : null,
      } as T,
    };
  }
}

function httpError(status: number, message: string) {
  const config = {} as never;
  return new AxiosError(message, 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: {
      error: {
        code: status === 400 ? 'VALIDATION_ERROR' : 'NOT_FOUND',
        message,
      },
    },
  });
}
const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK');

/* ---------- Helpers ---------- */

function signIn() {
  useAuthStore.getState().signIn({
    id: 'user-1',
    email: 'rider@example.com',
    displayName: 'Rider',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
}

function resetAll() {
  useAuthStore.getState().signOut();
  useScooterStore.getState().reset();
  useServiceStore.getState().reset();
  useMaintenanceStore.getState().reset();
  useRideStore.getState().reset();
  useSyncStore.getState().reset();
}

const T_OLD = '2026-01-01T00:00:00.000Z';
const T_MID = '2026-02-01T00:00:00.000Z';
const T_NEW = '2026-03-01T00:00:00.000Z';

function remoteRecord(
  overrides: Partial<MaintenanceRecordDTO> & { scooterId: string },
): MaintenanceRecordDTO {
  return {
    id: 'remote-record',
    createdAt: T_OLD,
    updatedAt: T_MID,
    deletedAt: null,
    date: '2026-01-15',
    mileageKm: 900,
    serviceType: 'oil_change',
    partsReplaced: null,
    oilType: null,
    oilQuantityLitres: null,
    cost: null,
    currency: 'INR',
    workshop: null,
    notes: null,
    ...overrides,
  };
}

function newService(server: FakeServer) {
  return new SyncService(server, SYNC_ADAPTERS, initializeLocalData);
}

beforeEach(() => {
  resetAll();
  initializeLocalData();
});

/* ---------- Tests ---------- */

describe('SyncService - push', () => {
  it('does nothing while signed out and keeps the queue', async () => {
    useScooterStore.getState().updateScooter({ odometerKm: 100 });
    const server = new FakeServer();
    const outcome = await newService(server).syncNow();
    expect(outcome).toEqual({ status: 'skipped', reason: 'signed-out' });
    expect(server.calls).toEqual([]);
    expect(useSyncStore.getState().queue).toHaveLength(1);
  });

  it('uploads queued changes with idempotent PUTs and empties the queue', async () => {
    signIn();
    useScooterStore.getState().updateScooter({ odometerKm: 4200 });
    const oil = useServiceStore
      .getState()
      .reminders.find(r => r.type === 'oil_change')!;
    useServiceStore.getState().updateReminder(oil.id, { intervalKm: 3000 });

    const server = new FakeServer();
    const outcome = await newService(server).syncNow();

    expect(outcome).toMatchObject({ status: 'ok', pushed: 2, rejected: 0 });
    expect(useSyncStore.getState().queue).toEqual([]);
    expect(useSyncStore.getState().status).toBe('idle');
    expect(useSyncStore.getState().lastSyncAt).not.toBeNull();
    const scooter = useScooterStore.getState().scooter!;
    expect(server.calls).toContain(`PUT /api/scooters/${scooter.id}`);
    expect(server.calls).toContain(`PUT /api/service-reminders/${oil.id}`);
    expect(server.docs.scooters?.get(scooter.id)).toMatchObject({
      odometerKm: 4200,
    });
  });

  it('collapses repeated edits into one upload of the latest version', async () => {
    signIn();
    for (let km = 1; km <= 5; km++)
      useScooterStore.getState().updateScooter({ odometerKm: km });
    const server = new FakeServer();
    await newService(server).syncNow();
    expect(
      server.calls.filter(c => c.startsWith('PUT /api/scooters')),
    ).toHaveLength(1);
    const scooterId = useScooterStore.getState().scooter!.id;
    expect(server.docs.scooters?.get(scooterId)).toMatchObject({
      odometerKm: 5,
    });
  });

  it('keeps everything queued when the network is down, and says so', async () => {
    signIn();
    useScooterStore.getState().updateScooter({ odometerKm: 100 });
    const server = new FakeServer();
    server.failNext(networkError());

    const outcome = await newService(server).syncNow();
    expect(outcome.status).toBe('error');
    expect(useSyncStore.getState().queue).toHaveLength(1);
    expect(useSyncStore.getState().status).toBe('error');
    expect(useSyncStore.getState().lastError).toMatch(
      /Cannot reach the server/,
    );

    // Connectivity returns: the same queue goes through.
    const retry = await newService(server).syncNow();
    expect(retry.status).toBe('ok');
    expect(useSyncStore.getState().queue).toEqual([]);
    expect(useSyncStore.getState().lastError).toBeNull();
  });

  it('stops at the first server outage so later changes are not skipped over', async () => {
    signIn();
    useScooterStore.getState().updateScooter({ odometerKm: 100 });
    const oil = useServiceStore
      .getState()
      .reminders.find(r => r.type === 'oil_change')!;
    useServiceStore.getState().updateReminder(oil.id, { intervalKm: 3000 });
    const server = new FakeServer();
    server.failNext(httpError(503, 'Service unavailable'));

    const outcome = await newService(server).syncNow();
    expect(outcome.status).toBe('error');
    expect(server.calls).toHaveLength(1); // did not carry on to the second change
    expect(useSyncStore.getState().queue).toHaveLength(2);
  });

  it('drops a change the server rejects but still sends the others', async () => {
    signIn();
    useScooterStore.getState().updateScooter({ odometerKm: 100 });
    const oil = useServiceStore
      .getState()
      .reminders.find(r => r.type === 'oil_change')!;
    useServiceStore.getState().updateReminder(oil.id, { intervalKm: 3000 });
    const server = new FakeServer();
    server.failNext(httpError(400, 'Invalid Scooter.')); // first op (the scooter) is refused

    const outcome = await newService(server).syncNow();
    expect(outcome).toMatchObject({ status: 'ok', pushed: 1, rejected: 1 });
    expect(useSyncStore.getState().queue).toEqual([]);
    expect(useSyncStore.getState().lastError).toMatch(/1 change/);
  });

  it('sends deletions and treats "already gone" as success', async () => {
    signIn();
    const scooterId = useScooterStore.getState().scooter!.id;
    const record = useMaintenanceStore.getState().addRecord({
      scooterId,
      date: '2026-01-01',
      mileageKm: null,
      serviceType: 'tyres',
      partsReplaced: null,
      oilType: null,
      oilQuantityLitres: null,
      cost: null,
      currency: 'INR',
      workshop: null,
      notes: null,
    });
    useMaintenanceStore.getState().removeRecord(record.id);
    const server = new FakeServer(); // never saw the record -> DELETE answers 404

    const outcome = await newService(server).syncNow();
    expect(server.calls).toContain(`DELETE /api/maintenance/${record.id}`);
    expect(outcome.status).toBe('ok');
    expect(useSyncStore.getState().queue).toEqual([]);
  });

  it('keeps a record queued if it was edited again while its upload was in flight', async () => {
    signIn();
    useScooterStore.getState().updateScooter({ odometerKm: 100 });
    const scooterId = useScooterStore.getState().scooter!.id;
    const server = new FakeServer();
    const originalPut = server.put.bind(server);
    server.put = (async (url: string, body: unknown) => {
      const result = await originalPut(url, body);
      // The rider edits again before the response is processed.
      await new Promise<void>(resolve => setTimeout(resolve, 5));
      useScooterStore.getState().updateScooter({ odometerKm: 200 });
      return result;
    }) as typeof server.put;

    await newService(server).syncNow();
    expect(useSyncStore.getState().queue).toEqual([
      expect.objectContaining({ entity: 'scooters', id: scooterId }),
    ]);
  });

  it('adopts the server copy when the server already has a newer version', async () => {
    signIn();
    useScooterStore.getState().updateScooter({ name: 'Local name' });
    const scooter = useScooterStore.getState().scooter!;
    const server = new FakeServer();
    server.seed('scooters', {
      ...scooter,
      name: 'Edited elsewhere',
      updatedAt: '2999-01-01T00:00:00.000Z',
    } as ScooterDTO);

    await newService(server).syncNow();
    expect(useScooterStore.getState().scooter!.name).toBe('Edited elsewhere');
    expect(useSyncStore.getState().queue).toEqual([]);
  });

  it('never uploads simulated rides', async () => {
    signIn();
    const mockRide = { id: 'mock-ride', source: 'mock' } as RideDTO;
    useRideStore.setState({ rides: [mockRide] });
    enqueueSync('rides', 'mock-ride'); // even if something queued it by mistake
    const server = new FakeServer();
    await newService(server).syncNow();
    expect(server.calls.some(c => c.includes('/api/rides/mock-ride'))).toBe(
      false,
    );
    expect(useSyncStore.getState().queue).toEqual([]);
  });

  it('does not start a second sync while one is running', async () => {
    signIn();
    const server = new FakeServer();
    const service = newService(server);
    const first = service.syncNow();
    const second = await service.syncNow();
    expect(second).toEqual({ status: 'skipped', reason: 'already-running' });
    await first;
  });
});

describe('SyncService - pull', () => {
  it('applies newer server records for the local scooter and remembers the cursor', async () => {
    signIn();
    const scooterId = useScooterStore.getState().scooter!.id;
    const server = new FakeServer();
    server.seed('maintenance', remoteRecord({ scooterId }));

    const outcome = await newService(server).syncNow();
    expect(outcome).toMatchObject({ status: 'ok', pulled: 1 });
    expect(useMaintenanceStore.getState().records.map(r => r.id)).toEqual([
      'remote-record',
    ]);
    // Records received from the server are not echoed back as new uploads.
    expect(useSyncStore.getState().queue).toEqual([]);
    expect(useSyncStore.getState().cursors.maintenance).toBeDefined();
  });

  it('ignores records that belong to some other scooter', async () => {
    signIn();
    const server = new FakeServer();
    server.seed(
      'maintenance',
      remoteRecord({ scooterId: 'someone-elses-scooter' }),
    );
    await newService(server).syncNow();
    expect(useMaintenanceStore.getState().records).toEqual([]);
  });

  it('keeps the local version when it is newer (last write wins)', async () => {
    signIn();
    const scooterId = useScooterStore.getState().scooter!.id;
    useMaintenanceStore.setState({
      records: [remoteRecord({ scooterId, notes: 'local', updatedAt: T_NEW })],
    });
    const server = new FakeServer();
    server.seed(
      'maintenance',
      remoteRecord({ scooterId, notes: 'remote', updatedAt: T_MID }),
    );
    await newService(server).syncNow();
    expect(useMaintenanceStore.getState().records[0]?.notes).toBe('local');
  });

  it('takes the server version when it is newer', async () => {
    signIn();
    const scooterId = useScooterStore.getState().scooter!.id;
    useMaintenanceStore.setState({
      records: [remoteRecord({ scooterId, notes: 'local', updatedAt: T_OLD })],
    });
    const server = new FakeServer();
    server.seed(
      'maintenance',
      remoteRecord({ scooterId, notes: 'remote', updatedAt: T_NEW }),
    );
    await newService(server).syncNow();
    expect(useMaintenanceStore.getState().records[0]?.notes).toBe('remote');
  });

  it('does not overwrite a record the rider edits while the sync is running', async () => {
    signIn();
    const scooterId = useScooterStore.getState().scooter!.id;
    const original = remoteRecord({
      scooterId,
      notes: 'before',
      updatedAt: T_OLD,
    });
    useMaintenanceStore.setState({ records: [original] });

    const server = new FakeServer();
    server.seed('maintenance', {
      ...original,
      notes: 'from server',
      updatedAt: '2999-01-01T00:00:00.000Z',
    });
    // The push phase has nothing queued; the rider edits just before the pull downloads.
    const realGet = server.get.bind(server);
    let edited = false;
    server.get = (async (
      url: string,
      config: { params: Record<string, unknown> },
    ) => {
      if (!edited && url.includes('maintenance')) {
        edited = true;
        useMaintenanceStore.getState().updateRecord(original.id, {
          ...original,
          notes: 'edited during sync',
        });
      }
      return realGet(url, config);
    }) as typeof server.get;

    await newService(server).syncNow();
    expect(useMaintenanceStore.getState().records[0]?.notes).toBe(
      'edited during sync',
    );
    expect(useSyncStore.getState().queue).toEqual([
      expect.objectContaining({ entity: 'maintenance', id: original.id }),
    ]);

    // The next sync pushes the edit; the server's copy is newer, so last-write-wins settles on it.
    await newService(server).syncNow();
    expect(useMaintenanceStore.getState().records[0]?.notes).toBe(
      'from server',
    );
    expect(useSyncStore.getState().queue).toEqual([]);
  });

  it('removes a local record that was deleted elsewhere', async () => {
    signIn();
    const scooterId = useScooterStore.getState().scooter!.id;
    useMaintenanceStore.setState({
      records: [remoteRecord({ scooterId, updatedAt: T_OLD })],
    });
    const server = new FakeServer();
    server.seed(
      'maintenance',
      remoteRecord({ scooterId, updatedAt: T_NEW, deletedAt: T_NEW }),
    );
    await newService(server).syncNow();
    expect(useMaintenanceStore.getState().records).toEqual([]);
  });

  it('keeps a local record that was edited after the remote deletion', async () => {
    signIn();
    const scooterId = useScooterStore.getState().scooter!.id;
    useMaintenanceStore.setState({
      records: [remoteRecord({ scooterId, updatedAt: T_NEW })],
    });
    const server = new FakeServer();
    server.seed(
      'maintenance',
      remoteRecord({ scooterId, updatedAt: T_MID, deletedAt: T_MID }),
    );
    await newService(server).syncNow();
    expect(useMaintenanceStore.getState().records).toHaveLength(1);
  });

  it('does not re-apply data it already has on later syncs', async () => {
    signIn();
    const scooterId = useScooterStore.getState().scooter!.id;
    const server = new FakeServer();
    server.seed('maintenance', remoteRecord({ scooterId }));
    const service = newService(server);
    await service.syncNow();
    const second = await service.syncNow();
    expect(second).toMatchObject({ status: 'ok', pulled: 0 });
  });
});

describe('SyncService - restoring onto a fresh install', () => {
  const remoteScooter = (): ScooterDTO => ({
    id: 'server-scooter',
    createdAt: T_OLD,
    updatedAt: T_MID,
    deletedAt: null,
    name: 'Restored Ntorq',
    vehicleModel: 'TVS Ntorq 125 Race XP',
    modelYear: 2024,
    registrationNumber: 'KA01AB1234',
    vin: null,
    engineNumber: null,
    odometerKm: 9000,
    odometerUpdatedAt: T_MID,
  });

  const remoteReminder = (): ServiceReminderDTO => ({
    id: 'server-oil',
    createdAt: T_OLD,
    updatedAt: T_MID,
    deletedAt: null,
    scooterId: 'server-scooter',
    type: 'oil_change',
    label: null,
    enabled: true,
    intervalKm: 3000,
    intervalMonths: null,
    lastServiceDate: '2026-01-15',
    lastServiceKm: 8000,
    manualNextDueKm: null,
    manualNextDueDate: null,
    notes: null,
  });

  it("adopts the account's scooter, its reminders, and drops the untouched local defaults", async () => {
    signIn();
    const localId = useScooterStore.getState().scooter!.id;
    const server = new FakeServer();
    server.seed('scooters', remoteScooter());
    server.seed('service-reminders', remoteReminder());

    await newService(server).syncNow();

    expect(useScooterStore.getState().scooter).toMatchObject({
      id: 'server-scooter',
      name: 'Restored Ntorq',
      odometerKm: 9000,
    });
    const reminders = useServiceStore.getState().reminders;
    expect(reminders.some(r => r.scooterId === localId)).toBe(false);
    expect(reminders.find(r => r.type === 'oil_change')).toMatchObject({
      id: 'server-oil',
      intervalKm: 3000,
    });
    // Only one oil-change reminder: the server's.
    expect(reminders.filter(r => r.type === 'oil_change')).toHaveLength(1);
    expect(useSyncStore.getState().queue).toEqual([]);
  });

  it('creates default reminders for an adopted scooter that has none on the server', async () => {
    signIn();
    const server = new FakeServer();
    server.seed('scooters', remoteScooter());
    await newService(server).syncNow();
    const reminders = useServiceStore.getState().reminders;
    expect(reminders.length).toBeGreaterThan(5);
    expect(reminders.every(r => r.scooterId === 'server-scooter')).toBe(true);
  });

  it("keeps this phone's own data when it already has some", async () => {
    signIn();
    useMaintenanceStore.getState().addRecord({
      scooterId: useScooterStore.getState().scooter!.id,
      date: '2026-01-01',
      mileageKm: null,
      serviceType: 'tyres',
      partsReplaced: null,
      oilType: null,
      oilQuantityLitres: null,
      cost: null,
      currency: 'INR',
      workshop: null,
      notes: null,
    });
    const localId = useScooterStore.getState().scooter!.id;
    const server = new FakeServer();
    server.seed('scooters', remoteScooter());

    await newService(server).syncNow();
    expect(useScooterStore.getState().scooter!.id).toBe(localId);
  });
});
