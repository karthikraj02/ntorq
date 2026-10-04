import type { RideDTO } from '@shared/types';
import { Pause, Play, Square } from '@/components/ui/icons';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Sparkline } from '@/components/charts/Sparkline';
import { TripStat } from '@/components/dashboard/TripCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/Layout';
import { Pill } from '@/components/ui/Pill';
import { Row, Stack } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Banner, EmptyState } from '@/components/ui/States';
import { recorder, startRide } from '@/services/telemetry/rideService';
import { useRideStore } from '@/store/rideStore';
import { useTripStore } from '@/store/tripStore';
import { useVehicleStore } from '@/store/vehicleStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDateTime } from '@/utils/dates';
import {
  formatDuration,
  formatNumber,
  formatWithUnit,
  NOT_AVAILABLE,
} from '@/utils/format';

const kmh = (value: number | null) =>
  value === null ? NOT_AVAILABLE : `${formatNumber(value)} km/h`;

function RideSummaryRow({
  ride,
  onDelete,
}: {
  ride: RideDTO;
  onDelete: () => void;
}) {
  return (
    <Card>
      <Row justify="between" align="center">
        <AppText variant="heading">{formatDateTime(ride.startedAt)}</AppText>
        {ride.source === 'mock' ? <Pill label="MOCK" tone="mock" /> : null}
      </Row>
      <Row gap="md">
        <TripStat
          label="Distance"
          value={formatWithUnit(ride.distanceKm, 'km', 1)}
        />
        <TripStat label="Time" value={formatDuration(ride.ridingTimeSec)} />
      </Row>
      <Row gap="md">
        <TripStat label="Average" value={kmh(ride.averageSpeedKmh)} />
        <TripStat label="Max" value={kmh(ride.maxSpeedKmh)} />
      </Row>
      <Row>
        <Button small variant="ghost" label="Delete" onPress={onDelete} />
      </Row>
    </Card>
  );
}

export function RideScreen() {
  const { colors } = useTheme();
  const { status, summary, speedHistory, pauseReason } = useTripStore();
  const connection = useVehicleStore(state => state.connection);
  const rides = useRideStore(state => state.rides);
  const removeRide = useRideStore(state => state.removeRide);
  const clearMockRides = useRideStore(state => state.clearMockRides);
  const [message, setMessage] = useState<string | null>(null);

  const active = status !== 'idle';
  const paused = status === 'paused';
  const hasMock = rides.some(ride => ride.source === 'mock');

  const onStart = () => {
    const result = startRide();
    setMessage(result.ok ? null : result.message);
  };

  const onEnd = () => {
    Alert.alert('End this ride?', 'The ride will be saved to your history.', [
      { text: 'Keep riding', style: 'cancel' },
      { text: 'End ride', onPress: () => recorder.end() },
    ]);
  };

  const confirmDelete = (ride: RideDTO) =>
    Alert.alert('Delete ride?', formatDateTime(ride.startedAt), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeRide(ride.id),
      },
    ]);

  return (
    <Screen>
      {active ? (
        <Card accentColor={paused ? colors.warn : colors.accent}>
          <Row justify="between" align="center">
            <AppText variant="label" tone="dim">
              CURRENT RIDE
            </AppText>
            <Pill
              label={paused ? 'PAUSED' : 'RECORDING'}
              tone={paused ? 'warn' : 'ok'}
            />
          </Row>
          <Row align="baseline" gap="sm">
            <AppText variant="displaySm">
              {formatNumber(summary.distanceKm, 2)}
            </AppText>
            <AppText variant="heading" tone="dim">
              km
            </AppText>
          </Row>
          <Row gap="md">
            <TripStat
              label="Riding time"
              value={formatDuration(summary.ridingTimeSec)}
            />
            <TripStat label="Average" value={kmh(summary.averageSpeedKmh)} />
            <TripStat label="Max" value={kmh(summary.maxSpeedKmh)} />
          </Row>
          <Sparkline data={speedHistory} max={120} />
          {pauseReason ? <Banner tone="warn" message={pauseReason} /> : null}
          <Row gap="md">
            <Stack fill>
              {paused ? (
                <Button
                  fill
                  label="Resume"
                  icon={<Play size={18} color={colors.onAccent} />}
                  disabled={connection !== 'connected'}
                  onPress={() => recorder.resume()}
                />
              ) : (
                <Button
                  fill
                  variant="secondary"
                  label="Pause"
                  icon={<Pause size={18} color={colors.text} />}
                  onPress={() => recorder.pause()}
                />
              )}
            </Stack>
            <Stack fill>
              <Button
                fill
                variant="danger"
                label="End ride"
                icon={<Square size={16} color={colors.danger} />}
                onPress={onEnd}
              />
            </Stack>
          </Row>
        </Card>
      ) : (
        <Card>
          <AppText variant="heading">Ready to ride?</AppText>
          <AppText tone="dim">
            Rides are measured from your scooter's speed. Connect first, then
            start a ride.
          </AppText>
          {message ? <Banner tone="warn" message={message} /> : null}
          <Button
            label="Start ride"
            icon={<Play size={18} color={colors.onAccent} />}
            onPress={onStart}
            fill
          />
        </Card>
      )}

      <SectionHeader
        title="RIDE HISTORY"
        actionLabel={hasMock ? 'Clear mock rides' : undefined}
        onAction={hasMock ? clearMockRides : undefined}
      />
      {rides.length === 0 ? (
        <EmptyState
          title="No rides yet"
          message="Finished rides appear here. Charts will come once real telemetry is verified."
        />
      ) : (
        rides.map(ride => (
          <RideSummaryRow
            key={ride.id}
            ride={ride}
            onDelete={() => confirmDelete(ride)}
          />
        ))
      )}
    </Screen>
  );
}
