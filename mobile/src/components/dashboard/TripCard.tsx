import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Row, Stack } from '@/components/ui/Row';
import { useTripStore } from '@/store/tripStore';
import { useVehicleStore } from '@/store/vehicleStore';
import {
  formatDuration,
  formatNumber,
  formatWithUnit,
  NOT_AVAILABLE,
} from '@/utils/format';

export function TripStat({ label, value }: { label: string; value: string }) {
  return (
    <Stack fill gap="xs">
      <AppText variant="label" tone="dim">
        {label}
      </AppText>
      <AppText
        variant="metricSm"
        tone={value === NOT_AVAILABLE ? 'faint' : 'default'}
      >
        {value}
      </AppText>
    </Stack>
  );
}

/** Distance, average speed and riding time of the ride being recorded. */
export function TripCard() {
  const navigation = useNavigation();
  const { status, summary } = useTripStore();
  const isSimulated = useVehicleStore(state => state.isSimulated);
  const active = status !== 'idle';

  return (
    <Card>
      <Row justify="between" align="center">
        <AppText variant="label" tone="dim">
          TRIP
        </AppText>
        <Row gap="sm">
          {active && isSimulated ? <Pill label="MOCK" tone="mock" /> : null}
          {active ? (
            <Pill
              label={status === 'paused' ? 'PAUSED' : 'RECORDING'}
              tone={status === 'paused' ? 'warn' : 'ok'}
            />
          ) : null}
        </Row>
      </Row>
      <Row gap="md">
        <TripStat
          label="Distance"
          value={
            active ? formatWithUnit(summary.distanceKm, 'km', 1) : NOT_AVAILABLE
          }
        />
        <TripStat
          label="Average"
          value={
            active && summary.averageSpeedKmh !== null
              ? `${formatNumber(summary.averageSpeedKmh)} km/h`
              : NOT_AVAILABLE
          }
        />
        <TripStat
          label="Riding time"
          value={active ? formatDuration(summary.ridingTimeSec) : NOT_AVAILABLE}
        />
      </Row>
      {!active ? (
        <Button
          small
          variant="secondary"
          label="Start a ride"
          onPress={() => navigation.navigate('Main', { screen: 'Ride' })}
        />
      ) : null}
    </Card>
  );
}
