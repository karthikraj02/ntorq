import {
  validateMaintenanceForm,
  validateReminderForm,
  validateScooterForm,
  type MaintenanceFormValues,
  type ReminderFormValues,
  type ScooterFormValues,
} from '@/utils/validation';

const scooterForm = (
  overrides: Partial<ScooterFormValues> = {},
): ScooterFormValues => ({
  name: 'My Ntorq',
  modelYear: '',
  registrationNumber: '',
  vin: '',
  engineNumber: '',
  odometerKm: '',
  ...overrides,
});

describe('validateScooterForm', () => {
  it('accepts a minimal profile and stores empty optionals as null (never as 0 or "")', () => {
    const { value, errors } = validateScooterForm(scooterForm());
    expect(errors).toEqual({});
    expect(value).toEqual({
      name: 'My Ntorq',
      modelYear: null,
      registrationNumber: null,
      vin: null,
      engineNumber: null,
      odometerKm: null,
    });
  });

  it('normalises identifiers to upper case and parses numbers', () => {
    const { value } = validateScooterForm(
      scooterForm({
        registrationNumber: ' ka01ab1234 ',
        vin: 'md2abc123xyz',
        odometerKm: '12,345.5',
        modelYear: '2024',
      }),
      2026,
    );
    expect(value).toMatchObject({
      registrationNumber: 'KA01AB1234',
      vin: 'MD2ABC123XYZ',
      odometerKm: 12345.5,
      modelYear: 2024,
    });
  });

  it('keeps an odometer of exactly 0', () => {
    expect(
      validateScooterForm(scooterForm({ odometerKm: '0' })).value?.odometerKm,
    ).toBe(0);
  });

  it.each([
    ['empty name', { name: '  ' }, 'name'],
    ['negative odometer', { odometerKm: '-3' }, 'odometerKm'],
    ['text odometer', { odometerKm: 'lots' }, 'odometerKm'],
    ['absurd odometer', { odometerKm: '99999999' }, 'odometerKm'],
    ['year too early', { modelYear: '1990' }, 'modelYear'],
    ['year too far ahead', { modelYear: '2040' }, 'modelYear'],
    ['fractional year', { modelYear: '2024.5' }, 'modelYear'],
    ['VIN with symbols', { vin: 'ABC-123!' }, 'vin'],
    [
      'over-long registration',
      { registrationNumber: 'X'.repeat(21) },
      'registrationNumber',
    ],
  ])('rejects %s', (_label, overrides, field) => {
    const { value, errors } = validateScooterForm(
      scooterForm(overrides as Partial<ScooterFormValues>),
      2026,
    );
    expect(value).toBeNull();
    expect(errors[field as keyof ScooterFormValues]).toBeTruthy();
  });
});

const reminderForm = (
  overrides: Partial<ReminderFormValues> = {},
): ReminderFormValues => ({
  label: '',
  intervalKm: '',
  intervalMonths: '',
  lastServiceDate: '',
  lastServiceKm: '',
  manualNextDueKm: '',
  manualNextDueDate: '',
  notes: '',
  ...overrides,
});

