import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { NOT_AVAILABLE } from '@/utils/format';

const fixed = StyleSheet.create({
  tile: { flex: 1, minHeight: 110 },
});

interface Props {
  label: string;
  /** Already formatted; pass NOT_AVAILABLE ("N/A") when the value is unknown. */
  value: string;
  unit?: string;
  icon?: ReactNode;
  footnote?: string;
  children?: ReactNode;
}

/** Large-number tile used on the dashboard. */
export function MetricTile({
  label,
  value,
  unit,
  icon,
  footnote,
  children,
}: Props) {
  const unavailable = value === NOT_AVAILABLE;
  return (
    <Card
      style={fixed.tile}
      accessibilityLabel={`${label}: ${
        unavailable ? 'not available' : `${value} ${unit ?? ''}`
      }`}
    >
      <Row align="center" gap="sm">
        {icon}
        <AppText variant="label" tone="dim">
          {label}
        </AppText>
      </Row>
      <Row align="baseline" gap="xs">
        <AppText variant="metric" tone={unavailable ? 'faint' : 'default'}>
          {value}
        </AppText>
        {!unavailable && unit ? (
          <AppText variant="caption" tone="dim">
            {unit}
          </AppText>
        ) : null}
      </Row>
      {children}
      {footnote ? (
        <AppText variant="caption" tone="faint">
          {footnote}
        </AppText>
      ) : null}
    </Card>
  );
}
