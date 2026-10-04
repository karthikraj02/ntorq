import React, { useSyncExternalStore } from 'react';
import { StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader, SettingRow } from '@/components/ui/Layout';
import { Pill } from '@/components/ui/Pill';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/States';
import { PROTOCOL_STATUS } from '@/constants/app';
import { useSyncStore } from '@/store/syncStore';
import { useVehicleStore } from '@/store/vehicleStore';
import type { Tone } from '@/theme/tokens';
import {
  clearLogs,
  getLogEntries,
  getLogVersion,
  subscribeToLogs,
  type LogLevel,
} from '@/utils/logger';

const fixed = StyleSheet.create({
  levelColumn: { width: 44 },
  messageColumn: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});

const LEVEL_TONE: Record<LogLevel, Tone> = {
  DEBUG: 'faint',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'danger',
};

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function clock(time: number): string {
  const d = new Date(time);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds(),
  )}.${pad(d.getMilliseconds(), 3)}`;
}

function LogViewer() {
  useSyncExternalStore(subscribeToLogs, getLogVersion);
  const entries = [...getLogEntries()].slice(-80).reverse();
  return (
    <Card>
      <Row justify="between" align="center">
        <AppText variant="label" tone="dim">
          APP LOG ({entries.length})
        </AppText>
        <Button small variant="ghost" label="Clear" onPress={clearLogs} />
      </Row>
      {entries.length === 0 ? (
        <AppText variant="caption" tone="faint">
          Nothing logged yet.
        </AppText>
      ) : (
        entries.map(entry => (
          <Row key={entry.id} gap="sm">
            <AppText variant="caption" tone="faint" style={fixed.tabular}>
              {clock(entry.time)}
            </AppText>
            <AppText
              variant="caption"
              tone={LEVEL_TONE[entry.level]}
              style={fixed.levelColumn}
            >
              {entry.level}
            </AppText>
            <AppText variant="caption" selectable style={fixed.messageColumn}>
              {entry.tag}: {entry.message}
            </AppText>
          </Row>
        ))
      )}
    </Card>
  );
}

export function DeveloperScreen() {
  const capabilities = useVehicleStore(state => state.capabilities);
  const connection = useVehicleStore(state => state.connection);
  const queue = useSyncStore(state => state.queue);

  return (
    <Screen>
      <Card>
        <Row justify="between" align="center">
          <AppText variant="label" tone="dim">
            NTORQ PROTOCOL
          </AppText>
          <Pill label={PROTOCOL_STATUS} tone="warn" />
        </Row>
        <AppText tone="dim">
          No services, characteristics or commands are assumed. They will be
          discovered on your own scooter and recorded only after they are
          verified.
        </AppText>
      </Card>

      <Banner
        tone="info"
        message="Bluetooth scanner, service discovery, characteristic explorer, packet logger and protocol capture arrive in Phases 2 and 3."
      />

      <SectionHeader title="VEHICLE CAPABILITIES" />
      <Card>
        <SettingRow title="Connection" value={connection} />
        <SettingRow title="Telemetry" value={capabilities.telemetry} />
        <SettingRow title="Diagnostics" value={capabilities.diagnostics} />
        <SettingRow
          title="Read oil reminder"
          value={capabilities.oilReminderRead}
        />
        <SettingRow
          title="Reset oil reminder"
          value={capabilities.oilReminderReset}
        />
      </Card>

      <SectionHeader title="SYNC QUEUE" />
      <Card>
        {queue.length === 0 ? (
          <AppText variant="caption" tone="faint">
            Empty.
          </AppText>
        ) : (
          queue.map(op => (
            <AppText key={`${op.entity}/${op.id}`} variant="caption" selectable>
              {op.action.toUpperCase()} {op.entity}/{op.id.slice(0, 8)}
            </AppText>
          ))
        )}
      </Card>

      <SectionHeader title="LOGS" />
      <LogViewer />
    </Screen>
  );
}
