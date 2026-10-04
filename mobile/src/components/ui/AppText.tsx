import React, { type ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import {
  toneColor,
  typography,
  type TextVariant,
  type Tone,
} from '@/theme/tokens';

interface Props {
  variant?: TextVariant;
  tone?: Tone;
  children: ReactNode;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  selectable?: boolean;
}

export function AppText({
  variant = 'body',
  tone = 'default',
  children,
  numberOfLines,
  style,
  selectable,
}: Props) {
  const { colors } = useTheme();
  const { tabular, ...type } = typography[variant];
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[
        type,
        { color: toneColor(colors, tone) },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
