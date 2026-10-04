import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { describeArc, valueToAngle } from '@/utils/arc';
import { NOT_AVAILABLE } from '@/utils/format';

const SIZE = 250;
const STROKE = 16;
const START = -135;
const SWEEP = 270;

const fixed = StyleSheet.create({
  frame: { width: SIZE, height: SIZE * 0.86, alignSelf: 'center' },
  readout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface Props {
  /** Speed in km/h, or null when the vehicle does not report it. */
  speed: number | null;
  max?: number;
}

export function SpeedGauge({ speed, max = 120 }: Props) {
  const { colors } = useTheme();
  const center = SIZE / 2;
  const radius = center - STROKE;
  const track = describeArc(center, center, radius, START, START + SWEEP);
  const hasValue = speed !== null;
  const valuePath =
    hasValue && speed > 0.5
      ? describeArc(
          center,
          center,
          radius,
          START,
          valueToAngle(speed, max, START, SWEEP),
        )
      : null;

  return (
    <View
      accessible
      accessibilityLabel={
        hasValue
          ? `Speed ${Math.round(speed)} kilometres per hour`
          : 'Speed not available'
      }
      style={fixed.frame}
    >
      <Svg width={SIZE} height={SIZE}>
        <Path
          d={track}
          stroke={colors.surfaceAlt}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        {valuePath ? (
          <Path
            d={valuePath}
            stroke={colors.accent}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
      </Svg>
      <View style={fixed.readout}>
        <AppText
          variant={hasValue ? 'display' : 'displaySm'}
          tone={hasValue ? 'default' : 'faint'}
        >
          {hasValue ? String(Math.round(speed)) : NOT_AVAILABLE}
        </AppText>
        <AppText variant="label" tone="dim">
          km/h
        </AppText>
      </View>
    </View>
  );
}
