import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import {
  radius,
  spacing,
  toneColor,
  withAlpha,
  type Tone,
} from '@/theme/tokens';
import { AppText } from './AppText';

const fixed = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: { fontSize: 11 },
});

interface Props {
  label: string;
  tone: Tone;
}

/** Small coloured status label such as "DUE SOON" or "MOCK". */
export function Pill({ label, tone }: Props) {
  const { colors } = useTheme();
  const color = toneColor(colors, tone);
  return (
    <View
      style={[
        fixed.pill,
        {
          backgroundColor: withAlpha(color, 0.16),
          borderColor: withAlpha(color, 0.5),
        },
      ]}
    >
      <AppText variant="label" tone={tone} style={fixed.text}>
        {label}
      </AppText>
    </View>
  );
}
