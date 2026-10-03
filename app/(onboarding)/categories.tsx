import { ComponentProps, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { colors, spacing, typography } from '@/src/theme/tokens';
import { fetchActiveCategories } from '@/src/features/onboarding/onboarding-service';
import { Screen } from '@/src/components/ui/Screen';
import { LoadingState } from '@/src/components/ui/Loading';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useOnboardingDraft } from '@/src/features/onboarding/OnboardingDraftContext';

const MIN_CATEGORIES = 3;
const MAX_CATEGORIES = 6;
type IconName = ComponentProps<typeof Ionicons>['name'];

export default function OnboardingCategoriesScreen() {
  const router = useRouter();
  const draft = useOnboardingDraft();

  const categoriesQuery = useQuery({
    queryKey: ['onboarding', 'categories'],
    queryFn: fetchActiveCategories,
    staleTime: 60_000,
  });

  const selectedCount = draft.categoryIds.length;
  const canContinue = selectedCount >= MIN_CATEGORIES;

  const iconByKey = useMemo<Record<string, IconName>>(
    () => ({
      development: 'code-outline',
      knowledge: 'library-outline',
      fitness: 'fitness-outline',
      creativity: 'color-palette-outline',
      social: 'people-outline',
      exploration: 'map-outline',
      'life-management': 'briefcase-outline',
      finance: 'wallet-outline',
    }),
    []
  );

  if (categoriesQuery.isLoading) {
    return <LoadingState message="Loading categories…" />;
  }

  if (categoriesQuery.isError) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.message}>Unable to load categories. Retry when connected.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.step}>Step 2 / 4</Text>
        <Text style={styles.title}>Initialize Domains</Text>
        <Text style={styles.subtitle}>Select {MIN_CATEGORIES} to {MAX_CATEGORIES} core domains.</Text>

        <View style={styles.countBanner}>
          <Text style={styles.countLabel}>ACTIVE DOMAINS</Text>
          <Text style={styles.countValue}>
            {selectedCount} / {MAX_CATEGORIES}
          </Text>
        </View>

        <View style={styles.grid}>
          {categoriesQuery.data?.map((category) => {
            const isSelected = draft.categoryIds.includes(category.id);
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={`${category.name} domain`}
                style={[
                  styles.card,
                  isSelected ? styles.cardSelected : undefined,
                ]}
                onPress={() => {
                  if (!isSelected && draft.categoryIds.length >= MAX_CATEGORIES) {
                    Alert.alert('Maximum reached', `Choose up to ${MAX_CATEGORIES} domains.`);
                    return;
                  }

                  draft.toggleCategoryId(category.id);
                }}
              >
                <Ionicons
                  name={iconByKey[category.slug] ?? 'apps-outline'}
                  size={26}
                  color={isSelected ? colors.accent : colors.textSecondary}
                />
                <Text style={styles.cardTitle}>{category.name}</Text>
                <Text style={styles.cardDescription}>{category.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          label={canContinue ? 'Choose starter activities' : `Select at least ${MIN_CATEGORIES}`}
          onPress={() => {
            if (!canContinue) {
              Alert.alert(
                'Not enough domains',
                `Please select at least ${MIN_CATEGORIES} domains to continue.`
              );
              return;
            }

            router.push('/(onboarding)/activities');
          }}
          disabled={!canContinue}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
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
    marginBottom: spacing.md,
  },
  countBanner: {
    borderColor: colors.outlineVariant,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: 0,
    backgroundColor: colors.surfaceContainer,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  countValue: {
    ...typography.title,
    color: colors.accent,
  },
  grid: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainer,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceContainerHigh,
  },
  cardTitle: {
    ...typography.body,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
