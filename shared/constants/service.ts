export const SERVICE_ITEM_TYPES = [
  'oil_change',
  'general_service',
  'air_filter',
  'spark_plug',
  'brake_inspection',
  'cvt_inspection',
  'drive_belt',
  'tyres',
  'battery',
  'coolant',
  'other',
] as const;

export type ServiceItemType = (typeof SERVICE_ITEM_TYPES)[number];

export const SERVICE_ITEM_LABELS: Record<ServiceItemType, string> = {
  oil_change: 'Oil Change',
  general_service: 'General Service',
  air_filter: 'Air Filter',
  spark_plug: 'Spark Plug',
  brake_inspection: 'Brake Inspection',
  cvt_inspection: 'CVT Inspection',
  drive_belt: 'Drive Belt',
  tyres: 'Tyres',
  battery: 'Battery',
  coolant: 'Coolant (if applicable)',
  other: 'Other Maintenance',
};

export const SERVICE_STATUSES = [
  'OK',
  'DUE_SOON',
  'DUE',
  'OVERDUE',
  'NOT_SET',
] as const;

export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  OK: 'OK',
  DUE_SOON: 'DUE SOON',
  DUE: 'DUE',
  OVERDUE: 'OVERDUE',
  NOT_SET: 'NOT SET',
};

/**
 * Reminder types that are created for a new scooter. Coolant is created
 * disabled because it may not apply to this vehicle; the rider can enable it.
 */
export const DEFAULT_ENABLED_SERVICE_TYPES: Record<ServiceItemType, boolean> = {
  oil_change: true,
  general_service: true,
  air_filter: true,
  spark_plug: true,
  brake_inspection: true,
  cvt_inspection: true,
  drive_belt: true,
  tyres: true,
  battery: true,
  coolant: false,
  other: false,
};

/**
 * Application defaults for when a reminder turns "due soon" / "overdue".
 * These are NOT manufacturer intervals; the rider can change them in Settings.
 */
export const DEFAULT_SERVICE_THRESHOLDS = {
  dueSoonKm: 200,
  dueSoonDays: 14,
  overdueKm: 100,
  overdueDays: 7,
} as const;
