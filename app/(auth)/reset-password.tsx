import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { updatePassword } from '@/src/features/auth/auth-service';
import { FormField } from '@/src/components/ui/FormField';
import { Screen } from '@/src/components/ui/Screen';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { colors, spacing, typography } from '@/src/theme/tokens';

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .superRefine((input, context) => {
    if (input.password !== input.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Passwords do not match.',
        path: ['confirmPassword'],
      });
    }
  });

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const { control, handleSubmit } = useForm<ResetPasswordForm>({
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ password }: ResetPasswordForm) => {
    const parsed = schema.safeParse({
      password,
      confirmPassword: (control._formValues.confirmPassword as string) ?? '',
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid input.';
      setErrorMessage(message);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    const result = await updatePassword(password);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setMessage('Password updated successfully.');
    router.replace('/(auth)/sign-in');
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Set new password</Text>
        <Text style={styles.subtitle}>Choose a new password to replace your current one.</Text>

        {message ? <Text style={styles.successText}>{message}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <FormField
              label="NEW PASSWORD"
              value={value}
              onChangeText={onChange}
              placeholder="At least 8 characters"
              secureTextEntry
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <FormField
              label="CONFIRM PASSWORD"
              value={value}
              onChangeText={onChange}
              placeholder="Repeat new password"
              secureTextEntry
            />
          )}
        />

        <PrimaryButton
          label={isSubmitting ? 'Saving…' : 'Save password'}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 420,
    width: '100%',
    marginHorizontal: 'auto',
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  successText: {
    color: colors.success,
    marginBottom: spacing.md,
    ...typography.body,
  },
  errorText: {
    color: colors.danger,
    marginBottom: spacing.md,
    ...typography.body,
  },
});
