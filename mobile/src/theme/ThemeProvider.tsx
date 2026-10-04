import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';
import { darkPalette, lightPalette, type Palette } from './tokens';

export interface Theme {
  scheme: 'dark' | 'light';
  colors: Palette;
}

const ThemeContext = createContext<Theme>({
  scheme: 'dark',
  colors: darkPalette,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSettingsStore(state => state.themeMode);
  const systemScheme = useColorScheme();
  const scheme =
    mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;

  const theme = useMemo<Theme>(
    () => ({ scheme, colors: scheme === 'dark' ? darkPalette : lightPalette }),
    [scheme],
  );
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Builds a StyleSheet from the current theme. The factory result is cached
 * per theme, so styles are not recreated on every render.
 */
// RN does not export its style-map type, so derive it from StyleSheet.create.
type StyleMap = Parameters<typeof StyleSheet.create>[0];

export function useThemedStyles<S extends StyleMap>(
  factory: (colors: Palette) => S & StyleMap,
): Readonly<S> {
  const { colors } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}
