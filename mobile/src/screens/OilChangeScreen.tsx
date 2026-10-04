import { useNavigation } from '@react-navigation/native';
import { Droplet } from '@/components/ui/icons';
import React, { useState } from 'react';
import { MarkCompletedSheet } from '@/components/service/MarkCompletedSheet';
import {
  ServiceStatusPill,
  STATUS_TONE,
} from '@/components/service/ServiceStatusPill';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Row, Stack } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/States';
import { useServiceEvaluations } from '@/hooks/useServiceEvaluations';
import { describeRemaining } from '@/services/maintenance/serviceCalculations';
import { vehicleService } from '@/services/vehicle';
import { useServiceStore } from '@/store/serviceStore';
import { useVehicleStore } from '@/store/vehicleStore';
import { useTheme } from '@/theme/ThemeProvider';
import { toneColor } from '@/theme/tokens';
import type { CommandResult } from '@/types/telemetry';
import { formatDate } from '@/utils/dates';
import { formatKm, joinAvailable } from '@/utils/format';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Row justify="between">
      <AppText tone="dim">{label}</AppText>
      <AppText>{value}</AppText>
    </Row>
  );
}

export function OilChangeScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { items, odometerKm } = useServiceEvaluations();
  const allReminders = useServiceStore(state => state.reminders);
  const clusterRead = useVehicleStore(
    state => state.capabilities.oilReminderRead,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resetResult, setResetResult] = useState<CommandResult | null>(null);

  const oilReminder = allReminders.find(
    reminder => reminder.type === 'oil_change',
  );
  const evaluation = items.find(
    item => item.reminder.type === 'oil_change',
  )?.evaluation;

  const editSchedule = () =>
    oilReminder &&
    navigation.navigate('ServiceEdit', { reminderId: oilReminder.id });
  const tryVehicleReset = async () =>
    setResetResult(await vehicleService.resetOilReminder());

  return (
    <Screen>
      {/* ---- The app's own reminder ---- */}
      <Card
        accentColor={toneColor(
          colors,
          STATUS_TONE[evaluation?.status ?? 'NOT_SET'],
        )}
      >
        <Row justify="between" align="center">
          <Row align="center" gap="sm">
            <Droplet size={18} color={colors.textDim} />
            <AppText variant="label" tone="dim">
              APP REMINDER
            </AppText>
          </Row>
          <ServiceStatusPill status={evaluation?.status ?? 'NOT_SET'} />
        </Row>

        {!oilReminder?.enabled || !evaluation ? (
          <>
            <AppText variant="title">Oil change not tracked</AppText>
            <Button label="Set up reminder" onPress={editSchedule} />
          </>
        ) : (
          <>
            <AppText variant="title">{describeRemaining(evaluation)}</AppText>
            <Stack gap="xs">
              <Detail
                label="Last oil change"
                value={joinAvailable(
                  formatDate(oilReminder.lastServiceDate),
                  formatKm(oilReminder.lastServiceKm),
                )}
              />
              <Detail label="Current mileage" value={formatKm(odometerKm)} />
              <Detail
                label="Next oil change"
                value={joinAvailable(
                  formatDate(evaluation.nextDueDate),
                  formatKm(evaluation.nextDueKm),
                )}
              />
              <Detail
                label="Remaining distance"
                value={
                  evaluation.remainingKm === null
                    ? 'N/A'
                    : formatKm(evaluation.remainingKm)
                }
              />
            </Stack>
            {evaluation.status === 'NOT_SET' ? (
              <Banner
                tone="info"
                message={
                  evaluation.reason === 'odometer-unknown'
                    ? 'Enter your current odometer on the Vehicle tab.'
                    : "Set your oil-change interval (from your owner's manual) and the last oil change."
                }
              />
            ) : null}
            <Button
              fill
              label="Mark oil change as completed"
              onPress={() => setSheetOpen(true)}
            />
            <Button
              fill
              variant="secondary"
              label="Edit schedule"
              onPress={editSchedule}
            />
          </>
        )}
        <AppText variant="caption" tone="faint">
          Stored in this app only.
        </AppText>
      </Card>

      {/* ---- The scooter's instrument-cluster reminder ---- */}
      <Card>
        <Row justify="between" align="center">
          <AppText variant="label" tone="dim">
            VEHICLE CLUSTER REMINDER
          </AppText>
          <Pill label="UNAVAILABLE" tone="faint" />
        </Row>
        <AppText variant="heading">Vehicle-level reset unavailable</AppText>
        <AppText tone="dim">
          {clusterRead === 'verified'
            ? 'The cluster reminder can be read.'
            : "The app cannot read or reset the reminder shown on your scooter's own display. The Ntorq Bluetooth protocol has not been verified, so no command is ever sent."}
        </AppText>
        <Button
          variant="secondary"
          label="Reset on vehicle"
          onPress={tryVehicleReset}
        />
        {resetResult ? (
          <Banner
            tone={resetResult.status === 'SUCCESS' ? 'ok' : 'warn'}
            title={
              resetResult.status === 'NOT_SUPPORTED'
                ? 'NOT SUPPORTED'
                : resetResult.status
            }
            message={resetResult.message}
          />
        ) : null}
      </Card>

      <MarkCompletedSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}
