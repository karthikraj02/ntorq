import React from 'react';
import { Banner } from '@/components/ui/States';
import { useSettingsStore } from '@/store/settingsStore';

/** Always visible while the simulator is the vehicle source, so fake data is never mistaken for real. */
export function MockBanner() {
  const source = useSettingsStore(state => state.vehicleSource);
  if (source !== 'mock') return null;
  return (
    <Banner
      tone="mock"
      title="MOCK VEHICLE"
      message="Speed, RPM, fuel and battery are simulated. Nothing on this screen comes from your scooter."
    />
  );
}
