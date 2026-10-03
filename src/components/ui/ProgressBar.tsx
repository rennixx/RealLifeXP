import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, spacing, typography } from '@/src/theme/tokens';

type ProgressBarProps = {
  value: number;
  style?: ViewStyle;
  showLabel?: boolean;
  label?: string;
};

export function ProgressBar({ value, style, showLabel = false, label }: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(value, 100));
  return (
    <View style={[styles.container, style]}>
      <View style={styles.track}>
        <View style={styles.glow} />
        <View style={[styles.fill, { width: `${normalized}%` }]} />
      </View>
      {showLabel ? <Text style={styles.label}>{label ?? `${Math.round(normalized)}%`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  track: {
    height: 10,
    borderRadius: 0,
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: colors.accentGlow,
    opacity: 0.15,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 0,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
