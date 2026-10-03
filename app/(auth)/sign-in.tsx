import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { signInWithPassword } from '@/src/features/auth/auth-service';
import { FormField } from '@/src/components/ui/FormField';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { Screen } from '@/src/components/ui/Screen';

type SignInForm = {
  email: string;
  password: string;
};

const schema = z.object({
  email: z.string().email('Please enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export default function SignInScreen() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<SignInForm>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: SignInForm) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid input.';
      setErrorMessage(message);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(undefined);
    const result = await signInWithPassword(values);
    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    router.replace('/');
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Welcome back to your RealLife XP journey.</Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

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

        <PrimaryButton label={isSubmitting ? 'Signing in…' : 'Sign In'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />

        <View style={styles.links}>
          <Link href="/(auth)/forgot-password" style={styles.link}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </Link>
          <Link href="/(auth)/sign-up" style={styles.link}>
            <Text style={styles.linkText}>Create account</Text>
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
    gap: spacing.md,
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
});
