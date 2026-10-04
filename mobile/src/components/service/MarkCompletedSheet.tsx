import React, { useState } from 'react';
import { Modal, Pressable, ScrollView } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { Row, Stack } from '@/components/ui/Row';
import { Banner } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useForm } from '@/hooks/useForm';
import { recordMaintenance } from '@/services/maintenance/maintenanceActions';
import { useScooterStore } from '@/store/scooterStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useThemedStyles } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { todayIso } from '@/utils/dates';
import { numberToText } from '@/utils/parse';
import {
  validateMaintenanceForm,
  type MaintenanceFormValues,
} from '@/utils/validation';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * "Mark Oil Change as Completed". Writes to this app's own database only: it
 * updates the APP reminder and adds a maintenance record, and never contacts
 * the scooter.
 */
export function MarkCompletedSheet({ visible, onClose }: Props) {
  const scooter = useScooterStore(state => state.scooter);
  const currency = useSettingsStore(state => state.currency);
  const styles = useThemedStyles(colors => ({
    backdrop: {
      flex: 1,
      backgroundColor: '#000000AA',
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '90%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
    },
    body: { padding: spacing.lg, gap: spacing.md },
  }));

  const initial = (): MaintenanceFormValues => ({
    date: todayIso(),
    mileageKm: numberToText(scooter?.odometerKm),
    serviceType: 'oil_change',
    partsReplaced: '',
    oilType: '',
    oilQuantityLitres: '',
    cost: '',
    workshop: '',
    notes: '',
  });
  const { values, setField, setValues } = useForm<MaintenanceFormValues>(
    initial(),
  );
  const [showErrors, setShowErrors] = useState(false);

  const result = validateMaintenanceForm(values, {
    scooterId: scooter?.id ?? '',
    currency,
  });
  const errors = showErrors ? result.errors : {};

  const close = () => {
    setShowErrors(false);
    setValues(initial());
    onClose();
  };

  const save = () => {
    setShowErrors(true);
    if (!result.value || !scooter) return;
    recordMaintenance(result.value, {
      updateReminder: true,
      updateOdometer: true,
    });
    close();
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <AppText variant="title">Mark oil change as completed</AppText>
            <Banner
              tone="info"
              message="This updates the reminder inside this app only. Your scooter's instrument-cluster reminder is not changed."
            />
            <DateField
              label="Date"
              value={values.date}
              onChange={setField('date')}
              error={errors.date}
            />
            <TextField
              label="Odometer at service"
              value={values.mileageKm}
              onChangeText={setField('mileageKm')}
              keyboardType="numeric"
              suffix="km"
              helper="Also updates your stored odometer if it is higher."
              error={errors.mileageKm}
            />
            <TextField
              label="Oil type (optional)"
              value={values.oilType}
              onChangeText={setField('oilType')}
              error={errors.oilType}
            />
            <TextField
              label="Notes (optional)"
              value={values.notes}
              onChangeText={setField('notes')}
              multiline
              error={errors.notes}
            />
            <Row gap="md">
              <Stack fill>
                <Button
                  fill
                  variant="secondary"
                  label="Cancel"
                  onPress={close}
                />
              </Stack>
              <Stack fill>
                <Button fill label="Save" onPress={save} />
              </Stack>
            </Row>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