describe('validateReminderForm', () => {
  it('accepts a completely empty schedule (the app must not force invented intervals)', () => {
    const { value, errors } = validateReminderForm(
      reminderForm(),
      'oil_change',
    );
    expect(errors).toEqual({});
    expect(value).toMatchObject({
      intervalKm: null,
      intervalMonths: null,
      lastServiceDate: null,
      lastServiceKm: null,
    });
  });

  it('parses a full schedule', () => {
    const { value } = validateReminderForm(
      reminderForm({
        intervalKm: '3000',
        intervalMonths: '6',
        lastServiceDate: '2026-01-15',
        lastServiceKm: '900',
        manualNextDueKm: '4200',
        manualNextDueDate: '2026-08-01',
        notes: '  synthetic oil ',
      }),
      'oil_change',
    );
    expect(value).toEqual({
      label: null,
      intervalKm: 3000,
      intervalMonths: 6,
      lastServiceDate: '2026-01-15',
      lastServiceKm: 900,
      manualNextDueKm: 4200,
      manualNextDueDate: '2026-08-01',
      notes: 'synthetic oil',
    });
  });

  it('requires a name only for custom items', () => {
    expect(
      validateReminderForm(reminderForm(), 'other').errors.label,
    ).toBeTruthy();
    expect(
      validateReminderForm(reminderForm({ label: 'Chain lube' }), 'other').value
        ?.label,
    ).toBe('Chain lube');
    expect(
      validateReminderForm(reminderForm({ label: 'ignored' }), 'tyres').value
        ?.label,
    ).toBeNull();
  });

  it.each([
    ['zero interval', { intervalKm: '0' }, 'intervalKm'],
    ['fractional interval', { intervalMonths: '1.5' }, 'intervalMonths'],
    ['impossible date', { lastServiceDate: '2026-02-30' }, 'lastServiceDate'],
    ['wrong date format', { lastServiceDate: '15/01/2026' }, 'lastServiceDate'],
    ['bad next date', { manualNextDueDate: 'soon' }, 'manualNextDueDate'],
    ['negative mileage', { lastServiceKm: '-1' }, 'lastServiceKm'],
  ])('rejects %s', (_label, overrides, field) => {
    const { value, errors } = validateReminderForm(
      reminderForm(overrides),
      'oil_change',
    );
    expect(value).toBeNull();
    expect(errors[field as keyof ReminderFormValues]).toBeTruthy();
  });
});

const maintenanceForm = (
  overrides: Partial<MaintenanceFormValues> = {},
): MaintenanceFormValues => ({
  date: '2026-09-01',
  mileageKm: '',
  serviceType: 'oil_change',
  partsReplaced: '',
  oilType: '',
  oilQuantityLitres: '',
  cost: '',
  workshop: '',
  notes: '',
  ...overrides,
});
const context = {
  scooterId: 'scooter-1',
  currency: 'INR',
  today: '2026-10-03',
};

describe('validateMaintenanceForm', () => {
  it('builds a record with the scooter, currency and nulls for blanks', () => {
    const { value, errors } = validateMaintenanceForm(
      maintenanceForm(),
      context,
    );
    expect(errors).toEqual({});
    expect(value).toEqual({
      scooterId: 'scooter-1',
      date: '2026-09-01',
      mileageKm: null,
      serviceType: 'oil_change',
      partsReplaced: null,
      oilType: null,
      oilQuantityLitres: null,
      cost: null,
      currency: 'INR',
      workshop: null,
      notes: null,
    });
  });

  it('parses the optional numeric details', () => {
    const { value } = validateMaintenanceForm(
      maintenanceForm({
        mileageKm: '5200',
        oilType: '10W-30',
        oilQuantityLitres: '0.8',
        cost: '450.50',
        workshop: 'Local',
      }),
      context,
    );
    expect(value).toMatchObject({
      mileageKm: 5200,
      oilType: '10W-30',
      oilQuantityLitres: 0.8,
      cost: 450.5,
      workshop: 'Local',
    });
  });

  it('requires a real date and rejects future dates', () => {
    expect(
      validateMaintenanceForm(maintenanceForm({ date: '' }), context).errors
        .date,
    ).toMatch(/Enter the date/);
    expect(
      validateMaintenanceForm(maintenanceForm({ date: '2026-02-31' }), context)
        .errors.date,
    ).toBeTruthy();
    expect(
      validateMaintenanceForm(maintenanceForm({ date: '2026-10-04' }), context)
        .errors.date,
    ).toMatch(/future/);
    expect(
      validateMaintenanceForm(maintenanceForm({ date: '2026-10-03' }), context)
        .errors.date,
    ).toBeUndefined();
  });

  it.each([
    ['negative cost', { cost: '-5' }, 'cost'],
    ['non-numeric cost', { cost: 'free' }, 'cost'],
    [
      'oil quantity above 50 L',
      { oilQuantityLitres: '51' },
      'oilQuantityLitres',
    ],
    ['negative mileage', { mileageKm: '-1' }, 'mileageKm'],
    ['very long notes', { notes: 'x'.repeat(2001) }, 'notes'],
  ])('rejects %s', (_label, overrides, field) => {
    const { value, errors } = validateMaintenanceForm(
      maintenanceForm(overrides),
      context,
    );
    expect(value).toBeNull();
    expect(errors[field as keyof MaintenanceFormValues]).toBeTruthy();
  });
});
