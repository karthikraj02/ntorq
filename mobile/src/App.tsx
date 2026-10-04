import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import React, { useMemo } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSyncTriggers } from '@/hooks/useSyncTriggers';
import { RootNavigator } from '@/navigation/RootNavigator';
import { initializeLocalData } from '@/services/bootstrap';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

// Stores are restored synchronously from on-device storage, so the first
// launch can create its defaults before anything renders.
initializeLocalData();

function ThemedApp() {
  const { colors, scheme } = useTheme();
  useSyncTriggers();

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, scheme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
