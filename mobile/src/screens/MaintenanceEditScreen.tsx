import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { SERVICE_ITEM_LABELS, SERVICE_ITEM_TYPES } from '@shared/constants';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { SettingRow } from '@/components/ui/Layout';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { useForm } from '@/hooks/useForm';
import type { RootStackParamList } from '@/navigation/types';
import { recordMaintenance } from '@/services/maintenance/maintenanceActions';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { useScooterStore } from '@/store/scooterStore';
import { useSettingsStore } from '@/store/settingsStore';
import { todayIso } from '@/utils/dates';
import { numberToText, parseOptionalNumber } from '@/utils/parse';
import {
  validateMaintenanceForm,
  type MaintenanceFormValues,
} from '@/utils/validation';

const TYPE_OPTIONS = SERVICE_ITEM_TYPES.map(value => ({
  value,
  label: SERVICE_ITEM_LABELS[value],
}));

export function MaintenanceEditScreen() {
  const navigation = useNavigation();
  const { params } =
    useRoute<RouteProp<RootStackParamList, 'MaintenanceEdit'>>();
  const scooter = useScooterStore(state => state.scooter);
  const currency = useSettingsStore(state => state.currency);
  const existing = useMaintenanceStore(state =>
    state.records.find(r => r.id === params.recordId),
  );
  const updateRecord = useMaintenanceStore(state => state.updateRecord);
  const removeRecord = useMaintenanceStore(state => state.removeRecord);

  const { values, setField } = useForm<MaintenanceFormValues>({
    date: existing?.date ?? todayIso(),
    mileageKm: numberToText(existing?.mileageKm ?? scooter?.odometerKm),
    serviceType:
      existing?.serviceType ?? params.serviceType ?? 'general_service',
    partsReplaced: existing?.partsReplaced ?? '',
    oilType: existing?.oilType ?? '',
    oilQuantityLitres: numberToText(existing?.oilQuantityLitres),
    cost: numberToText(existing?.cost),
    workshop: existing?.workshop ?? '',
    notes: existing?.notes ?? '',
  });
  const [updateReminder, setUpdateReminder] = useState(true);
  const [updateOdometer, setUpdateOdometer] = useState(true);
  const [showErrors, setShowErrors] = useState(false);

  const result = validateMaintenanceForm(values, {
    scooterId: scooter?.id ?? '',
    currency,
  });
  const errors = showErrors ? result.errors : {};

  const mileage = parseOptionalNumber(values.mileageKm, {
    label: 'Mileage',
    min: 0,
  }).value;
  const raisesOdometer =
    mileage !== null && mileage > (scooter?.odometerKm ?? -1);
  const isOil = values.serviceType === 'oil_change';

  const save = () => {
    setShowErrors(true);
    if (!result.value) return;
    if (existing) {
      updateRecord(existing.id, result.value);
    } else {
      recordMaintenance(result.value, {
        updateReminder,
        updateOdometer: updateOdometer && raisesOdometer,
      });
    }
    navigation.goBack();
  };

  const confirmDelete = () =>
    Alert.alert('Delete this record?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (existing) removeRecord(existing.id);
          navigation.goBack();
        },
      },
    ]);

  return (
    <Screen>
      <SelectField
        label="Service type"
        value={values.serviceType}
        options={TYPE_OPTIONS}
        onChange={setField('serviceType')}
      />
      <DateField
        label="Date"
        value={values.date}
        onChange={setField('date')}
        error={errors.date}
      />
      <TextField
        label="Mileage"
        value={values.mileageKm}
        onChangeText={setField('mileageKm')}
        keyboardType="numeric"
        suffix="km"
        error={errors.mileageKm}
      />
      <TextField
        label="Parts replaced"
        value={values.partsReplaced}
        onChangeText={setField('partsReplaced')}
        multiline
        error={errors.partsReplaced}
      />
      {isOil ? (
        <>
          <TextField
            label="Oil type"
            value={values.oilType}
            onChangeText={setField('oilType')}
            error={errors.oilType}
          />
          <TextField
            label="Oil quantity"
            value={values.oilQuantityLitres}
            onChangeText={setField('oilQuantityLitres')}
            keyboardType="decimal-pad"
            suffix="litres"
            error={errors.oilQuantityLitres}
          />
        </>
      ) : null}
      <TextField
        label="Cost"
        value={values.cost}
        onChangeText={setField('cost')}
        keyboardType="decimal-pad"
        suffix={currency}
        error={errors.cost}
      />
      <TextField
        label="Workshop"
        value={values.workshop}
        onChangeText={setField('workshop')}
        error={errors.workshop}
      />
      <TextField
        label="Notes"
        value={values.notes}
        onChangeText={setField('notes')}
        multiline
        error={errors.notes}
      />

      {!existing ? (
        <>
          {values.serviceType !== 'other' ? (
            <SettingRow
              title="Update the service reminder"
              description="Marks the matching reminder as just serviced (app only)."
              switchValue={updateReminder}
              onSwitchChange={setUpdateReminder}
            />
          ) : null}
          {raisesOdometer ? (
            <SettingRow
              title="Update my odometer"
              description="Your stored odometer is lower than this mileage."
              switchValue={updateOdometer}
              onSwitchChange={setUpdateOdometer}
            />
          ) : null}
        </>
      ) : null}

      <Button label="Save" onPress={save} fill />
      {existing ? (
        <Button
          variant="danger"
          label="Delete record"
          onPress={confirmDelete}
          fill
        />
      ) : null}
    </Screen>
  );
}
