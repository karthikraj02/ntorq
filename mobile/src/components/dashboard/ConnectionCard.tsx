import { Bluetooth, BluetoothOff } from '@/components/ui/icons';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Row, Stack } from '@/components/ui/Row';
import { vehicleService } from '@/services/vehicle';
import { useScooterStore } from '@/store/scooterStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useVehicleStore } from '@/store/vehicleStore';
import { useTheme } from '@/theme/ThemeProvider';
import { toneColor, type Tone } from '@/theme/tokens';
import type { ConnectionState } from '@/types/telemetry';

const fixed = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5 },
});

const STATE_LABEL: Record<ConnectionState, string> = {
  disconnected: 'DISCONNECTED',
  connecting: 'CONNECTING',
  connected: 'CONNECTED',
  error: 'CONNECTION ERROR',
};

const STATE_TONE: Record<ConnectionState, Tone> = {
  disconnected: 'faint',
  connecting: 'warn',
  connected: 'ok',
  error: 'danger',
};

export function ConnectionCard() {
  const { colors } = useTheme();
  const scooterName = useScooterStore(
    state => state.scooter?.name ?? 'My Ntorq',
  );
  const model = useScooterStore(state => state.scooter?.vehicleModel ?? '');
  const sourceId = useSettingsStore(state => state.vehicleSource);
  const { connection, deviceName, error, isSimulated } = useVehicleStore();
  const [busy, setBusy] = useState(false);

  const connected = connection === 'connected';
  const connecting = connection === 'connecting' || busy;
  const tone = STATE_TONE[connection];
  const color = toneColor(colors, tone);
  const Icon = connected ? Bluetooth : BluetoothOff;

  const toggle = async () => {
    setBusy(true);
    try {
      if (connected) await vehicleService.disconnect();
      else await vehicleService.connect(sourceId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card accentColor={color}>
      <Row justify="between" align="center">
        <Stack fill gap="xs">
          <AppText variant="title" numberOfLines={1}>
            {scooterName}
          </AppText>
          <AppText variant="caption" tone="dim" numberOfLines={1}>
            {model}
          </AppText>
        </Stack>
        <Icon size={26} color={color} />
      </Row>

      <Row align="center" gap="sm">
        <View style={[fixed.dot, { backgroundColor: color }]} />
        <AppText variant="label" tone={tone}>
          {STATE_LABEL[connection]}
        </AppText>
        {isSimulated && connection !== 'disconnected' ? (
          <Pill label="MOCK VEHICLE" tone="mock" />
        ) : null}
      </Row>

      {connected && deviceName ? (
        <AppText variant="caption" tone="dim">
          Connected to: {deviceName}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}

      <Button
        label={
          connected
            ? 'Disconnect'
            : sourceId === 'mock'
            ? 'Start mock vehicle'
            : 'Connect'
        }
        variant={connected ? 'secondary' : 'primary'}
        loading={connecting}
        onPress={toggle}
        fill
      />
    </Card>
  );
}
