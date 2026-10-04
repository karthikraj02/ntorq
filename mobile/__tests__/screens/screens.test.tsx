import type { ComponentType } from 'react';
import { act, create } from 'react-test-renderer';
import { AccountScreen } from '@/screens/AccountScreen';
import { DeveloperScreen } from '@/screens/DeveloperScreen';
import { DiagnosticsScreen } from '@/screens/DiagnosticsScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { MaintenanceEditScreen } from '@/screens/MaintenanceEditScreen';
import { MaintenanceListScreen } from '@/screens/MaintenanceListScreen';
import { OilChangeScreen } from '@/screens/OilChangeScreen';
import { RideScreen } from '@/screens/RideScreen';
import { ServiceEditScreen } from '@/screens/ServiceEditScreen';
import { ServiceScreen } from '@/screens/ServiceScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { VehicleScreen } from '@/screens/VehicleScreen';
import { initializeLocalData } from '@/services/bootstrap';
import { vehicleService } from '@/services/vehicle';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { useRideStore } from '@/store/rideStore';
import { useScooterStore } from '@/store/scooterStore';
import { useServiceStore } from '@/store/serviceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSyncStore } from '@/store/syncStore';
import { idleRide, useTripStore } from '@/store/tripStore';
import { initialVehicleState, useVehicleStore } from '@/store/vehicleStore';
import {
  press,
  renderScreen,
  textOf,
  typeInto,
  unmount,
} from '../../test-utils/render';

async function resetEverything() {
  await act(async () => {
    useScooterStore.getState().reset();
    useServiceStore.getState().reset();
    useMaintenanceStore.getState().reset();
    useRideStore.getState().reset();
    useSyncStore.getState().reset();
    useTripStore.setState(idleRide, true);
    useVehicleStore.setState(initialVehicleState, true);
    initializeLocalData();
  });
}

beforeEach(resetEverything);

const reading = (value: number, unit: string) => ({
  value,
  unit,
  timestamp: Date.now(),
  source: 'mock' as const,
  verified: false,
});

describe('Home dashboard', () => {
  it('shows N/A - never fake numbers - when nothing is connected', async () => {
    const screen = await renderScreen(HomeScreen);
    const text = textOf(screen);
    expect(text).toContain('My Ntorq');
    expect(text).toContain('TVS Ntorq 125 Race XP');
    expect(text).toContain('DISCONNECTED');
    expect(text).toContain('MOCK VEHICLE'); // banner: the selected source is simulated
    expect(text).toContain('Start mock vehicle');
    expect(text).toContain('N/A');
    expect(text).toContain('No diagnostic data available');
    expect(text).not.toMatch(/\b6200\b|\b12\.7\b/);
    await unmount(screen);
  });

  it('shows live values with units when connected', async () => {
    useVehicleStore.setState({
      connection: 'connected',
      deviceName: 'MOCK VEHICLE',
      isSimulated: true,
      snapshot: {
        speed: reading(67.2, 'km/h'),
        rpm: reading(6204, 'rpm'),
        fuelLevel: reading(54.3, '%'),
        batteryVoltage: reading(12.68, 'V'),
      },
    });
    const screen = await renderScreen(HomeScreen);
    const text = textOf(screen);
    expect(text).toContain('CONNECTED');
    expect(text).toContain('Connected to: MOCK VEHICLE');
    expect(text).toContain('67');
    expect(text).toContain('6,200');
    expect(text).toContain('54');
    expect(text).toContain('12.7');
    await unmount(screen);
  });

  it('shows the oil-change status with a distance, as in the spec example', async () => {
    useScooterStore.getState().updateScooter({ odometerKm: 3200 });
    const oil = useServiceStore
      .getState()
      .reminders.find(r => r.type === 'oil_change')!;
    useServiceStore
      .getState()
      .updateReminder(oil.id, { intervalKm: 3000, lastServiceKm: 1000 });
    const screen = await renderScreen(HomeScreen);
    const text = textOf(screen);
    expect(text).toContain('Due in 800 km');
    expect(text).toContain('OK');
    expect(text).toContain(
      'App reminder - not read from the instrument cluster.',
    );
    await unmount(screen);
  });

  it('can start and stop the mock vehicle from the connection card', async () => {
    jest.useFakeTimers();
    try {
      const screen = await renderScreen(HomeScreen);
      await press(screen, 'Start mock vehicle');
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2000);
      });
      expect(useVehicleStore.getState().connection).toBe('connected');
      expect(textOf(screen)).toContain('Connected to: MOCK VEHICLE');
      expect(useVehicleStore.getState().snapshot.speed?.source).toBe('mock');

      await press(screen, 'Disconnect');
      expect(useVehicleStore.getState().connection).toBe('disconnected');
      expect(useVehicleStore.getState().snapshot).toEqual({});
      await unmount(screen);
    } finally {
      await vehicleService.disconnect();
      jest.useRealTimers();
    }
  });
});

