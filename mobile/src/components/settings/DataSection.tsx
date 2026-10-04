import React, { useState } from 'react';
import { Alert, Share } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/Layout';
import { Banner } from '@/components/ui/States';
import { SelectField } from '@/components/ui/SelectField';
import { clearLocalData } from '@/services/dataReset';
import {
  maintenanceTable,
  remindersTable,
  renderExport,
  ridesTable,
  type ExportFormat,
  type ExportTable,
} from '@/services/export/exporters';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { useRideStore } from '@/store/rideStore';
import { useServiceStore } from '@/store/serviceStore';
import { log } from '@/utils/logger';

type Dataset = 'maintenance' | 'rides' | 'reminders';

const DATASETS = [
  { value: 'maintenance' as const, label: 'Maintenance history' },
  { value: 'rides' as const, label: 'Ride history' },
  { value: 'reminders' as const, label: 'Service reminders' },
];
const FORMATS = [
  { value: 'json' as const, label: 'JSON' },
  { value: 'csv' as const, label: 'CSV' },
  { value: 'txt' as const, label: 'TXT' },
];

export function DataSection() {
  const [dataset, setDataset] = useState<Dataset>('maintenance');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [message, setMessage] = useState<string | null>(null);

  const buildTable = (): ExportTable => {
    switch (dataset) {
      case 'maintenance':
        return maintenanceTable(useMaintenanceStore.getState().records);
      case 'rides':
        return ridesTable(useRideStore.getState().rides);
      case 'reminders':
        return remindersTable(useServiceStore.getState().reminders);
    }
  };

  const exportData = async () => {
    const table = buildTable();
    if (table.rows.length === 0) {
      setMessage('Nothing to export yet.');
      return;
    }
    try {
      await Share.share({
        title: `${table.name}.${format}`,
        message: renderExport(table, format),
      });
      setMessage(null);
    } catch (error) {
      log.error('export', `Share failed: ${String(error)}`);
      setMessage('Could not open the share sheet.');
    }
  };

  const confirmClear = () =>
    Alert.alert(
      'Clear local data?',
      'This erases your scooter profile, reminders, maintenance records, rides and any unsynced changes from this phone and signs you out. Data already uploaded to your account is not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: () => {
            clearLocalData().then(
              () => setMessage('Local data cleared.'),
              () => setMessage('Could not clear all data.'),
            );
          },
        },
      ],
    );

  return (
    <>
      <SectionHeader title="DATA" />
      <Card>
        <SelectField
          label="Export"
          value={dataset}
          options={DATASETS}
          onChange={setDataset}
        />
        <SelectField
          label="Format"
          value={format}
          options={FORMATS}
          onChange={setFormat}
        />
        <Button
          label="Export and share"
          variant="secondary"
          onPress={exportData}
          fill
        />
        {message ? <Banner tone="info" message={message} /> : null}
      </Card>
      <Button
        variant="danger"
        label="Clear local data"
        onPress={confirmClear}
        fill
      />
    </>
  );
}
