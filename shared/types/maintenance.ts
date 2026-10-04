import type { ServiceItemType } from '../constants/service';
import type { IsoDate, SyncableDTO } from './common';

export interface MaintenanceRecordDTO extends SyncableDTO {
  scooterId: string;
  date: IsoDate;
  mileageKm: number | null;
  serviceType: ServiceItemType;
  partsReplaced: string | null;
  oilType: string | null;
  oilQuantityLitres: number | null;
  cost: number | null;
  currency: string;
  workshop: string | null;
  notes: string | null;
}
