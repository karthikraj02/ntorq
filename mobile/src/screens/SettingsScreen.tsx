import { useNavigation } from '@react-navigation/native';
import { APP_NAME } from '@shared/constants';
import React from 'react';
import { BackendSection } from '@/components/settings/BackendSection';
import { DataSection } from '@/components/settings/DataSection';
import { ThresholdsSection } from '@/components/settings/ThresholdsSection';
import { Card } from '@/components/ui/Card';
import { SectionHeader, SettingRow } from '@/components/ui/Layout';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { APP_VERSION, PROTOCOL_STATUS } from '@/constants/app';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore, type ThemeMode } from '@/store/settingsStore';

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'Follow system' },
];

export function SettingsScreen() {
  const navigation = useNavigation();
  const themeMode = useSettingsStore(state => state.themeMode);
  const setThemeMode = useSettingsStore(state => state.setThemeMode);
  const developerMode = useSettingsStore(state => state.developerMode);
  const setDeveloperMode = useSettingsStore(state => state.setDeveloperMode);
  const user = useAuthStore(state => state.user);

  return (
    <Screen>
      <SectionHeader title="APPEARANCE" />
      <Card>
        <SelectField
          label="Theme"
          value={themeMode}
          options={THEMES}
          onChange={setThemeMode}
        />
      </Card>

      <SectionHeader title="UNITS" />
      <Card>
        <SettingRow title="Speed" value="km/h" />
        <SettingRow title="Distance" value="km" />
        <SettingRow
          title="Fuel volume"
          value="litres"
          description="Metric units only for now."
        />
      </Card>

      <SectionHeader title="VEHICLE" />
      <Card>
        <SettingRow
          title="Vehicle source"
          value="Mock vehicle"
          description="Simulated data. Bluetooth arrives in Phase 2."
        />
        <SettingRow title="Bluetooth" value="Phase 2" disabled />
        <SettingRow title="Notifications" value="Not yet available" disabled />
      </Card>

      <ThresholdsSection />
      <BackendSection />

      <SectionHeader title="ACCOUNT" />
      <Card>
        <SettingRow
          title={user ? 'Signed in' : 'Sign in or create an account'}
          description={
            user
              ? user.email
              : 'Optional. Needed only to back up and sync your data.'
          }
          onPress={() => navigation.navigate('Account')}
        />
      </Card>

      <SectionHeader title="DEVELOPER" />
      <Card>
        <SettingRow
          title="Developer mode"
          description="Shows developer tools: protocol status, capabilities and app logs."
          switchValue={developerMode}
          onSwitchChange={setDeveloperMode}
        />
        {developerMode ? (
          <SettingRow
            title="Open developer tools"
            onPress={() => navigation.navigate('Developer')}
          />
        ) : null}
      </Card>

      <DataSection />

      <SectionHeader title="ABOUT" />
      <Card>
        <SettingRow title={APP_NAME} value={`v${APP_VERSION}`} />
        <SettingRow
          title="Ntorq protocol"
          value={PROTOCOL_STATUS}
          description="Nothing about the scooter's Bluetooth protocol is assumed."
        />
      </Card>
    </Screen>
  );
}
