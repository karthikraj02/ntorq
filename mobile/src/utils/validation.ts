import { MODEL_YEAR_MIN, type ServiceItemType } from '@shared/constants';
import type { ServiceReminderDTO } from '@shared/types';
import type { MaintenanceInput } from '@/store/maintenanceStore';
import type { ScooterPatch } from '@/store/scooterStore';
import { isValidIsoDate, todayIso } from './dates';
import { emptyToNull, parseOptionalNumber } from './parse';

export interface FormResult<TValue, TField extends string> {
  value: TValue | null;
  errors: Partial<Record<TField, string>>;
}

function finish<TValue, TField extends string>(
  errors: Partial<Record<TField, string>>,
  build: () => TValue,
): FormResult<TValue, TField> {
  return Object.keys(errors).length > 0
    ? { value: null, errors }
    : { value: build(), errors };
}

function checkText(
  text: string,
  label: string,
  max: number,
  errors: Record<string, string>,
  field: string,
): string | null {
  const value = emptyToNull(text);
  if (value !== null && value.length > max) {
    errors[field] = `${label} must be at most ${max} characters.`;
  }
  return value;
}

function checkDate(
  text: string,
  label: string,
  errors: Record<string, string>,
  field: string,
  options: { notFuture?: boolean; today?: string } = {},
): string | null {
  const value = emptyToNull(text);
  if (value === null) return null;
  if (!isValidIsoDate(value)) {
    errors[field] = `${label} must be a real date in YYYY-MM-DD format.`;
    return null;
  }
  if (options.notFuture && value > (options.today ?? todayIso())) {
    errors[field] = `${label} cannot be in the future.`;
  }
  return value;
}

function checkNumber(
  text: string,
  options: { label: string; min: number; max: number; integer?: boolean },
  errors: Record<string, string>,
  field: string,
): number | null {
  const parsed = parseOptionalNumber(text, options);
  if (parsed.error) errors[field] = parsed.error;
  return parsed.value;
}

/* ---------- Vehicle profile ---------- */

export interface ScooterFormValues {
  name: string;
  modelYear: string;
  registrationNumber: string;
  vin: string;
  engineNumber: string;
  odometerKm: string;
}
export type ScooterField = keyof ScooterFormValues;

export function validateScooterForm(
  values: ScooterFormValues,
  currentYear: number = new Date().getFullYear(),
): FormResult<ScooterPatch, ScooterField> {
  const errors: Partial<Record<ScooterField, string>> = {};
  const e = errors as Record<string, string>;

  const name = values.name.trim();
  if (name === '') errors.name = 'Give your scooter a name.';
  else if (name.length > 60)
    errors.name = 'Name must be at most 60 characters.';

  const modelYear = checkNumber(
    values.modelYear,
    {
      label: 'Model year',
      min: MODEL_YEAR_MIN,
      max: currentYear + 1,
      integer: true,
    },
    e,
    'modelYear',
  );
  const registrationNumber = checkText(
    values.registrationNumber,
    'Registration number',
    20,
    e,
    'registrationNumber',
  );
  const vin = checkText(values.vin, 'Chassis / VIN number', 32, e, 'vin');
  if (vin !== null && !/^[A-Za-z0-9]+$/.test(vin) && !errors.vin) {
    errors.vin = 'Chassis / VIN number can only contain letters and digits.';
  }
  const engineNumber = checkText(
    values.engineNumber,
    'Engine number',
    32,
    e,
    'engineNumber',
  );
  const odometerKm = checkNumber(
    values.odometerKm,
    { label: 'Odometer', min: 0, max: 2_000_000 },
    e,
    'odometerKm',
  );

  return finish(errors, () => ({
    name,
    modelYear,
    registrationNumber: registrationNumber?.toUpperCase() ?? null,
    vin: vin?.toUpperCase() ?? null,
    engineNumber,
    odometerKm,
  }));
}

/* ---------- Service reminder ---------- */

export interface ReminderFormValues {
  label: string;
  intervalKm: string;
  intervalMonths: string;
  lastServiceDate: string;
  lastServiceKm: string;
  manualNextDueKm: string;
  manualNextDueDate: string;
  notes: string;
}
export type ReminderField = keyof ReminderFormValues;

