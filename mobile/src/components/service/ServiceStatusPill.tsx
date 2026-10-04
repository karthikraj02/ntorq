import { SERVICE_STATUS_LABELS, type ServiceStatus } from '@shared/constants';
import React from 'react';
import { Pill } from '@/components/ui/Pill';
import type { Tone } from '@/theme/tokens';

export const STATUS_TONE: Record<ServiceStatus, Tone> = {
  OK: 'ok',
  DUE_SOON: 'warn',
  DUE: 'caution',
  OVERDUE: 'danger',
  NOT_SET: 'faint',
};

export function ServiceStatusPill({ status }: { status: ServiceStatus }) {
  return (
    <Pill label={SERVICE_STATUS_LABELS[status]} tone={STATUS_TONE[status]} />
  );
}
