import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useThemedStyles } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';

const fixed = StyleSheet.create({ text: { fontSize: 14 } });

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: Props<T>) {
  const styles = useThemedStyles(colors => ({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md - 3,
      alignItems: 'center',
    },
    active: { backgroundColor: colors.accent },
  }));
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.active]}
          >
            <AppText
              variant="heading"
              tone={selected ? 'onAccent' : 'dim'}
              style={fixed.text}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
