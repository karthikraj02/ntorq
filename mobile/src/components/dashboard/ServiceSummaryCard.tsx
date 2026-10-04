import { useNavigation } from '@react-navigation/native';
import { Droplet } from '@/components/ui/icons';
import React from 'react';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import {
  ServiceStatusPill,
  STATUS_TONE,
} from '@/components/service/ServiceStatusPill';
import { useServiceEvaluations } from '@/hooks/useServiceEvaluations';
import { describeRemaining } from '@/services/maintenance/serviceCalculations';
import { useTheme } from '@/theme/ThemeProvider';
import { toneColor } from '@/theme/tokens';

/** Oil-change status plus a count of anything else that needs attention. */
export function ServiceSummaryCard() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { items } = useServiceEvaluations();

  const oil = items.find(item => item.reminder.type === 'oil_change');
  const urgent = items.filter(
    item =>
      item.evaluation.status === 'DUE' || item.evaluation.status === 'OVERDUE',
  ).length;
  const status = oil?.evaluation.status ?? 'NOT_SET';

  return (
    <Card
      accentColor={toneColor(colors, STATUS_TONE[status])}
      onPress={() => navigation.navigate('OilChange')}
      accessibilityLabel="Oil change reminder"
    >
      <Row justify="between" align="center">
        <Row align="center" gap="sm">
          <Droplet size={18} color={colors.textDim} />
          <AppText variant="label" tone="dim">
            SERVICE · OIL CHANGE
          </AppText>
        </Row>
        <ServiceStatusPill status={status} />
      </Row>
      <AppText variant="title">
        {oil ? describeRemaining(oil.evaluation) : 'No oil change reminder'}
      </AppText>
      <AppText variant="caption" tone="faint">
        App reminder - not read from the instrument cluster.
      </AppText>
      {urgent > 0 ? (
        <AppText variant="caption" tone="caution">
          {urgent} service item{urgent === 1 ? '' : 's'} due or overdue
        </AppText>
      ) : null}
    </Card>
  );
}