describe('Service screens', () => {
  it('starts with every item NOT SET, and says the app assumes no official intervals', async () => {
    const screen = await renderScreen(ServiceScreen);
    const text = textOf(screen);
    expect(text).toContain('Oil Change');
    expect(text).toContain('General Service');
    expect(text).toContain('NOT SET');
    expect(text).toContain('No interval set');
    expect(text).toContain('does not assume official TVS service intervals');
    expect(text).toContain('Odometer not set');
    expect(text).toContain('Coolant');
    await unmount(screen);
  });

  it('edits a reminder and shows a live status preview', async () => {
    useScooterStore.getState().updateScooter({ odometerKm: 3200 });
    const oil = useServiceStore
      .getState()
      .reminders.find(r => r.type === 'oil_change')!;
    const screen = await renderScreen(ServiceEditScreen, {
      reminderId: oil.id,
    });
    await typeInto(screen, 'Repeat every (distance)', '3000');
    await typeInto(screen, 'Last service mileage', '1000');
    expect(textOf(screen)).toContain('Due in 800 km');

    await press(screen, 'Save');
    const saved = useServiceStore
      .getState()
      .reminders.find(r => r.id === oil.id)!;
    expect(saved).toMatchObject({ intervalKm: 3000, lastServiceKm: 1000 });
    await unmount(screen);
  });

  it('refuses to save invalid values and explains why', async () => {
    const oil = useServiceStore
      .getState()
      .reminders.find(r => r.type === 'oil_change')!;
    const screen = await renderScreen(ServiceEditScreen, {
      reminderId: oil.id,
    });
    await typeInto(screen, 'Last service date', '2026-02-31');
    await press(screen, 'Save');
    expect(textOf(screen)).toContain('must be a real date');
    expect(
      useServiceStore.getState().reminders.find(r => r.id === oil.id)!
        .lastServiceDate,
    ).toBeNull();
    await unmount(screen);
  });

  it('handles a reminder that no longer exists', async () => {
    const screen = await renderScreen(ServiceEditScreen, {
      reminderId: 'gone',
    });
    expect(textOf(screen)).toContain('Item not found');
    await unmount(screen);
  });
});

describe('Oil change reminder', () => {
  it('separates the APP reminder from the VEHICLE CLUSTER reminder', async () => {
    const screen = await renderScreen(OilChangeScreen);
    const text = textOf(screen);
    expect(text).toContain('APP REMINDER');
    expect(text).toContain('VEHICLE CLUSTER REMINDER');
    expect(text).toContain('Vehicle-level reset unavailable');
    expect(text).toContain('Mark oil change as completed');
    expect(text).toContain('Stored in this app only.');
    await unmount(screen);
  });

  it('reports NOT SUPPORTED instead of pretending the vehicle reset worked', async () => {
    const screen = await renderScreen(OilChangeScreen);
    await press(screen, 'Reset on vehicle');
    const text = textOf(screen);
    expect(text).toContain('NOT SUPPORTED');
    expect(text).toContain('Vehicle-level reset unavailable.');
    expect(text).not.toMatch(/success|reset complete/i);
    await unmount(screen);
  });

  it('shows the remaining distance for a configured reminder', async () => {
    useScooterStore.getState().updateScooter({ odometerKm: 3200 });
    const oil = useServiceStore
      .getState()
      .reminders.find(r => r.type === 'oil_change')!;
    useServiceStore.getState().updateReminder(oil.id, {
      intervalKm: 3000,
      lastServiceKm: 1000,
      lastServiceDate: '2026-01-15',
    });
    const screen = await renderScreen(OilChangeScreen);
    const text = textOf(screen);
    expect(text).toContain('Due in 800 km');
    expect(text).toContain('15 Jan 2026');
    expect(text).toContain('4,000 km');
    expect(text).toContain('3,200 km');
    await unmount(screen);
  });
});

