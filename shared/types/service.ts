import type { ServiceItemType } from '../constants/service';
import type { IsoDate, SyncableDTO } from './common';

export interface ServiceReminderDTO extends SyncableDTO {
  scooterId: string;
  type: ServiceItemType;
  /** Display name, used when `type` is "other". */
  label: string | null;
  enabled: boolean;
  intervalKm: number | null;
  intervalMonths: number | null;
  lastServiceDate: IsoDate | null;
  lastServiceKm: number | null;
  /** Overrides the next-due value computed from the last service + interval. */
  manualNextDueKm: number | null;
  manualNextDueDate: IsoDate | null;
  notes: string | null;
}
