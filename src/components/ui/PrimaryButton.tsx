import type { TextStyle } from 'react-native';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/tokens';

type ButtonVariant = 'primary' | 'ghost';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  labelStyle?: TextStyle;
};

const buttonVariantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderRadius: 0,
  },
};

const buttonVariantLabelStyles: Record<ButtonVariant, TextStyle> = {
  primary: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  ghost: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  style,
  labelStyle,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.base, buttonVariantStyles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      >
      <Text
        style={[
          styles.label,
          styles.buttonLabel,
          buttonVariantLabelStyles[variant],
          labelStyle,
          disabled && styles.labelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    marginHorizontal: 0,
    marginVertical: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  buttonLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
  },
  disabled: {
    opacity: 0.5,
  },
  labelDisabled: {
    opacity: 0.7,
  },
});
