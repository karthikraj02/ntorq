import { valueOf } from '@/services/telemetry/readings';
import { useVehicleStore } from '@/store/vehicleStore';

/** Current vehicle values as plain numbers; null means "not available" (render N/A). */
export function useVehicleReadings() {
  const snapshot = useVehicleStore(state => state.snapshot);
  return {
    speed: valueOf(snapshot.speed),
    rpm: valueOf(snapshot.rpm),
    fuelPercent: valueOf(snapshot.fuelLevel),
    batteryVolts: valueOf(snapshot.batteryVoltage),
    engineTempC: valueOf(snapshot.engineTemperature),
    odometerKm: valueOf(snapshot.odometer),
  };
}
