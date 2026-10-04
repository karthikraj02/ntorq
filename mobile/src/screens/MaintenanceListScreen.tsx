import { useNavigation } from '@react-navigation/native';
import { SERVICE_ITEM_LABELS } from '@shared/constants';
import { Plus } from '@/components/ui/icons';
import React, { useMemo } from 'react';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { sortRecords, useMaintenanceStore } from '@/store/maintenanceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDate } from '@/utils/dates';
import { formatCurrency, formatKm } from '@/utils/format';

export function MaintenanceListScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const records = useMaintenanceStore(state => state.records);
  const currency = useSettingsStore(state => state.currency);

  const sorted = useMemo(() => sortRecords(records), [records]);
  // Only costs in the current currency are added up, so mixed currencies never give a wrong total.
  const total = useMemo(
    () =>
      records
        .filter(record => record.currency === currency && record.cost !== null)
        .reduce((sum, record) => sum + (record.cost ?? 0), 0),
    [records, currency],
  );

  return (
    <Screen>
      <Button
        label="Add service record"
        icon={<Plus size={18} color={colors.onAccent} />}
        onPress={() => navigation.navigate('MaintenanceEdit', {})}
        fill
      />
      {records.length > 0 ? (
        <Card>
          <AppText variant="label" tone="dim">
            TOTAL RECORDED COST
          </AppText>
          <AppText variant="metric">{formatCurrency(total, currency)}</AppText>
          <AppText variant="caption" tone="faint">
            {records.length} record{records.length === 1 ? '' : 's'}
          </AppText>
        </Card>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState
          title="No service records"
          message="Add oil changes, repairs and inspections to keep a full history of your scooter."
        />
      ) : (
        sorted.map(record => (
          <Card
            key={record.id}
            onPress={() =>
              navigation.navigate('MaintenanceEdit', { recordId: record.id })
            }
          >
            <Row justify="between">
              <AppText variant="heading">
                {SERVICE_ITEM_LABELS[record.serviceType]}
              </AppText>
              <AppText tone="dim">{formatDate(record.date)}</AppText>
            </Row>
            <AppText variant="caption" tone="dim">
              {formatKm(record.mileageKm)}
              {record.cost !== null
                ? ` · ${formatCurrency(record.cost, record.currency)}`
                : ''}
              {record.workshop ? ` · ${record.workshop}` : ''}
            </AppText>
            {record.partsReplaced ? (
              <AppText variant="caption" tone="dim" numberOfLines={2}>
                Parts: {record.partsReplaced}
              </AppText>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
