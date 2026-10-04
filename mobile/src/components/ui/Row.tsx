import React, { type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { spacing } from '@/theme/tokens';

type Gap = keyof typeof spacing;

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  wrap: { flexWrap: 'wrap' },
  fill: { flex: 1 },
  justifyBetween: { justifyContent: 'space-between' },
  justifyCenter: { justifyContent: 'center' },
  justifyEnd: { justifyContent: 'flex-end' },
  alignCenter: { alignItems: 'center' },
  alignStart: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  alignBaseline: { alignItems: 'baseline' },
});

const gaps = StyleSheet.create({
  xs: { gap: spacing.xs },
  sm: { gap: spacing.sm },
  md: { gap: spacing.md },
  lg: { gap: spacing.lg },
  xl: { gap: spacing.xl },
  xxl: { gap: spacing.xxl },
});

interface Props
  extends Pick<
    ViewProps,
    'accessibilityRole' | 'accessibilityLabel' | 'accessible'
  > {
  children?: ReactNode;
  justify?: 'between' | 'center' | 'end';
  align?: 'center' | 'start' | 'end' | 'baseline';
  gap?: Gap;
  /** Takes the remaining space in its parent (flex: 1). */
  fill?: boolean;
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}

function layout(
  { justify, align, gap, fill, wrap }: Props,
  horizontal: boolean,
) {
  return [
    horizontal && styles.row,
    wrap && styles.wrap,
    fill && styles.fill,
    justify === 'between' && styles.justifyBetween,
    justify === 'center' && styles.justifyCenter,
    justify === 'end' && styles.justifyEnd,
    align === 'center' && styles.alignCenter,
    align === 'start' && styles.alignStart,
    align === 'end' && styles.alignEnd,
    align === 'baseline' && styles.alignBaseline,
    gap && gaps[gap],
  ];
}

/** Horizontal layout (flexDirection: row) built from named options instead of inline styles. */
export function Row({ children, style, ...rest }: Props) {
  return (
    <View
      accessibilityRole={rest.accessibilityRole}
      accessibilityLabel={rest.accessibilityLabel}
      accessible={rest.accessible}
      style={[layout(rest, true), style]}
    >
      {children}
    </View>
  );
}

/** Vertical layout with optional gap. */
export function Stack({ children, style, ...rest }: Props) {
  return (
    <View
      accessibilityRole={rest.accessibilityRole}
      accessibilityLabel={rest.accessibilityLabel}
      accessible={rest.accessible}
      style={[layout(rest, false), style]}
    >
      {children}
    </View>
  );
}
