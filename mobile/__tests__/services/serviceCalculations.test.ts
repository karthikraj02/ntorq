import { DEFAULT_SERVICE_THRESHOLDS } from '@shared/constants';
import {
  completedPatch,
  computeNextDue,
  describeRemaining,
  evaluateReminder,
  worstStatus,
} from '@/services/maintenance/serviceCalculations';

const thresholds = { ...DEFAULT_SERVICE_THRESHOLDS };
const TODAY = '2026-10-03';

function schedule(
  overrides: Partial<Parameters<typeof computeNextDue>[0]> = {},
) {
  return {
    intervalKm: null,
    intervalMonths: null,
    lastServiceDate: null,
    lastServiceKm: null,
    manualNextDueKm: null,
    manualNextDueDate: null,
    ...overrides,
  };
}

const ctx = (odometerKm: number | null, today = TODAY) => ({
  odometerKm,
  today,
  thresholds,
});

describe('computeNextDue', () => {
  it('is empty without an interval: the app invents no schedule', () => {
    expect(computeNextDue(schedule())).toEqual({ km: null, date: null });
    expect(
      computeNextDue(
        schedule({ lastServiceKm: 1000, lastServiceDate: '2026-01-01' }),
      ),
    ).toEqual({
      km: null,
      date: null,
    });
  });

  it('adds the interval to the last service', () => {
    expect(
      computeNextDue(
        schedule({
          lastServiceKm: 1000,
          intervalKm: 3000,
          lastServiceDate: '2026-01-15',
          intervalMonths: 6,
        }),
      ),
    ).toEqual({ km: 4000, date: '2026-07-15' });
  });

  it('needs both the last service and the interval', () => {
    expect(computeNextDue(schedule({ intervalKm: 3000 })).km).toBeNull();
    expect(computeNextDue(schedule({ lastServiceKm: 1000 })).km).toBeNull();
  });

  it('lets manual values override the computed ones', () => {
    expect(
      computeNextDue(
        schedule({
          lastServiceKm: 1000,
          intervalKm: 3000,
          manualNextDueKm: 3500,
          lastServiceDate: '2026-01-15',
          intervalMonths: 6,
          manualNextDueDate: '2026-12-01',
        }),
      ),
    ).toEqual({ km: 3500, date: '2026-12-01' });
  });

  it('treats a last service at 0 km as a real value', () => {
    expect(
      computeNextDue(schedule({ lastServiceKm: 0, intervalKm: 500 })).km,
    ).toBe(500);
  });
});

describe('evaluateReminder by distance', () => {
  const s = schedule({ lastServiceKm: 1000, intervalKm: 3000 }); // due at 4000

  it('covers every boundary', () => {
    const at = (odometer: number) => evaluateReminder(s, ctx(odometer)).status;
    expect(at(3799)).toBe('OK'); // 201 km left (> 200)
    expect(at(3800)).toBe('DUE_SOON'); // 200 left
    expect(at(3999)).toBe('DUE_SOON'); // 1 left
    expect(at(4000)).toBe('DUE'); // 0 left
    expect(at(4099)).toBe('DUE'); // 99 km past (< 100)
    expect(at(4100)).toBe('OVERDUE'); // 100 km past
    expect(at(9000)).toBe('OVERDUE');
  });

  it('reports the remaining distance and basis', () => {
    const evaluation = evaluateReminder(s, ctx(3200));
    expect(evaluation).toMatchObject({
      status: 'OK',
      nextDueKm: 4000,
      remainingKm: 800,
      basis: 'km',
      reason: null,
    });
    expect(describeRemaining(evaluation)).toBe('Due in 800 km');
  });

  it('cannot evaluate distance without an odometer, and says why', () => {
    const evaluation = evaluateReminder(s, ctx(null));
    expect(evaluation.status).toBe('NOT_SET');
    expect(evaluation.reason).toBe('odometer-unknown');
    expect(describeRemaining(evaluation)).toBe('Set your current odometer');
  });
});

describe('evaluateReminder by time', () => {
  const s = schedule({ lastServiceDate: '2026-04-03', intervalMonths: 6 }); // due 2026-10-03

  it('covers every boundary', () => {
    const at = (today: string) => evaluateReminder(s, ctx(null, today)).status;
    expect(at('2026-09-18')).toBe('OK'); // 15 days left
    expect(at('2026-09-19')).toBe('DUE_SOON'); // 14 days left
    expect(at('2026-10-02')).toBe('DUE_SOON'); // 1 day left
    expect(at('2026-10-03')).toBe('DUE'); // due today
    expect(at('2026-10-09')).toBe('DUE'); // 6 days late (< 7)
    expect(at('2026-10-10')).toBe('OVERDUE'); // 7 days late
  });

  it('describes days in plain words', () => {
    expect(
      describeRemaining(evaluateReminder(s, ctx(null, '2026-10-02'))),
    ).toBe('Due in 1 day');
    expect(
      describeRemaining(evaluateReminder(s, ctx(null, '2026-09-23'))),
    ).toBe('Due in 10 days');
    expect(
      describeRemaining(evaluateReminder(s, ctx(null, '2026-10-03'))),
    ).toBe('Due today');
    expect(
      describeRemaining(evaluateReminder(s, ctx(null, '2026-10-05'))),
    ).toBe('Past due by 2 days');
  });
});