describe('Maintenance history', () => {
  it('shows an empty state, then the records the rider adds', async () => {
    const empty = await renderScreen(MaintenanceListScreen);
    expect(textOf(empty)).toContain('No service records');
    await unmount(empty);

    const scooterId = useScooterStore.getState().scooter!.id;
    useMaintenanceStore.getState().addRecord({
      scooterId,
      date: '2026-08-01',
      mileageKm: 5200,
      serviceType: 'oil_change',
      partsReplaced: 'Oil filter',
      oilType: '10W-30',
      oilQuantityLitres: 0.8,
      cost: 450,
      currency: 'INR',
      workshop: 'Local garage',
      notes: null,
    });
    const full = await renderScreen(MaintenanceListScreen);
    const text = textOf(full);
    expect(text).toContain('Oil Change');
    expect(text).toContain('01 Aug 2026');
    expect(text).toContain('5,200 km');
    expect(text).toContain('INR 450');
    expect(text).toContain('TOTAL RECORDED COST');
    await unmount(full);
  });

  it('adds a record through the form', async () => {
    const screen = await renderScreen(MaintenanceEditScreen, {
      serviceType: 'air_filter',
    });
    await typeInto(screen, 'Date', '2026-07-04');
    await typeInto(screen, 'Mileage', '4100');
    await typeInto(screen, 'Cost', '120');
    await press(screen, 'Save');
    const records = useMaintenanceStore.getState().records;
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      serviceType: 'air_filter',
      date: '2026-07-04',
      mileageKm: 4100,
      cost: 120,
      currency: 'INR',
    });
    await unmount(screen);
  });

  it('does not save a record with a bad date', async () => {
    const screen = await renderScreen(MaintenanceEditScreen, {});
    await typeInto(screen, 'Date', 'yesterday');
    await press(screen, 'Save');
    expect(useMaintenanceStore.getState().records).toHaveLength(0);
    expect(textOf(screen)).toContain('YYYY-MM-DD');
    await unmount(screen);
  });
});

describe('Vehicle profile', () => {
  it('saves the profile locally and queues it for sync', async () => {
    const screen = await renderScreen(VehicleScreen);
    await typeInto(screen, 'Current odometer', '4200');
    await typeInto(screen, 'Registration number (optional)', 'ka01ab1234');
    await press(screen, 'Save');
    expect(useScooterStore.getState().scooter).toMatchObject({
      odometerKm: 4200,
      registrationNumber: 'KA01AB1234',
    });
    expect(textOf(screen)).toContain('Saved on this phone.');
    expect(useSyncStore.getState().queue).toHaveLength(1);
    await unmount(screen);
  });

  it('rejects a negative odometer', async () => {
    const screen = await renderScreen(VehicleScreen);
    await typeInto(screen, 'Current odometer', '-4');
    await press(screen, 'Save');
    expect(useScooterStore.getState().scooter!.odometerKm).toBeNull();
    expect(textOf(screen)).toContain('at least 0');
    await unmount(screen);
  });
});

describe('Developer mode', () => {
  afterEach(async () => {
    await act(async () => {
      useSettingsStore.getState().setDeveloperMode(false);
    });
  });

  it('is off by default and only then reveals the developer tools row', async () => {
    expect(useSettingsStore.getState().developerMode).toBe(false);
    const screen = await renderScreen(SettingsScreen);
    expect(textOf(screen)).not.toContain('Open developer tools');

    await act(async () => {
      useSettingsStore.getState().setDeveloperMode(true);
    });
    expect(textOf(screen)).toContain('Open developer tools');
    await unmount(screen);
  });
});

describe('Other screens render', () => {
  const cases: [string, ComponentType, string][] = [
    ['Ride', RideScreen, 'Ready to ride?'],
    ['Diagnostics', DiagnosticsScreen, 'No diagnostic data available'],
    ['Settings', SettingsScreen, 'Developer mode'],
    ['Account', AccountScreen, 'An account is optional'],
    ['Developer', DeveloperScreen, 'UNKNOWN'],
  ];

  it.each(cases)('%s screen', async (_name, Component, expected) => {
    const screen = await renderScreen(Component);
    expect(textOf(screen)).toContain(expected);
    await unmount(screen);
  });

  it('Ride refuses to start without a connection and says what to do', async () => {
    const screen = await renderScreen(RideScreen);
    await press(screen, 'Start ride');
    expect(textOf(screen)).toContain('Connect to your scooter');
    expect(useTripStore.getState().status).toBe('idle');
    await unmount(screen);
  });

  it('Developer screen states that no protocol is assumed', async () => {
    const screen = await renderScreen(DeveloperScreen);
    expect(textOf(screen)).toContain(
      'No services, characteristics or commands are assumed',
    );
    await unmount(screen);
  });

  it('Account form validates before contacting the server', async () => {
    const screen = await renderScreen(AccountScreen);
    await typeInto(screen, 'Email', 'not-an-email');
    await typeInto(screen, 'Password', 'whatever');
    await press(screen, 'Sign in');
    expect(textOf(screen)).toContain('Enter a valid email address.');
    await unmount(screen);
  });
});

describe('App', () => {
  it('opens on the splash screen and then shows the dashboard', async () => {
    jest.useFakeTimers();
    try {
      const { default: App } = require('@/App');
      let renderer!: ReturnType<typeof create>;
      await act(async () => {
        renderer = create(<App />);
      });
      expect(textOf(renderer)).toContain('Your scooter. Your data.');

      await act(async () => {
        await jest.advanceTimersByTimeAsync(2500);
      });
      const text = textOf(renderer);
      expect(text).toContain('Start mock vehicle');
      expect(text).not.toContain('Your scooter. Your data.');
      await unmount(renderer);
    } finally {
      jest.useRealTimers();
    }
  });
});
