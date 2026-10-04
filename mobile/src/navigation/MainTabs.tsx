import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import {
  Activity,
  Bike,
  House,
  Route,
  SettingsIcon,
  Wrench,
  type LucideIcon,
} from '@/components/ui/icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { DiagnosticsScreen } from '@/screens/DiagnosticsScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { RideScreen } from '@/screens/RideScreen';
import { ServiceScreen } from '@/screens/ServiceScreen';
import { VehicleScreen } from '@/screens/VehicleScreen';
import { useTheme } from '@/theme/ThemeProvider';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const fixed = StyleSheet.create({
  settingsButton: { paddingHorizontal: 16 },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});

/** Builds a stable tab-bar icon component (defined once, not on every render). */
function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, size }: { color: string; size: number }) {
    return <Icon color={color} size={size} />;
  };
}

const HomeIcon = tabIcon(House);
const RideIcon = tabIcon(Route);
const ServiceIcon = tabIcon(Wrench);
const DiagnosticsIcon = tabIcon(Activity);
const VehicleIcon = tabIcon(Bike);

function SettingsButton() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={12}
      onPress={() => navigation.navigate('Settings')}
      style={fixed.settingsButton}
    >
      <SettingsIcon size={22} color={colors.text} />
    </Pressable>
  );
}

export function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerRight: SettingsButton,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: fixed.tabLabel,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Ntorq Companion',
          tabBarLabel: 'Home',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tab.Screen
        name="Ride"
        component={RideScreen}
        options={{ tabBarIcon: RideIcon }}
      />
      <Tab.Screen
        name="Service"
        component={ServiceScreen}
        options={{ tabBarIcon: ServiceIcon }}
      />
      <Tab.Screen
        name="Diagnostics"
        component={DiagnosticsScreen}
        options={{ tabBarIcon: DiagnosticsIcon }}
      />
      <Tab.Screen
        name="Vehicle"
        component={VehicleScreen}
        options={{
          title: 'My Scooter',
          tabBarLabel: 'Vehicle',
          tabBarIcon: VehicleIcon,
        }}
      />
    </Tab.Navigator>
  );
}
