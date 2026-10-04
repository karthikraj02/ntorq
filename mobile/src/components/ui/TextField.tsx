import React from 'react';
import { TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helper?: string;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Short unit shown inside the field, e.g. "km". */
  suffix?: string;
  editable?: boolean;
  maxLength?: number;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  keyboardType,
  multiline,
  secureTextEntry,
  autoCapitalize = 'sentences',
  suffix,
  editable = true,
  maxLength,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(c => ({
    wrap: { gap: spacing.xs },
    box: {
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
    },
    error: { borderColor: c.danger },
    input: {
      flex: 1,
      minHeight: multiline ? 88 : 46,
      color: c.text,
      fontSize: 16,
      paddingVertical: spacing.sm,
      textAlignVertical: multiline ? 'top' : 'center',
    },
  }));

  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="dim">
        {label}
      </AppText>
      <View style={[styles.box, error ? styles.error : null]}>
        <TextInput
          accessibilityLabel={label}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
          maxLength={maxLength}
        />
        {suffix ? (
          <AppText variant="body" tone="dim">
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="faint">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}
