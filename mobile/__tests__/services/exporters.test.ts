import type {
  MaintenanceRecordDTO,
  RideDTO,
  ServiceReminderDTO,
} from '@shared/types';
import {
  csvEscape,
  maintenanceTable,
  remindersTable,
  renderCsv,
  renderExport,
  renderJson,
  renderTxt,
  ridesTable,
  type ExportTable,
} from '@/services/export/exporters';

const base = {
  id: 'x',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
};

const record = (
  overrides: Partial<MaintenanceRecordDTO> = {},
): MaintenanceRecordDTO => ({
  ...base,
  scooterId: 's',
  date: '2026-03-01',
  mileageKm: 1000,
  serviceType: 'oil_change',
  partsReplaced: null,
  oilType: '10W-30',
  oilQuantityLitres: 0.8,
  cost: 450,
  currency: 'INR',
  workshop: 'Joe, "Fast" Garage',
  notes: 'line one\nline two',
  ...overrides,
});

const table: ExportTable = {
  name: 'demo',
  columns: ['a', 'b'],
  rows: [
    { a: 'plain', b: 1 },
    { a: 'has,comma', b: null },
    { a: 'say "hi"', b: true },
  ],
};

describe('csv', () => {
  it('escapes commas, quotes and line breaks per RFC 4180', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('x\ny')).toBe('"x\ny"');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(0)).toBe('0');
    expect(csvEscape(false)).toBe('false');
  });

  it('renders a header and one line per row, leaving missing values empty', () => {
    expect(renderCsv(table)).toBe(
      'a,b\r\nplain,1\r\n"has,comma",\r\n"say ""hi""",true\r\n',
    );
  });
});

describe('json', () => {
  it('wraps rows with metadata and keeps nulls (not made-up values)', () => {
    const parsed = JSON.parse(renderJson(table, '2026-10-03T00:00:00.000Z'));
    expect(parsed).toMatchObject({
      app: 'Ntorq Companion',
      dataset: 'demo',
      exportedAt: '2026-10-03T00:00:00.000Z',
      count: 3,
    });
    expect(parsed.rows[1]).toEqual({ a: 'has,comma', b: null });
  });
});

describe('txt', () => {
  it('writes readable blocks and "N/A" for missing values', () => {
    const text = renderTxt(table, '2026-10-03T00:00:00.000Z');
    expect(text).toContain('Ntorq Companion - demo');
    expect(text).toContain('Records: 3');
    expect(text).toContain('--- Record 2 ---\na: has,comma\nb: N/A');
  });
});

describe('renderExport', () => {
  it('dispatches on format', () => {
    expect(renderExport(table, 'csv').startsWith('a,b')).toBe(true);
    expect(JSON.parse(renderExport(table, 'json')).count).toBe(3);
    expect(renderExport(table, 'txt')).toContain('Record 1');
  });
});

describe('dataset builders', () => {
  it('exports maintenance oldest-first with readable service names and survives awkward text', () => {
    const t = maintenanceTable([
      record({ date: '2026-05-01' }),
      record({ date: '2026-03-01', serviceType: 'air_filter' }),
    ]);
    expect(t.rows.map(r => r.date)).toEqual(['2026-03-01', '2026-05-01']);
    expect(t.rows[0]?.serviceType).toBe('Air Filter');
    const csv = renderCsv(t);
    expect(csv).toContain('"Joe, ""Fast"" Garage"');
    expect(csv).toContain('"line one\nline two"');
  });

  it('exports rides including their source so mock rides are identifiable', () => {
    const ride: RideDTO = {
      ...base,
      scooterId: 's',
      source: 'mock',
      startedAt: '2026-03-01T09:00:00.000Z',
      endedAt: '2026-03-01T09:30:00.000Z',
      distanceKm: 12.4,
      ridingTimeSec: 1500,
      elapsedSec: 1800,
      averageSpeedKmh: null,
      maxSpeedKmh: 61,
    };
    const t = ridesTable([ride]);
    expect(t.rows[0]).toMatchObject({
      source: 'mock',
      averageSpeedKmh: null,
      distanceKm: 12.4,
    });
  });

  it('exports reminders using the custom label for "other" items', () => {
    const reminder = (
      type: ServiceReminderDTO['type'],
      label: string | null,
    ): ServiceReminderDTO => ({
      ...base,
      scooterId: 's',
      type,
      label,
      enabled: true,
      intervalKm: null,
      intervalMonths: null,
      lastServiceDate: null,
      lastServiceKm: null,
      manualNextDueKm: null,
      manualNextDueDate: null,
      notes: null,
    });
    const t = remindersTable([
      reminder('other', 'Chain lube'),
      reminder('tyres', null),
    ]);
    expect(t.rows.map(r => r.item)).toEqual(['Chain lube', 'Tyres']);
  });
});