describe('evaluateReminder with both distance and time', () => {
  const s = schedule({
    lastServiceKm: 1000,
    intervalKm: 3000,
    lastServiceDate: '2026-04-03',
    intervalMonths: 6,
  });

  it('takes the more urgent of the two', () => {
    // distance fine (800 left) but the date has passed
    const late = evaluateReminder(s, ctx(3200, '2026-11-20'));
    expect(late.status).toBe('OVERDUE');
    expect(late.basis).toBe('date');

    // date fine, distance overdue
    const far = evaluateReminder(s, ctx(4500, '2026-05-01'));
    expect(far.status).toBe('OVERDUE');
    expect(far.basis).toBe('km');
  });

  it('prefers distance when both are equally urgent', () => {
    const evaluation = evaluateReminder(s, ctx(3000, '2026-04-10'));
    expect(evaluation.status).toBe('OK');
    expect(evaluation.basis).toBe('km');
  });

  it('still evaluates by date when the odometer is unknown, and flags it', () => {
    const evaluation = evaluateReminder(s, ctx(null, '2026-05-01'));
    expect(evaluation.status).toBe('OK');
    expect(evaluation.basis).toBe('date');
    expect(evaluation.reason).toBe('odometer-unknown');
  });
});

describe('not configured', () => {
  it('is NOT_SET with no schedule, never OK', () => {
    const evaluation = evaluateReminder(schedule(), ctx(5000));
    expect(evaluation.status).toBe('NOT_SET');
    expect(evaluation.reason).toBe('no-schedule');
    expect(describeRemaining(evaluation)).toBe('No interval set');
  });

  it('honours user-defined thresholds', () => {
    const s = schedule({ lastServiceKm: 0, intervalKm: 1000 });
    const custom = { ...thresholds, dueSoonKm: 50, overdueKm: 10 };
    expect(
      evaluateReminder(s, { odometerKm: 900, today: TODAY, thresholds: custom })
        .status,
    ).toBe('OK');
    expect(
      evaluateReminder(s, { odometerKm: 960, today: TODAY, thresholds: custom })
        .status,
    ).toBe('DUE_SOON');
    expect(
      evaluateReminder(s, {
        odometerKm: 1010,
        today: TODAY,
        thresholds: custom,
      }).status,
    ).toBe('OVERDUE');
  });
});

describe('describeRemaining (distance)', () => {
  it('words past-due and due-now', () => {
    const s = schedule({ lastServiceKm: 0, intervalKm: 1000 });
    expect(describeRemaining(evaluateReminder(s, ctx(1000)))).toBe('Due now');
    expect(describeRemaining(evaluateReminder(s, ctx(1040)))).toBe(
      'Past due by 40 km',
    );
    expect(describeRemaining(evaluateReminder(s, ctx(100)))).toBe(
      'Due in 900 km',
    );
  });
});

describe('worstStatus', () => {
  it('ranks severity and ignores NOT_SET when anything is known', () => {
    expect(worstStatus(['OK', 'DUE_SOON', 'OK'])).toBe('DUE_SOON');
    expect(worstStatus(['OK', 'OVERDUE', 'DUE'])).toBe('OVERDUE');
    expect(worstStatus(['NOT_SET', 'OK'])).toBe('OK');
    expect(worstStatus(['NOT_SET', 'NOT_SET'])).toBe('NOT_SET');
    expect(worstStatus([])).toBe('NOT_SET');
  });
});

describe('completedPatch', () => {
  it('records the service and clears one-off overrides', () => {
    expect(completedPatch('2026-10-03', 5200)).toEqual({
      lastServiceDate: '2026-10-03',
      lastServiceKm: 5200,
      manualNextDueKm: null,
      manualNextDueDate: null,
    });
    expect(completedPatch('2026-10-03', null).lastServiceKm).toBeNull();
  });

  it('resets the schedule so the next due point moves forward', () => {
    const before = schedule({
      lastServiceKm: 1000,
      intervalKm: 3000,
      manualNextDueKm: 3500,
    });
    const after = { ...before, ...completedPatch('2026-10-03', 4200) };
    expect(computeNextDue(after).km).toBe(7200);
    expect(evaluateReminder(after, ctx(4200)).status).toBe('OK');
  });
});
