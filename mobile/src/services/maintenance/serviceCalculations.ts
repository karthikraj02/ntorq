import type { ServiceStatus } from '@shared/constants';
import type { ServiceReminderDTO } from '@shared/types';
import { addMonths, daysBetween } from '@/utils/dates';
import { formatKm } from '@/utils/format';

/** When a reminder turns "due soon" and when it counts as "overdue". User-configurable. */
export interface ServiceThresholds {
  dueSoonKm: number;
  dueSoonDays: number;
  /** How far past the due point before DUE becomes OVERDUE. */
  overdueKm: number;
  overdueDays: number;
}

export type NotSetReason = 'no-schedule' | 'odometer-unknown';

export interface ServiceEvaluation {
  status: ServiceStatus;
  nextDueKm: number | null;
  nextDueDate: string | null;
  remainingKm: number | null;
  remainingDays: number | null;
  /** Which measure decided the status; used to phrase "Due in 800 km". */
  basis: 'km' | 'date' | null;
  /** Set when something prevents a full evaluation. */
  reason: NotSetReason | null;
}

type ScheduleFields = Pick<
  ServiceReminderDTO,
  | 'intervalKm'
  | 'intervalMonths'
  | 'lastServiceDate'
  | 'lastServiceKm'
  | 'manualNextDueKm'
  | 'manualNextDueDate'
>;

const SEVERITY: Record<ServiceStatus, number> = {
  NOT_SET: -1,
  OK: 0,
  DUE_SOON: 1,
  DUE: 2,
  OVERDUE: 3,
};

/** The next due point: a manual override wins, otherwise last service + interval. */
export function computeNextDue(reminder: ScheduleFields): {
  km: number | null;
  date: string | null;
} {
  const km =
    reminder.manualNextDueKm ??
    (reminder.lastServiceKm !== null && reminder.intervalKm !== null
      ? reminder.lastServiceKm + reminder.intervalKm
      : null);
  const date =
    reminder.manualNextDueDate ??
    (reminder.lastServiceDate !== null && reminder.intervalMonths !== null
      ? addMonths(reminder.lastServiceDate, reminder.intervalMonths)
      : null);
  return { km, date };
}

function axisStatus(
  remaining: number,
  dueSoon: number,
  overdue: number,
): ServiceStatus {
  if (remaining > dueSoon) return 'OK';
  if (remaining > 0) return 'DUE_SOON';
  if (remaining > -overdue) return 'DUE';
  return 'OVERDUE';
}

export function evaluateReminder(
  reminder: ScheduleFields,
  context: {
    odometerKm: number | null;
    /** Today as YYYY-MM-DD. */
    today: string;
    thresholds: ServiceThresholds;
  },
): ServiceEvaluation {
  const { km: nextDueKm, date: nextDueDate } = computeNextDue(reminder);
  const { odometerKm, today, thresholds } = context;

  const remainingKm =
    nextDueKm !== null && odometerKm !== null ? nextDueKm - odometerKm : null;
  const remainingDays =
    nextDueDate !== null ? daysBetween(today, nextDueDate) : null;

  const kmStatus =
    remainingKm !== null
      ? axisStatus(remainingKm, thresholds.dueSoonKm, thresholds.overdueKm)
      : null;
  const dateStatus =
    remainingDays !== null
      ? axisStatus(
          remainingDays,
          thresholds.dueSoonDays,
          thresholds.overdueDays,
        )
      : null;

  const awaitingOdometer = nextDueKm !== null && odometerKm === null;

  if (kmStatus === null && dateStatus === null) {
    return {
      status: 'NOT_SET',
      nextDueKm,
      nextDueDate,
      remainingKm,
      remainingDays,
      basis: null,
      reason: awaitingOdometer ? 'odometer-unknown' : 'no-schedule',
    };
  }

  const useDate =
    kmStatus === null ||
    (dateStatus !== null && SEVERITY[dateStatus] > SEVERITY[kmStatus]);

  return {
    status: (useDate ? dateStatus : kmStatus) as ServiceStatus,
    nextDueKm,
    nextDueDate,
    remainingKm,
    remainingDays,
    basis: useDate ? 'date' : 'km',
    reason: awaitingOdometer ? 'odometer-unknown' : null,
  };
}

/** The most urgent status in a list (NOT_SET only wins when it is all there is). */
export function worstStatus(statuses: ServiceStatus[]): ServiceStatus {
  return statuses.reduce<ServiceStatus>(
    (worst, status) => (SEVERITY[status] > SEVERITY[worst] ? status : worst),
    'NOT_SET',
  );
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

/** Short human text such as "Due in 800 km" or "Past due by 3 days". */
export function describeRemaining(evaluation: ServiceEvaluation): string {
  if (evaluation.status === 'NOT_SET' || evaluation.basis === null) {
    return evaluation.reason === 'odometer-unknown'
      ? 'Set your current odometer'
      : 'No interval set';
  }

  if (evaluation.basis === 'km' && evaluation.remainingKm !== null) {
    const km = Math.round(evaluation.remainingKm);
    if (km > 0) return `Due in ${formatKm(km)}`;
    if (km === 0) return 'Due now';
    return `Past due by ${formatKm(-km)}`;
  }

  if (evaluation.remainingDays !== null) {
    const days = evaluation.remainingDays;
    if (days > 0) return `Due in ${plural(days, 'day')}`;
    if (days === 0) return 'Due today';
    return `Past due by ${plural(-days, 'day')}`;
  }
  return 'No interval set';
}

/** Fields to write on a reminder when the service has just been carried out. */
export function completedPatch(
  date: string,
  km: number | null,
): Pick<
  ServiceReminderDTO,
  'lastServiceDate' | 'lastServiceKm' | 'manualNextDueKm' | 'manualNextDueDate'
> {
  return {
    lastServiceDate: date,
    lastServiceKm: km,
    // Manual overrides described the old schedule; the new one follows the interval.
    manualNextDueKm: null,
    manualNextDueDate: null,
  };
}
