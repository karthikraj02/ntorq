import { SERVICE_ITEM_LABELS } from '@shared/constants';
import type {
  MaintenanceRecordDTO,
  RideDTO,
  ServiceReminderDTO,
} from '@shared/types';

export type ExportFormat = 'json' | 'csv' | 'txt';

export type Cell = string | number | boolean | null;

export interface ExportTable {
  /** File-name friendly dataset name, e.g. "maintenance-history". */
  name: string;
  columns: string[];
  rows: Record<string, Cell>[];
}

/** RFC 4180 quoting: wrap in quotes when the value has a comma, quote or line break. */
export function csvEscape(cell: Cell): string {
  if (cell === null) return '';
  const text = String(cell);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function renderCsv(table: ExportTable): string {
  const header = table.columns.map(csvEscape).join(',');
  const lines = table.rows.map(row =>
    table.columns.map(column => csvEscape(row[column] ?? null)).join(','),
  );
  return [header, ...lines].join('\r\n') + '\r\n';
}

export function renderJson(table: ExportTable, exportedAt: string): string {
  return JSON.stringify(
    {
      app: 'Ntorq Companion',
      dataset: table.name,
      exportedAt,
      count: table.rows.length,
      rows: table.rows.map(row =>
        Object.fromEntries(
          table.columns.map(column => [column, row[column] ?? null]),
        ),
      ),
    },
    null,
    2,
  );
}

export function renderTxt(table: ExportTable, exportedAt: string): string {
  const header = [
    `Ntorq Companion - ${table.name}`,
    `Exported: ${exportedAt}`,
    `Records: ${table.rows.length}`,
  ];
  const blocks = table.rows.map((row, index) => {
    const lines = table.columns.map(
      column => `${column}: ${row[column] ?? 'N/A'}`,
    );
    return [`--- Record ${index + 1} ---`, ...lines].join('\n');
  });
  return [header.join('\n'), ...blocks].join('\n\n') + '\n';
}

export function renderExport(
  table: ExportTable,
  format: ExportFormat,
  exportedAt: string = new Date().toISOString(),
): string {
  switch (format) {
    case 'csv':
      return renderCsv(table);
    case 'json':
      return renderJson(table, exportedAt);
    case 'txt':
      return renderTxt(table, exportedAt);
  }
}

/* ---------- Dataset builders ---------- */

export function maintenanceTable(records: MaintenanceRecordDTO[]): ExportTable {
  return {
    name: 'maintenance-history',
    columns: [
      'date',
      'mileageKm',
      'serviceType',
      'partsReplaced',
      'oilType',
      'oilQuantityLitres',
      'cost',
      'currency',
      'workshop',
      'notes',
    ],
    rows: [...records]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(record => ({
        date: record.date,
        mileageKm: record.mileageKm,
        serviceType: SERVICE_ITEM_LABELS[record.serviceType],
        partsReplaced: record.partsReplaced,
        oilType: record.oilType,
        oilQuantityLitres: record.oilQuantityLitres,
        cost: record.cost,
        currency: record.currency,
        workshop: record.workshop,
        notes: record.notes,
      })),
  };
}

export function ridesTable(rides: RideDTO[]): ExportTable {
  return {
    name: 'ride-history',
    columns: [
      'startedAt',
      'endedAt',
      'source',
      'distanceKm',
      'ridingTimeSec',
      'elapsedSec',
      'averageSpeedKmh',
      'maxSpeedKmh',
    ],
    rows: [...rides]
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .map(ride => ({
        startedAt: ride.startedAt,
        endedAt: ride.endedAt,
        source: ride.source,
        distanceKm: ride.distanceKm,
        ridingTimeSec: ride.ridingTimeSec,
        elapsedSec: ride.elapsedSec,
        averageSpeedKmh: ride.averageSpeedKmh,
        maxSpeedKmh: ride.maxSpeedKmh,
      })),
  };
}

export function remindersTable(reminders: ServiceReminderDTO[]): ExportTable {
  return {
    name: 'service-reminders',
    columns: [
      'item',
      'tracked',
      'intervalKm',
      'intervalMonths',
      'lastServiceDate',
      'lastServiceKm',
      'manualNextDueKm',
      'manualNextDueDate',
      'notes',
    ],
    rows: reminders.map(reminder => ({
      item:
        reminder.type === 'other' && reminder.label
          ? reminder.label
          : SERVICE_ITEM_LABELS[reminder.type],
      tracked: reminder.enabled,
      intervalKm: reminder.intervalKm,
      intervalMonths: reminder.intervalMonths,
      lastServiceDate: reminder.lastServiceDate,
      lastServiceKm: reminder.lastServiceKm,
      manualNextDueKm: reminder.manualNextDueKm,
      manualNextDueDate: reminder.manualNextDueDate,
      notes: reminder.notes,
    })),
  };
}
