import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const fixed = StyleSheet.create({
  smallText: { fontSize: 14 },
  pressed: { opacity: 0.8 },
});

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  /** Stretch to the full width of the parent. */
  fill?: boolean;
  small?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fill = false,
  small = false,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(c => ({
    base: {
      minHeight: small ? 38 : 48,
      paddingHorizontal: small ? spacing.md : spacing.lg,
      borderRadius: radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    primary: { backgroundColor: c.accent },
    secondary: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
    },
    danger: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.danger,
    },
    ghost: { backgroundColor: 'transparent' },
    fill: { alignSelf: 'stretch' },
    disabled: { opacity: 0.45 },
  }));

  const inactive = disabled || loading;
  const textTone =
    variant === 'primary'
      ? 'onAccent'
      : variant === 'danger'
      ? 'danger'
      : variant === 'ghost'
      ? 'accent'
      : 'default';
  const spinner = variant === 'primary' ? colors.onAccent : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fill && styles.fill,
        inactive && styles.disabled,
        pressed && fixed.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinner} />
      ) : (
        <View>{icon}</View>
      )}
      <AppText
        variant="heading"
        tone={textTone}
        style={small ? fixed.smallText : undefined}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
