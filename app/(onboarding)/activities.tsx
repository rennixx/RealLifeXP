import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { Screen } from '@/src/components/ui/Screen';
import { LoadingState } from '@/src/components/ui/Loading';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useOnboardingDraft } from '@/src/features/onboarding/OnboardingDraftContext';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { fetchTemplatesForCategories, type TemplateSummary } from '@/src/features/onboarding/onboarding-service';

export default function OnboardingActivitiesScreen() {
  const router = useRouter();
  const draft = useOnboardingDraft();

  const templatesQuery = useQuery({
    queryKey: ['onboarding', 'templates', draft.categoryIds],
    queryFn: () => fetchTemplatesForCategories(draft.categoryIds),
    enabled: draft.categoryIds.length > 0,
    staleTime: 60_000,
  });

  const selectedTemplateSet = useMemo(() => new Set(draft.templateIds), [draft.templateIds]);

  if (templatesQuery.isLoading) {
    return <LoadingState message="Loading starter activities…" />;
  }

  if (templatesQuery.isError) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.message}>Starter activity fetch failed. Try again later.</Text>
        </View>
      </Screen>
    );
  }

  const groupedTemplates = new Map<string, TemplateSummary[]>();
  templatesQuery.data?.forEach((template) => {
    const key = template.category_name ?? template.category_id;
    const existing = groupedTemplates.get(key);

    if (existing) {
      existing.push(template);
    } else {
      groupedTemplates.set(key, [template]);
    }
  });

  return (
    <Screen>
      <ScrollView style={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.step}>Step 3 / 4</Text>
          <Text style={styles.title}>Starter Activities</Text>
          <Text style={styles.subtitle}>Pick your first templates. You can add more later.</Text>

          {[...groupedTemplates.entries()].map(([categoryKey, templates]) => (
            <View key={categoryKey} style={styles.section}>
              <Text style={styles.sectionTitle}>{categoryKey}</Text>
              {templates.map((template) => {
                const isSelected = selectedTemplateSet.has(template.id);
                return (
                  <Pressable
                    key={template.id}
                    accessibilityRole="button"
                    onPress={() => draft.toggleTemplateId(template.id)}
                    style={[styles.row, isSelected ? styles.rowSelected : undefined]}
                  >
                    <Ionicons
                      name="flag-outline"
                      color={isSelected ? colors.accent : colors.textSecondary}
                      size={22}
                    />
                    <View style={styles.rowContent}>
                      <Text style={styles.rowTitle}>{template.name}</Text>
                      <Text style={styles.rowMeta}>
                        {template.category_name ?? categoryKey} · {template.xp_tier}
                      </Text>
                    </View>
                    <Text style={styles.xpText}>+{template.xp_value} XP</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <PrimaryButton
            label="Review and continue"
            onPress={() => {
              router.push('/(onboarding)/preview');
            }}
          />
          <PrimaryButton
            label="Skip for now"
            variant="ghost"
            onPress={() => {
              draft.setTemplateIds([]);
              router.push('/(onboarding)/preview');
            }}
            style={styles.skipButton}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  scroll: {
    flex: 1,
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    gap: spacing.md,
  },
  rowSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceContainerHigh,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  xpText: {
    ...typography.body,
    color: colors.accent,
  },
  skipButton: {
    marginTop: spacing.md,
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
