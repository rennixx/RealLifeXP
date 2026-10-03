import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { requestPasswordReset } from '@/src/features/auth/auth-service';
import { FormField } from '@/src/components/ui/FormField';
import { Screen } from '@/src/components/ui/Screen';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { colors, spacing, typography } from '@/src/theme/tokens';

type ForgotPasswordForm = {
  email: string;
};

const schema = z.object({
  email: z.string().email('Please enter a valid email.'),
});

export default function ForgotPasswordScreen() {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset } = useForm<ForgotPasswordForm>({
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordForm) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid input.';
      setErrorMessage(message);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    const result = await requestPasswordReset(values.email);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setSuccessMessage('Password reset email sent. Check your inbox.');
    reset();
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>We will send a secure reset link to your email.</Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <FormField
              label="EMAIL"
              value={value}
              onChangeText={onChange}
              placeholder="you@domain.com"
              autoCapitalize="none"
            />
          )}
        />

        <PrimaryButton
          label={isSubmitting ? 'Sending…' : 'Send reset email'}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />

        <Link href="/(auth)/sign-in" style={styles.link}>
          <Text style={styles.linkText}>Back to sign in</Text>
        </Link>
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
  link: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
  },
  linkText: {
    color: colors.textSecondary,
    ...typography.body,
  },
  errorText: {
    color: colors.danger,
    marginBottom: spacing.md,
    ...typography.body,
  },
  successText: {
    color: colors.success,
    marginBottom: spacing.md,
    ...typography.body,
  },
});
