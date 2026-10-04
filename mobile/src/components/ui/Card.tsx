import React, { type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  /** Colours a stripe on the left edge (used for status). */
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({
  children,
  onPress,
  accentColor,
  style,
  accessibilityLabel,
}: Props) {
  const styles = useThemedStyles(colors => ({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
      overflow: 'hidden',
    },
    pressed: { backgroundColor: colors.surfaceAlt },
    stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  }));

  const body = (
    <>
      {accentColor ? (
        <View style={[styles.stripe, { backgroundColor: accentColor }]} />
      ) : null}
      {children}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={[styles.card, style]}
        accessibilityLabel={accessibilityLabel}
      >
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      {body}
    </Pressable>
  );
}
