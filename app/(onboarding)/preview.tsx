import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';

import { completeOnboarding, fetchActiveCategories } from '@/src/features/onboarding/onboarding-service';
import { signOutCurrentUser } from '@/src/features/auth/auth-service';
import { useOnboardingDraft } from '@/src/features/onboarding/OnboardingDraftContext';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { Screen } from '@/src/components/ui/Screen';
import { colors, spacing, typography } from '@/src/theme/tokens';

export default function OnboardingPreviewScreen() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const draft = useOnboardingDraft();

  const categoryQuery = useQuery({
    queryKey: ['onboarding', 'categories'],
    queryFn: fetchActiveCategories,
    staleTime: 60_000,
    enabled: draft.categoryIds.length > 0,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!draft.identity) {
        throw new Error('Identity is missing.');
      }
      return completeOnboarding({
        displayName: draft.identity.displayName.trim(),
        handle: draft.identity.handle.trim(),
        emblemKey: draft.identity.emblemKey,
        categoryIds: draft.categoryIds,
        templateIds: draft.templateIds,
      });
    },
    onSuccess: () => {
      setMessage('Character created.');
      draft.clearDraft();
      router.replace('/(tabs)');
    },
    onError: (error) => {
      setMessage((error as Error).message ?? 'Could not finish onboarding.');
    },
  });

  const hasInvalidSessionError = Boolean(
    message?.includes('session is no longer valid')
    || message?.includes('Missing authenticated user for onboarding'),
  );

  const handleSignOutAndRestart = async () => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    try {
      draft.clearDraft();
      await signOutCurrentUser();
      router.replace('/(auth)/sign-in');
    } finally {
      setIsSigningOut(false);
    }
  };

  const selectedCategoryNames = draft.categoryIds
    .map((id) => categoryQuery.data?.find((category) => category.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  if (!draft.identity) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.message}>Missing identity data. Return to Step 1.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.step}>Step 4 / 4</Text>
          <Text style={styles.title}>Character Preview</Text>
          <Text style={styles.subtitle}>Review and begin your journey.</Text>

          <View style={styles.card}>
            <Ionicons name="sparkles-outline" size={34} color={colors.textPrimary} />
            <View style={styles.cardContent}>
              <Text style={styles.cardName}>{draft.identity.displayName}</Text>
              <Text style={styles.cardHandle}>@{draft.identity.handle}</Text>
              <Text style={styles.cardLevel}>The Initiate • Level 1</Text>
            </View>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Selected domains</Text>
            <Text style={styles.summaryText}>{selectedCategoryNames.join(', ') || 'No domain selected'}</Text>
            <Text style={styles.summaryTitle}>Starter templates</Text>
            <Text style={styles.summaryText}>
              {draft.templateIds.length ? `${draft.templateIds.length} templates selected` : 'Optional templates skipped'}
            </Text>
          </View>

          <Text style={styles.note}>
            Onboarding does not award gameplay XP. You will gain your first XP on your first completed activity.
          </Text>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <PrimaryButton
            label={mutation.isPending ? 'Creating character…' : 'Begin Your Journey'}
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
          />
          {hasInvalidSessionError ? (
            <PrimaryButton
              label={isSigningOut ? 'Signing out…' : 'Sign out and return to sign in'}
              onPress={handleSignOutAndRestart}
              disabled={isSigningOut}
              variant="ghost"
              style={styles.secondaryAction}
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  step: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  cardHandle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardLevel: {
    ...typography.caption,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  summary: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainer,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  note: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  message: {
    ...typography.body,
    color: colors.success,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  secondaryAction: {
    marginTop: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
