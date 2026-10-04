import { Inbox, Info, TriangleAlert } from '@/components/ui/icons';
import React, { type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import {
  radius,
  spacing,
  toneColor,
  withAlpha,
  type Tone,
} from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Row, Stack } from './Row';

const fixed = StyleSheet.create({
  centered: { textAlign: 'center' },
  padded: { padding: spacing.xl },
  banner: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  bannerAction: { marginTop: spacing.xs },
});

interface EmptyProps {
  title: string;
  message: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/** Shown where a list or section has nothing in it yet. */
export function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
}: EmptyProps) {
  const { colors } = useTheme();
  return (
    <Stack align="center" gap="sm" style={fixed.padded}>
      {icon ?? <Inbox size={36} color={colors.textFaint} />}
      <AppText variant="heading">{title}</AppText>
      <AppText tone="dim" style={fixed.centered}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} />
      ) : null}
    </Stack>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Stack align="center" gap="sm" style={fixed.padded}>
      <TriangleAlert size={36} color={colors.danger} />
      <AppText variant="heading">Something went wrong</AppText>
      <AppText tone="dim" style={fixed.centered}>
        {message}
      </AppText>
      {onRetry ? (
        <Button variant="secondary" label="Try again" onPress={onRetry} />
      ) : null}
    </Stack>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <Stack align="center" gap="sm" style={fixed.padded}>
      <ActivityIndicator color={colors.accent} />
      <AppText tone="dim">{label}</AppText>
    </Stack>
  );
}

interface BannerProps {
  tone?: Extract<Tone, 'info' | 'warn' | 'danger' | 'mock' | 'ok'>;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Inline notice with a coloured edge. */
export function Banner({
  tone = 'info',
  title,
  message,
  actionLabel,
  onAction,
}: BannerProps) {
  const { colors } = useTheme();
  const color = toneColor(colors, tone);
  const Icon = tone === 'danger' || tone === 'warn' ? TriangleAlert : Info;
  return (
    <Row
      gap="md"
      accessibilityRole="alert"
      style={[
        fixed.banner,
        {
          backgroundColor: withAlpha(color, 0.12),
          borderColor: withAlpha(color, 0.45),
        },
      ]}
    >
      <Icon size={20} color={color} />
      <Stack fill gap="xs">
        {title ? (
          <AppText variant="heading" style={{ color }}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="caption">{message}</AppText>
        {actionLabel && onAction ? (
          <Row style={fixed.bannerAction}>
            <Button
              small
              variant="secondary"
              label={actionLabel}
              onPress={onAction}
            />
          </Row>
        ) : null}
      </Stack>
    </Row>
  );
}
