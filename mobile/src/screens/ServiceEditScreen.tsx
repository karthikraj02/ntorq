import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { reminderTitle } from '@/components/service/ServiceItemCard';
import { ServiceStatusPill } from '@/components/service/ServiceStatusPill';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { SectionHeader, SettingRow } from '@/components/ui/Layout';
import { Row, Stack } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Banner, EmptyState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useForm } from '@/hooks/useForm';
import type { RootStackParamList } from '@/navigation/types';
import {
  completedPatch,
  describeRemaining,
  evaluateReminder,
} from '@/services/maintenance/serviceCalculations';
import { useScooterStore } from '@/store/scooterStore';
import { useServiceStore } from '@/store/serviceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { todayIso } from '@/utils/dates';
import { numberToText } from '@/utils/parse';
import {
  validateReminderForm,
  type ReminderFormValues,
} from '@/utils/validation';

export function ServiceEditScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ServiceEdit'>>();
  const reminder = useServiceStore(state =>
    state.reminders.find(r => r.id === params.reminderId),
  );
  const updateReminder = useServiceStore(state => state.updateReminder);
  const removeReminder = useServiceStore(state => state.removeReminder);
  const odometerKm = useScooterStore(
    state => state.scooter?.odometerKm ?? null,
  );
  const thresholds = useSettingsStore(state => state.serviceThresholds);

  const { values, setField, setValues } = useForm<ReminderFormValues>({
    label: reminder?.label ?? '',
    intervalKm: numberToText(reminder?.intervalKm),
    intervalMonths: numberToText(reminder?.intervalMonths),
    lastServiceDate: reminder?.lastServiceDate ?? '',
    lastServiceKm: numberToText(reminder?.lastServiceKm),
    manualNextDueKm: numberToText(reminder?.manualNextDueKm),
    manualNextDueDate: reminder?.manualNextDueDate ?? '',
    notes: reminder?.notes ?? '',
  });
  const [enabled, setEnabled] = useState(reminder?.enabled ?? true);
  const [showErrors, setShowErrors] = useState(false);

  const result = useMemo(
    () => (reminder ? validateReminderForm(values, reminder.type) : null),
    [values, reminder],
  );
  const preview = useMemo(
    () =>
      result?.value
        ? evaluateReminder(result.value, {
            odometerKm,
            today: todayIso(),
            thresholds,
          })
        : null,
    [result, odometerKm, thresholds],
  );

  if (!reminder || !result) {
    return (
      <Screen>
        <EmptyState
          title="Item not found"
          message="This service item no longer exists."
        />
      </Screen>
    );
  }
  const errors = showErrors ? result.errors : {};

  const save = () => {
    setShowErrors(true);
    if (!result.value) return;
    updateReminder(reminder.id, { ...result.value, enabled });
    navigation.goBack();
  };

  const markServicedToday = () => {
    const patch = completedPatch(todayIso(), odometerKm);
    setValues(current => ({
      ...current,
      lastServiceDate: patch.lastServiceDate ?? '',
      lastServiceKm: numberToText(patch.lastServiceKm),
      manualNextDueKm: '',
      manualNextDueDate: '',
    }));
  };

  const confirmDelete = () =>
    Alert.alert('Delete this item?', reminderTitle(reminder), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeReminder(reminder.id);
          navigation.goBack();
        },
      },
    ]);

  return (
    <Screen>
      <Card>
        <SettingRow
          title="Track this item"
          switchValue={enabled}
          onSwitchChange={setEnabled}
        />
        {preview ? (
          <Stack gap="xs">
            <Row justify="between" align="center">
              <AppText variant="label" tone="dim">
                STATUS WITH THESE VALUES
              </AppText>
              <ServiceStatusPill status={preview.status} />
            </Row>
            <AppText>{describeRemaining(preview)}</AppText>
          </Stack>
        ) : null}
      </Card>

      <Banner
        tone="info"
        message="Enter the intervals from your owner's manual or workshop. The app does not assume official values."
      />

      {reminder.type === 'other' ? (
        <TextField
          label="Name"
          value={values.label}
          onChangeText={setField('label')}
          error={errors.label}
        />
      ) : null}

      <SectionHeader title="SCHEDULE" />
      <TextField
        label="Repeat every (distance)"
        value={values.intervalKm}
        onChangeText={setField('intervalKm')}
        keyboardType="numeric"
        suffix="km"
        error={errors.intervalKm}
      />
      <TextField
        label="Repeat every (time)"
        value={values.intervalMonths}
        onChangeText={setField('intervalMonths')}
        keyboardType="numeric"
        suffix="months"
        error={errors.intervalMonths}
      />

      <SectionHeader title="LAST SERVICE" />
      <DateField
        label="Last service date"
        value={values.lastServiceDate}
        onChange={setField('lastServiceDate')}
        error={errors.lastServiceDate}
      />
      <TextField
        label="Last service mileage"
        value={values.lastServiceKm}
        onChangeText={setField('lastServiceKm')}
        keyboardType="numeric"
        suffix="km"
        error={errors.lastServiceKm}
      />
      <Button
        small
        variant="secondary"
        label={`Fill in: serviced today${
          odometerKm !== null ? ' at current odometer' : ''
        }`}
        onPress={markServicedToday}
      />

      <SectionHeader title="NEXT SERVICE (OPTIONAL OVERRIDE)" />
      <TextField
        label="Next service mileage"
        value={values.manualNextDueKm}
        onChangeText={setField('manualNextDueKm')}
        keyboardType="numeric"
        suffix="km"
        helper="Leave empty to use last service + distance interval."
        error={errors.manualNextDueKm}
      />
      <DateField
        label="Next service date"
        value={values.manualNextDueDate}
        onChange={setField('manualNextDueDate')}
        error={errors.manualNextDueDate}
      />

      <TextField
        label="Notes"
        value={values.notes}
        onChangeText={setField('notes')}
        multiline
        error={errors.notes}
      />

      <Button label="Save" onPress={save} fill />
      {reminder.type === 'other' ? (
        <Button
          variant="danger"
          label="Delete item"
          onPress={confirmDelete}
          fill
        />
      ) : null}
    </Screen>
  );
}
