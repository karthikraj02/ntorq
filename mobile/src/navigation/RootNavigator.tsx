import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AccountScreen } from '@/screens/AccountScreen';
import { DeveloperScreen } from '@/screens/DeveloperScreen';
import { MaintenanceEditScreen } from '@/screens/MaintenanceEditScreen';
import { MaintenanceListScreen } from '@/screens/MaintenanceListScreen';
import { OilChangeScreen } from '@/screens/OilChangeScreen';
import { ServiceEditScreen } from '@/screens/ServiceEditScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { SplashScreen } from '@/screens/SplashScreen';
import { useTheme } from '@/theme/ThemeProvider';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Developer" component={DeveloperScreen} />
      <Stack.Screen
        name="OilChange"
        component={OilChangeScreen}
        options={{ title: 'Oil Change' }}
      />
      <Stack.Screen
        name="ServiceEdit"
        component={ServiceEditScreen}
        options={{ title: 'Edit Service Item' }}
      />
      <Stack.Screen
        name="MaintenanceList"
        component={MaintenanceListScreen}
        options={{ title: 'Maintenance History' }}
      />
      <Stack.Screen
        name="MaintenanceEdit"
        component={MaintenanceEditScreen}
        options={{ title: 'Service Record' }}
      />
    </Stack.Navigator>
  );
}
