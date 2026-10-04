import { Battery, Fuel, Gauge, Route } from '@/components/ui/icons';
import React from 'react';
import { SpeedGauge } from '@/components/charts/SpeedGauge';
import { ConnectionCard } from '@/components/dashboard/ConnectionCard';
import { DiagnosticStatusCard } from '@/components/dashboard/DiagnosticStatusCard';
import { MetricTile } from '@/components/dashboard/MetricTile';
import { MockBanner } from '@/components/dashboard/MockBanner';
import { ServiceSummaryCard } from '@/components/dashboard/ServiceSummaryCard';
import { TripCard } from '@/components/dashboard/TripCard';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Layout';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { useVehicleReadings } from '@/hooks/useVehicleReadings';
import { useScooterStore } from '@/store/scooterStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatNumber, formatThousands, NOT_AVAILABLE } from '@/utils/format';

const LOW_FUEL_PERCENT = 15;
const ICON_SIZE = 16;

export function HomeScreen() {
  const { colors } = useTheme();
  const { speed, rpm, fuelPercent, batteryVolts } = useVehicleReadings();
  const odometerKm = useScooterStore(
    state => state.scooter?.odometerKm ?? null,
  );
  const iconColor = colors.textDim;

  return (
    <Screen>
      <MockBanner />
      <ConnectionCard />

      <Card>
        <SpeedGauge speed={speed} />
      </Card>

      <Row gap="md">
        <MetricTile
          label="RPM"
          icon={<Gauge size={ICON_SIZE} color={iconColor} />}
          value={
            rpm === null
              ? NOT_AVAILABLE
              : formatThousands(Math.round(rpm / 10) * 10)
          }
        />
        <MetricTile
          label="FUEL"
          icon={<Fuel size={ICON_SIZE} color={iconColor} />}
          value={
            fuelPercent === null ? NOT_AVAILABLE : formatNumber(fuelPercent)
          }
          unit="%"
        >
          {fuelPercent !== null ? (
            <ProgressBar
              value={fuelPercent / 100}
              color={
                fuelPercent < LOW_FUEL_PERCENT ? colors.danger : colors.accent
              }
            />
          ) : null}
        </MetricTile>
      </Row>

      <Row gap="md">
        <MetricTile
          label="BATTERY"
          icon={<Battery size={ICON_SIZE} color={iconColor} />}
          value={
            batteryVolts === null
              ? NOT_AVAILABLE
              : formatNumber(batteryVolts, 1)
          }
          unit="V"
        />
        <MetricTile
          label="ODOMETER"
          icon={<Route size={ICON_SIZE} color={iconColor} />}
          value={
            odometerKm === null ? NOT_AVAILABLE : formatThousands(odometerKm)
          }
          unit="km"
          footnote="Entered by you"
        />
      </Row>

      <TripCard />
      <ServiceSummaryCard />
      <DiagnosticStatusCard />
    </Screen>
  );
}
