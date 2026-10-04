import { useNavigation } from '@react-navigation/native';
import { MODEL_YEAR_MIN, VEHICLE_MODEL } from '@shared/constants';
import { History } from '@/components/ui/icons';
import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Banner } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { useForm } from '@/hooks/useForm';
import { useScooterStore } from '@/store/scooterStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateTime } from '@/utils/dates';
import { numberToText } from '@/utils/parse';
import {
  validateScooterForm,
  type ScooterFormValues,
} from '@/utils/validation';

export function VehicleScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const scooter = useScooterStore(state => state.scooter);
  const updateScooter = useScooterStore(state => state.updateScooter);
  const [showErrors, setShowErrors] = useState(false);
  const [saved, setSaved] = useState(false);

  const { values, setField } = useForm<ScooterFormValues>({
    name: scooter?.name ?? 'My Ntorq',
    modelYear: numberToText(scooter?.modelYear),
    registrationNumber: scooter?.registrationNumber ?? '',
    vin: scooter?.vin ?? '',
    engineNumber: scooter?.engineNumber ?? '',
    odometerKm: numberToText(scooter?.odometerKm),
  });

  const yearOptions = useMemo(() => {
    const latest = new Date().getFullYear() + 1;
    const years: { value: number; label: string }[] = [];
    for (let year = latest; year >= MODEL_YEAR_MIN; year--)
      years.push({ value: year, label: String(year) });
    return years;
  }, []);

  const result = validateScooterForm(values);
  const errors = showErrors ? result.errors : {};

  const commit = () => {
    if (!result.value) return;
    updateScooter(result.value);
    setSaved(true);
  };

  const save = () => {
    setShowErrors(true);
    setSaved(false);
    if (!result.value) return;

    const previous = scooter?.odometerKm ?? null;
    const next = result.value.odometerKm ?? null;
    if (previous !== null && next !== null && next < previous) {
      Alert.alert(
        'Odometer is lower than before',
        `You are changing ${previous} km to ${next} km. Odometers normally only go up. Save anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save anyway', onPress: commit },
        ],
      );
      return;
    }
    commit();
  };

  return (
    <Screen>
      <TextField
        label="Vehicle"
        value={VEHICLE_MODEL}
        onChangeText={() => undefined}
        editable={false}
      />
      <TextField
        label="Name"
        value={values.name}
        onChangeText={setField('name')}
        error={errors.name}
      />
      <SelectField
        label="Model year"
        value={values.modelYear === '' ? null : Number(values.modelYear)}
        options={yearOptions}
        onChange={year => setField('modelYear')(String(year))}
        placeholder="Select (optional)"
      />
      <TextField
        label="Current odometer"
        value={values.odometerKm}
        onChangeText={setField('odometerKm')}
        keyboardType="numeric"
        suffix="km"
        helper={
          scooter?.odometerUpdatedAt
            ? `Entered by you. Last updated ${formatDateTime(
                scooter.odometerUpdatedAt,
              )}.`
            : 'Enter the reading from your instrument cluster. It is used for service reminders.'
        }
        error={errors.odometerKm}
      />
      <TextField
        label="Registration number (optional)"
        value={values.registrationNumber}
        onChangeText={setField('registrationNumber')}
        autoCapitalize="characters"
        error={errors.registrationNumber}
      />
      <TextField
        label="VIN / chassis number (optional)"
        value={values.vin}
        onChangeText={setField('vin')}
        autoCapitalize="characters"
        error={errors.vin}
      />
      <TextField
        label="Engine number (optional)"
        value={values.engineNumber}
        onChangeText={setField('engineNumber')}
        autoCapitalize="characters"
        error={errors.engineNumber}
      />

      {saved ? <Banner tone="ok" message="Saved on this phone." /> : null}
      <Button label="Save" onPress={save} fill />
      <Button
        variant="secondary"
        label="Maintenance history"
        icon={<History size={18} color={colors.text} />}
        onPress={() => navigation.navigate('MaintenanceList')}
        fill
      />
    </Screen>
  );
}
