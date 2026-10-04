import { ChevronRight } from '@/components/ui/icons';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Row } from './Row';

const fixed = StyleSheet.create({
  header: { marginTop: spacing.sm },
  rowValue: { maxWidth: '40%' },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Row justify="between" align="center" style={fixed.header}>
      <AppText variant="label" tone="dim">
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <AppText variant="caption" tone="accent">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </Row>
  );
}

interface RowProps {
  title: string;
  description?: string;
  /** Text shown on the right, e.g. the current value. */
  value?: string;
  onPress?: () => void;
  /** Renders a switch on the right instead of a chevron. */
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  right?: ReactNode;
  disabled?: boolean;
}

/** One line of a settings list. */
export function SettingRow({
  title,
  description,
  value,
  onPress,
  switchValue,
  onSwitchChange,
  right,
  disabled,
}: RowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(c => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    disabled: { opacity: 0.5 },
    text: { flex: 1, gap: 2 },
  }));
  const isSwitch = switchValue !== undefined && onSwitchChange !== undefined;
  const rowStyle = [styles.row, disabled && styles.disabled];

  const content = (
    <>
      <View style={styles.text}>
        <AppText>{title}</AppText>
        {description ? (
          <AppText variant="caption" tone="dim">
            {description}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText tone="dim" numberOfLines={1} style={fixed.rowValue}>
          {value}
        </AppText>
      ) : null}
      {right}
      {isSwitch ? (
        <Switch
          accessibilityLabel={title}
          value={switchValue}
          onValueChange={onSwitchChange}
          disabled={disabled}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.surface}
        />
      ) : onPress ? (
        <ChevronRight size={18} color={colors.textFaint} />
      ) : null}
    </>
  );

  if (onPress && !isSwitch) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        disabled={disabled}
        onPress={onPress}
        style={rowStyle}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={rowStyle}>{content}</View>;
}

export function ProgressBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  const { colors } = useTheme();
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <View
      accessibilityRole="progressbar"
      style={[fixed.track, { backgroundColor: colors.surfaceAlt }]}
    >
      <View
        style={[
          fixed.fill,
          { width: `${clamped * 100}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}
