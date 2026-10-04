import { SERVICE_ITEM_LABELS } from '@shared/constants';
import type { ServiceReminderDTO } from '@shared/types';
import React from 'react';
import { StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import {
  describeRemaining,
  type ServiceEvaluation,
} from '@/services/maintenance/serviceCalculations';
import { useTheme } from '@/theme/ThemeProvider';
import { toneColor } from '@/theme/tokens';
import { formatDate } from '@/utils/dates';
import { formatKm, joinAvailable } from '@/utils/format';
import { ServiceStatusPill, STATUS_TONE } from './ServiceStatusPill';

const fixed = StyleSheet.create({
  title: { flex: 1 },
});

export function reminderTitle(reminder: ServiceReminderDTO): string {
  return reminder.type === 'other' && reminder.label
    ? reminder.label
    : SERVICE_ITEM_LABELS[reminder.type];
}

interface Props {
  reminder: ServiceReminderDTO;
  evaluation: ServiceEvaluation;
  onPress: () => void;
}

export function ServiceItemCard({ reminder, evaluation, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Card
      onPress={onPress}
      accentColor={toneColor(colors, STATUS_TONE[evaluation.status])}
      accessibilityLabel={`${reminderTitle(reminder)}, ${evaluation.status}`}
    >
      <Row justify="between" align="center" gap="sm">
        <AppText variant="heading" numberOfLines={1} style={fixed.title}>
          {reminderTitle(reminder)}
        </AppText>
        <ServiceStatusPill status={evaluation.status} />
      </Row>
      <AppText tone={evaluation.status === 'NOT_SET' ? 'faint' : 'default'}>
        {describeRemaining(evaluation)}
      </AppText>
      <AppText variant="caption" tone="dim">
        Last:{' '}
        {joinAvailable(
          formatDate(reminder.lastServiceDate),
          formatKm(reminder.lastServiceKm),
        )}
      </AppText>
      <AppText variant="caption" tone="dim">
        Next:{' '}
        {joinAvailable(
          formatDate(evaluation.nextDueDate),
          formatKm(evaluation.nextDueKm),
        )}
      </AppText>
    </Card>
  );
}
