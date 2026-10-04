import { ChevronDown, Check } from '@/components/ui/icons';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';

export interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  label: string;
  value: T | null;
  options: Option<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  helper?: string;
}

/** A dropdown that opens a bottom sheet list (Android has no native picker in React Native). */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  helper,
}: Props<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const styles = useThemedStyles(c => ({
    wrap: { gap: spacing.xs },
    box: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
    },
    backdrop: {
      flex: 1,
      backgroundColor: '#000000AA',
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '70%',
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.xl,
    },
  }));

  const selected = options.find(option => option.value === value);

  return (
    <View style={styles.wrap}>
      <AppText variant="label" tone="dim">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        style={styles.box}
        onPress={() => setOpen(true)}
      >
        <AppText tone={selected ? 'default' : 'faint'}>
          {selected?.label ?? placeholder}
        </AppText>
        <ChevronDown size={18} color={colors.textDim} />
      </Pressable>
      {helper ? (
        <AppText variant="caption" tone="faint">
          {helper}
        </AppText>
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={open}
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <AppText
              variant="heading"
              style={{
                paddingHorizontal: spacing.xl,
                paddingBottom: spacing.sm,
              }}
            >
              {label}
            </AppText>
            <FlatList
              data={options}
              keyExtractor={item => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="menuitem"
                  style={styles.row}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <AppText tone={item.value === value ? 'accent' : 'default'}>
                    {item.label}
                  </AppText>
                  {item.value === value ? (
                    <Check size={18} color={colors.accent} />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
