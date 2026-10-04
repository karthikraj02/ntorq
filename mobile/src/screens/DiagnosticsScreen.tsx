import React from 'react';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/Layout';
import { Pill } from '@/components/ui/Pill';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Banner, EmptyState } from '@/components/ui/States';
import { useVehicleStore } from '@/store/vehicleStore';

function StatusRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <Row justify="between" align="center">
      <AppText tone="dim">{label}</AppText>
      <Pill label={value} tone={ok ? 'ok' : 'faint'} />
    </Row>
  );
}

/**
 * Diagnostics framework. Until a protocol is verified there is nothing to
 * show, and this screen says so rather than inventing fault codes.
 */
export function DiagnosticsScreen() {
  const { connection, capabilities, deviceName } = useVehicleStore();

  return (
    <Screen>
      <Card>
        <StatusRow
          label="Connection"
          value={
            connection === 'connected'
              ? deviceName ?? 'CONNECTED'
              : connection.toUpperCase()
          }
          ok={connection === 'connected'}
        />
        <StatusRow
          label="Diagnostic services"
          value={
            capabilities.diagnostics === 'verified'
              ? 'AVAILABLE'
              : 'NONE AVAILABLE'
          }
          ok={capabilities.diagnostics === 'verified'}
        />
      </Card>

      <SectionHeader title="ERROR CODES" />
      <Card>
        <EmptyState
          title="No diagnostic data available"
          message="The scooter's diagnostic protocol is unknown, so the app does not read or guess fault codes."
        />
      </Card>

      <Banner
        tone="info"
        message="Manual code entry, raw diagnostic packets and diagnostic history are planned for Phase 5, after the protocol has been verified."
      />
    </Screen>
  );
}
