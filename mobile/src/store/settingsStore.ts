import { DEFAULT_SERVICE_THRESHOLDS } from '@shared/constants';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ServiceThresholds } from '@/services/maintenance/serviceCalculations';
import type { VehicleSourceId } from '@/services/vehicle/VehicleSource';
import { persistOptions } from './storage';

export type ThemeMode = 'dark' | 'light' | 'system';

/**
 * Default API address. With a USB-connected phone or an emulator,
 * `adb reverse tcp:5000 tcp:5000` makes this reach the PC running the server.
 */
export const DEFAULT_BACKEND_URL = 'http://localhost:5000';

interface SettingsState {
  themeMode: ThemeMode;
  backendUrl: string;
  /** Hidden developer tools. Off by default. */
  developerMode: boolean;
  vehicleSource: VehicleSourceId;
  currency: string;
  serviceThresholds: ServiceThresholds;

  setThemeMode: (mode: ThemeMode) => void;
  setBackendUrl: (url: string) => void;
  setDeveloperMode: (enabled: boolean) => void;
  setServiceThresholds: (thresholds: ServiceThresholds) => void;
  setCurrency: (currency: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    set => ({
      themeMode: 'dark',
      backendUrl: DEFAULT_BACKEND_URL,
      developerMode: false,
      vehicleSource: 'mock',
      currency: 'INR',
      serviceThresholds: { ...DEFAULT_SERVICE_THRESHOLDS },

      setThemeMode: themeMode => set({ themeMode }),
      setBackendUrl: backendUrl => set({ backendUrl }),
      setDeveloperMode: developerMode => set({ developerMode }),
      setServiceThresholds: serviceThresholds => set({ serviceThresholds }),
      setCurrency: currency => set({ currency }),
    }),
    persistOptions('settings'),
  ),
);

/** Normalises and validates a backend address typed by the user. */
export function normalizeBackendUrl(
  input: string,
): { url: string; error: null } | { url: null; error: string } {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^\s/]+/i.test(trimmed)) {
    return {
      url: null,
      error:
        'Enter a full address such as https://api.example.com or http://localhost:5000',
    };
  }
  return { url: trimmed, error: null };
}
