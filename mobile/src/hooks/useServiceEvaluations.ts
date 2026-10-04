import type { ServiceReminderDTO } from '@shared/types';
import { useMemo } from 'react';
import {
  evaluateReminder,
  worstStatus,
  type ServiceEvaluation,
} from '@/services/maintenance/serviceCalculations';
import { useScooterStore } from '@/store/scooterStore';
import { useServiceStore } from '@/store/serviceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { todayIso } from '@/utils/dates';

export interface ReminderWithStatus {
  reminder: ServiceReminderDTO;
  evaluation: ServiceEvaluation;
}

/** Every enabled reminder with its computed status, most urgent first. */
export function useServiceEvaluations() {
  const reminders = useServiceStore(state => state.reminders);
  const odometerKm = useScooterStore(
    state => state.scooter?.odometerKm ?? null,
  );
  const thresholds = useSettingsStore(state => state.serviceThresholds);
  const today = todayIso();

  return useMemo(() => {
    const items: ReminderWithStatus[] = reminders
      .filter(reminder => reminder.enabled)
      .map(reminder => ({
        reminder,
        evaluation: evaluateReminder(reminder, {
          odometerKm,
          today,
          thresholds,
        }),
      }));
    const rank = {
      OVERDUE: 0,
      DUE: 1,
      DUE_SOON: 2,
      OK: 3,
      NOT_SET: 4,
    } as const;
    items.sort((a, b) => rank[a.evaluation.status] - rank[b.evaluation.status]);
    return {
      items,
      overall: worstStatus(items.map(item => item.evaluation.status)),
      odometerKm,
    };
  }, [reminders, odometerKm, thresholds, today]);
}
