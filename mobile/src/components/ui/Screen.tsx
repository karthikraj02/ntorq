import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type RefreshControlProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  /** Set false for screens that manage their own scrolling (long lists). */
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

/** Standard screen body: themed background, side padding, keyboard handling. */
export function Screen({ children, scroll = true, refreshControl }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(colors => ({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, gap: spacing.md },
  }));
  const bottom = { paddingBottom: spacing.xl + insets.bottom };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, bottom]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.root, bottom]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}
