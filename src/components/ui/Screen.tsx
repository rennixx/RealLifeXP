import type { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/src/theme/tokens';

export type ScreenProps = PropsWithChildren<{
  variant?: 'scroll' | 'static';
  style?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, variant = 'scroll', style }: ScreenProps) {
  const content = (
    <SafeAreaView style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );

  if (variant === 'static') {
    return content;
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xxxl,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
});
