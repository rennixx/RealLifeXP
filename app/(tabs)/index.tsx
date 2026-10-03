import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { Card } from '@/src/components/ui/Card';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { Screen } from '@/src/components/ui/Screen';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { useAuth } from '@/src/features/auth/AuthProvider';
import {
  fetchDashboardSummary,
  type DashboardCategory,
  type DashboardSummary,
} from '@/src/features/dashboard/dashboard-service';

import type { ComponentProps } from 'react';

const emblemIcons: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  'atlas-default': 'star',
  raven: 'shield-checkmark',
  flare: 'flash',
  prism: 'sparkles',
  cipher: 'lock-closed',
};

const categoryColorByToken: Record<string, string> = {
  cobalt: '#4f9cff',
  amber: '#ffd166',
  emerald: '#49d9a1',
  fuchsia: '#e06fff',
  violet: '#8e84ff',
  teal: '#5df0e4',
  gold: '#f4be4f',
};

function mapCategoryColor(token: string): string {
  return categoryColorByToken[token] ?? colors.accent;
}

function resolveEmblemIcon(emblemKey: string): ComponentProps<typeof Ionicons>['name'] {
  return emblemIcons[emblemKey] ?? 'planet';
}

function formatDateLabel(isoDate: string): string {
  if (!isoDate) {
    return 'Unknown';
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function DashboardHeader({ character }: { character: DashboardSummary['character'] }) {
  return (
    <Card style={styles.heroCard}>
      <View style={styles.heroTop}>
        <Ionicons size={30} color={colors.accent} name={resolveEmblemIcon(character.emblemKey)} />
        <View>
          <Text style={styles.heroTitle}>Home</Text>
          <Text style={styles.heroName}>{character.displayName}</Text>
          <Text style={styles.heroHandle}>@{character.handle}</Text>
        </View>
      </View>
      <View style={styles.heroLevelRow}>
        <Text style={styles.heroLevel}>Level {character.level}</Text>
        <Text style={styles.heroXp}>{character.totalXp} XP</Text>
      </View>
      <ProgressBar
        value={character.progress.progressPercent}
        showLabel
        label={`${character.progress.xpInCurrentLevel} / ${character.progress.xpRequiredForNext} XP to next`}
      />
      {character.titleName ? (
        <Text style={styles.heroTitleLine}>Equipped title: {character.titleName}</Text>
      ) : null}
    </Card>
  );
}

function DashboardCategoryCard({ category }: { category: DashboardCategory }) {
  const router = useRouter();
  const categoryParams = {
    pathname: '/(tabs)/category/[categoryId]',
    params: { categoryId: category.id },
  };

  return (
    <Card style={styles.categoryCard}>
      <View style={styles.categoryTop}>
        <Ionicons size={18} name={category.iconKey as ComponentProps<typeof Ionicons>['name']} color={mapCategoryColor(category.colorToken)} />
        <Text style={styles.categoryName}>{category.name}</Text>
        <Text style={styles.categoryMeta}>LVL {category.level}</Text>
      </View>
      <ProgressBar
        value={category.progress.progressPercent}
        showLabel
        label={`${category.progress.xpInCurrentLevel} / ${category.progress.xpRequiredForNext} XP`}
      />
      <PrimaryButton
        label="Open details"
        variant="ghost"
        onPress={() => {
          router.push(categoryParams);
        }}
        style={styles.categoryAction}
        labelStyle={styles.categoryActionLabel}
      />
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.heroCard}>
          <Skeleton height={24} width="50%" />
          <Skeleton height={20} width="75%" />
          <Skeleton height={20} width="40%" />
          <Skeleton height={10} width="100%" />
        </Card>
        <Skeleton height={48} />
        <Card style={styles.emptyCard}>
          <Skeleton height={20} width="60%" />
          <Skeleton height={80} />
        </Card>
        <Card style={styles.emptyCard}>
          <Skeleton height={20} width="50%" />
          <Skeleton height={24} />
          <Skeleton height={24} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const summaryQuery = useQuery({
    queryKey: ['progression', 'dashboard'],
    queryFn: fetchDashboardSummary,
    staleTime: 30_000,
  });

  const isEmpty = useMemo(
    () => (summaryQuery.data?.categories.length ?? 0) === 0,
    [summaryQuery.data]
  );

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  if (summaryQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (summaryQuery.isError && !summaryQuery.data) {
    return (
      <Screen>
        <View style={styles.errorCard}>
          <Text style={styles.sectionHeading}>Couldn’t load dashboard</Text>
          <Text style={styles.errorMessage}>Check your network connection and retry.</Text>
          <PrimaryButton
            label="Retry"
            onPress={() => {
              void summaryQuery.refetch();
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!summaryQuery.data) {
    return <DashboardSkeleton />;
  }

  const { character, categories, recentActivities } = summaryQuery.data;
  const isRefreshing = summaryQuery.isFetching;

  return (
      <Screen>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <DashboardHeader character={character} />

        <PrimaryButton
          label="Log Activity"
          onPress={() => router.push('/log-activity')}
          style={styles.primaryAction}
        />

        <PrimaryButton
          label="Sign out"
          variant="ghost"
          onPress={handleSignOut}
          style={styles.signOutButton}
        />

        <Text style={styles.sectionHeading}>Active categories</Text>
        {isEmpty ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active categories yet.</Text>
            <Text style={styles.emptyMessage}>
              Complete onboarding or add activity to create your first category XP track.
            </Text>
          </Card>
        ) : (
          categories.map((category: DashboardCategory) => (
            <DashboardCategoryCard key={category.id} category={category} />
          ))
        )}

        <Text style={styles.sectionHeading}>Recent activity</Text>
        {recentActivities.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyMessage}>
              No logged activity yet. Your next activity starts this journey.
            </Text>
          </Card>
        ) : (
          <Card>
            {recentActivities.map((activity: DashboardSummary['recentActivities'][number]) => (
              <View key={activity.id} style={styles.recentRow}>
                <View style={styles.recentLeft}>
                  <Text style={styles.recentTemplate}>{activity.templateName}</Text>
                  <Text style={styles.recentMeta}>
                    {activity.categoryName} · {activity.attributeName} · {activity.xpTier}
                  </Text>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentXp}>+{activity.xpAwarded}</Text>
                  <Text style={styles.recentDate}>{formatDateLabel(activity.occurredAt)}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {isRefreshing ? <Text style={styles.refreshText}>Updating…</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroTitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  heroName: {
    ...typography.title,
    color: colors.textPrimary,
  },
  heroHandle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  heroLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLevel: {
    ...typography.title,
    color: colors.accent,
  },
  heroXp: {
    ...typography.body,
    color: colors.textPrimary,
  },
  heroTitleLine: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  primaryAction: {
    marginBottom: spacing.sm,
    alignSelf: 'stretch',
  },
  signOutButton: {
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  sectionHeading: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryAction: {
    marginTop: spacing.sm,
    marginHorizontal: 0,
    alignSelf: 'stretch',
  },
  categoryActionLabel: {
    color: colors.textPrimary,
  },
  categoryCard: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  categoryMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyCard: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  emptyMessage: {
    ...typography.body,
    color: colors.textSecondary,
  },
  recentRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  recentLeft: {
    flex: 1,
  },
  recentTemplate: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  recentMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentXp: {
    ...typography.body,
    color: colors.accent,
  },
  recentDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  errorCard: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  refreshText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
