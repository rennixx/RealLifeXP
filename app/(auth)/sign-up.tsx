import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { signUpWithPassword } from '@/src/features/auth/auth-service';
import { FormField } from '@/src/components/ui/FormField';
import { Screen } from '@/src/components/ui/Screen';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { colors, spacing, typography } from '@/src/theme/tokens';

type SignUpForm = {
  email: string;
  password: string;
  confirmPassword: string;
};

const schema = z
  .object({
    email: z.string().email('Please enter a valid email.'),
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

export default function SignUpScreen() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailVerifyHint, setShowEmailVerifyHint] = useState(false);

  const { control, handleSubmit } = useForm<SignUpForm>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SignUpForm) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid input.';
      setErrorMessage(message);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    const result = await signUpWithPassword(values);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setShowEmailVerifyHint(true);
    router.replace('/(auth)/sign-in');
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Start building your profile in less than two minutes.</Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {showEmailVerifyHint ? (
          <Text style={styles.noticeText}>Check your email for verification when required.</Text>
        ) : null}

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

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <FormField
              label="PASSWORD"
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
              placeholder="Repeat password"
              secureTextEntry
            />
          )}
        />

        <PrimaryButton
          label={isSubmitting ? 'Creating account…' : 'Create account'}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        />

        <View style={styles.links}>
          <Link href="/(auth)/sign-in" style={styles.link}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Link>
        </View>
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
  links: {
    marginTop: spacing.lg,
  },
  link: {
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
  noticeText: {
    color: colors.success,
    marginBottom: spacing.md,
    ...typography.body,
  },
});