export type ReminderPatchValue = Pick<
  ServiceReminderDTO,
  | 'label'
  | 'intervalKm'
  | 'intervalMonths'
  | 'lastServiceDate'
  | 'lastServiceKm'
  | 'manualNextDueKm'
  | 'manualNextDueDate'
  | 'notes'
>;

export function validateReminderForm(
  values: ReminderFormValues,
  type: ServiceItemType,
): FormResult<ReminderPatchValue, ReminderField> {
  const errors: Partial<Record<ReminderField, string>> = {};
  const e = errors as Record<string, string>;

  const label = checkText(values.label, 'Name', 60, e, 'label');
  if (type === 'other' && label === null)
    errors.label = 'Give this item a name.';

  const intervalKm = checkNumber(
    values.intervalKm,
    { label: 'Distance interval', min: 1, max: 200_000, integer: true },
    e,
    'intervalKm',
  );
  const intervalMonths = checkNumber(
    values.intervalMonths,
    { label: 'Time interval', min: 1, max: 240, integer: true },
    e,
    'intervalMonths',
  );
  const lastServiceDate = checkDate(
    values.lastServiceDate,
    'Last service date',
    e,
    'lastServiceDate',
    { notFuture: true },
  );
  const lastServiceKm = checkNumber(
    values.lastServiceKm,
    { label: 'Last service mileage', min: 0, max: 2_000_000 },
    e,
    'lastServiceKm',
  );
  const manualNextDueKm = checkNumber(
    values.manualNextDueKm,
    { label: 'Next service mileage', min: 0, max: 2_000_000 },
    e,
    'manualNextDueKm',
  );
  const manualNextDueDate = checkDate(
    values.manualNextDueDate,
    'Next service date',
    e,
    'manualNextDueDate',
  );
  const notes = checkText(values.notes, 'Notes', 1000, e, 'notes');

  return finish(errors, () => ({
    label: type === 'other' ? label : null,
    intervalKm,
    intervalMonths,
    lastServiceDate,
    lastServiceKm,
    manualNextDueKm,
    manualNextDueDate,
    notes,
  }));
}

/* ---------- Maintenance record ---------- */

export interface MaintenanceFormValues {
  date: string;
  mileageKm: string;
  serviceType: ServiceItemType;
  partsReplaced: string;
  oilType: string;
  oilQuantityLitres: string;
  cost: string;
  workshop: string;
  notes: string;
}
export type MaintenanceField = keyof MaintenanceFormValues;

export function validateMaintenanceForm(
  values: MaintenanceFormValues,
  context: { scooterId: string; currency: string; today?: string },
): FormResult<MaintenanceInput, MaintenanceField> {
  const errors: Partial<Record<MaintenanceField, string>> = {};
  const e = errors as Record<string, string>;

  const date = checkDate(values.date, 'Date', e, 'date', {
    notFuture: true,
    today: context.today,
  });
  if (date === null && !errors.date)
    errors.date = 'Enter the date of the service.';

  const mileageKm = checkNumber(
    values.mileageKm,
    { label: 'Mileage', min: 0, max: 2_000_000 },
    e,
    'mileageKm',
  );
  const partsReplaced = checkText(
    values.partsReplaced,
    'Parts replaced',
    500,
    e,
    'partsReplaced',
  );
  const oilType = checkText(values.oilType, 'Oil type', 80, e, 'oilType');
  const oilQuantityLitres = checkNumber(
    values.oilQuantityLitres,
    { label: 'Oil quantity', min: 0, max: 50 },
    e,
    'oilQuantityLitres',
  );
  const cost = checkNumber(
    values.cost,
    { label: 'Cost', min: 0, max: 10_000_000 },
    e,
    'cost',
  );
  const workshop = checkText(values.workshop, 'Workshop', 120, e, 'workshop');
  const notes = checkText(values.notes, 'Notes', 2000, e, 'notes');

  return finish(errors, () => ({
    scooterId: context.scooterId,
    date: date as string,
    mileageKm,
    serviceType: values.serviceType,
    partsReplaced,
    oilType,
    oilQuantityLitres,
    cost,
    currency: context.currency,
    workshop,
    notes,
  }));
}
