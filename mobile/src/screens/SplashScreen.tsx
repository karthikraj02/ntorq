import { useNavigation } from '@react-navigation/native';
import { APP_NAME, APP_SUBTITLE, APP_TAGLINE } from '@shared/constants';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

const SPLASH_MS = 1600;

const fixed = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: 10 },
  bar: { width: 56, height: 6, borderRadius: 3 },
});

export function SplashScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(
      () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }),
      SPLASH_MS,
    );
    return () => clearTimeout(timer);
  }, [fade, navigation]);

  return (
    <View style={[fixed.root, { backgroundColor: colors.background }]}>
      <Animated.View style={[fixed.content, { opacity: fade }]}>
        <View style={[fixed.bar, { backgroundColor: colors.accent }]} />
        <AppText variant="brand">{APP_NAME}</AppText>
        <AppText tone="dim">{APP_SUBTITLE}</AppText>
        <AppText tone="faint">{APP_TAGLINE}</AppText>
      </Animated.View>
    </View>
  );
}
