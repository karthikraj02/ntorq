import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import { Stack } from '@/components/ui/Row';
import { useTheme } from '@/theme/ThemeProvider';

const fixed = StyleSheet.create({ empty: { justifyContent: 'center' } });

interface Props {
  data: number[];
  height?: number;
  width?: number;
  /** Top of the scale; defaults to the largest value seen (minimum 10). */
  max?: number;
  emptyLabel?: string;
}

/** Minimal line chart for live values (no axes). */
export function Sparkline({
  data,
  height = 90,
  width = 300,
  max,
  emptyLabel = 'Waiting for data',
}: Props) {
  const { colors } = useTheme();

  if (data.length < 2) {
    return (
      <Stack align="center" style={[fixed.empty, { height }]}>
        <AppText variant="caption" tone="faint">
          {emptyLabel}
        </AppText>
      </Stack>
    );
  }

  const top = max ?? Math.max(10, ...data);
  const step = width / (data.length - 1);
  const points = data
    .map((value, index) => {
      const y = height - 4 - (Math.min(value, top) / top) * (height - 8);
      return `${(index * step).toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <Polyline
        points={points}
        fill="none"
        stroke={colors.accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}
