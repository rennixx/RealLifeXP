import { useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { Card } from '@/src/components/ui/Card';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { Screen } from '@/src/components/ui/Screen';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { Skeleton } from '@/src/components/ui/Skeleton';
import {
  fetchCategoryActivitiesPage,
  type CategoryProgressPoint,
  fetchCategoryDetail,
} from '@/src/features/dashboard/category-detail-service';
import type { ComponentProps } from 'react';

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

function normalizeRouteId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
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

function CategoryProgressChart({ points }: { points: CategoryProgressPoint[] }) {
  if (points.length === 0) {
    return (
      <View style={styles.chartEmptyState}>
        <Text style={styles.emptyText}>No progress data yet for this period.</Text>
      </View>
    );
  }

  const maxXp = Math.max(...points.map((point) => point.xp), 1);

  return (
    <View style={styles.chart}>
      {points.map((point) => {
        const normalizedHeight = (point.xp / maxXp) * 100;
        return (
          <View key={point.start} style={styles.chartColumn}>
            <View style={styles.chartBarContainer}>
              <View style={[styles.chartBarFill, { height: `${Math.max(4, normalizedHeight)}%` }]} />
            </View>
            <Text style={styles.chartValue}>{point.xp}</Text>
            <Text style={styles.chartLabel}>{point.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function CategoryDetailSkeleton() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Skeleton height={120} />
        <Skeleton height={180} />
        <Skeleton height={140} />
        <Skeleton height={180} />
      </ScrollView>
    </Screen>
  );
}

export default function CategoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryId = normalizeRouteId(params.categoryId as string | string[] | undefined);

  const summaryQuery = useQuery({
    queryKey: ['progression', 'category-detail', categoryId],
    queryFn: () => fetchCategoryDetail(categoryId),
    enabled: Boolean(categoryId),
    staleTime: 30_000,
  });

  const recentQuery = useInfiniteQuery({
    queryKey: ['progression', 'category-detail-activities', categoryId],
    queryFn: ({ pageParam }) => fetchCategoryActivitiesPage(categoryId, pageParam),
    initialPageParam: 0,
    enabled: Boolean(categoryId),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextPage : undefined),
  });

  const combinedActivities = useMemo(() => {
    return (recentQuery.data?.pages ?? []).flatMap((page) => page.activities);
  }, [recentQuery.data]);

  const isRefreshing = summaryQuery.isFetching || recentQuery.isFetching;

  if (!categoryId) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Missing category</Text>
          <Text style={styles.errorText}>Pick a category to view details.</Text>
          <PrimaryButton label="Back home" onPress={() => router.replace('/(tabs)')} />
        </View>
      </Screen>
    );
  }

  if (summaryQuery.isLoading || recentQuery.isLoading) {
    return <CategoryDetailSkeleton />;
  }

  if (summaryQuery.isError || recentQuery.isError || !summaryQuery.data) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load this category</Text>
          <Text style={styles.errorText}>Please retry after checking your network.</Text>
          <PrimaryButton label="Retry" onPress={() => {
            void summaryQuery.refetch();
            void recentQuery.refetch();
          }} />
          <PrimaryButton
            label="Back home"
            variant="ghost"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </Screen>
  );
  }

  const { category, topAttributes } = summaryQuery.data;
  const progressSeries = summaryQuery.data.progressSeries;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Pressable
          style={styles.backLink}
          accessibilityRole="button"
          onPress={() => router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back-outline" size={22} color={colors.accent} />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Ionicons
              size={28}
              color={mapCategoryColor(category.colorToken)}
              name={category.iconKey as ComponentProps<typeof Ionicons>['name']}
            />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{category.name}</Text>
              <Text style={styles.headerMeta}>Category · Level {category.level}</Text>
            </View>
          </View>
          <ProgressBar
            value={category.progress.progressPercent}
            showLabel
            label={`${category.progress.xpInCurrentLevel} / ${category.progress.xpRequiredForNext} XP`}
          />
          <Text style={styles.valuePrimary}>{category.totalXp} XP total</Text>
        </Card>

        <Text style={styles.sectionHeading}>4-week progress</Text>
        <Card style={styles.chartCard}>
          <CategoryProgressChart points={progressSeries} />
        </Card>

        <Text style={styles.sectionHeading}>Top attributes</Text>
        <Card style={styles.listCard}>
          {topAttributes.length === 0 ? (
            <Text style={styles.emptyText}>No attributes tracked yet in this category.</Text>
          ) : (
            topAttributes.map((attribute) => (
              <View key={attribute.id} style={styles.attributeRow}>
                <View style={styles.attributeTop}>
                  <View style={styles.attributeLeft}>
                    <Ionicons
                      name="ellipse-outline"
                      size={16}
                      color={mapCategoryColor(attribute.categoryColorToken)}
                    />
                    <View>
                      <Text style={styles.attributeName}>{attribute.name}</Text>
                      <Text style={styles.attributeMeta}>
                        {attribute.categoryName} · Lvl {attribute.level}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.attributeMeta}>
                    {attribute.totalXp} XP
                  </Text>
                </View>
                <ProgressBar value={attribute.progress.progressPercent} style={styles.attributeBar} />
              </View>
            ))
          )}
        </Card>

        <Text style={styles.sectionHeading}>Recent activity</Text>
        <Card>
          {combinedActivities.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyText}>No activity in this category yet.</Text>
            </View>
          ) : (
            <View style={styles.recentList}>
              {combinedActivities.map((activity) => (
                <View key={activity.id} style={styles.recentRow}>
                  <View style={styles.recentLeft}>
                    <Text style={styles.recentTemplate}>{activity.templateName}</Text>
                    <Text style={styles.recentMeta}>
                      {activity.xpTier}
                    </Text>
                  </View>
                  <View style={styles.recentRight}>
                    <Text style={styles.recentXp}>+{activity.xpAwarded} XP</Text>
                    <Text style={styles.recentDate}>{formatDateLabel(activity.occurredAt)}</Text>
                  </View>
                </View>
              ))}
              {recentQuery.hasNextPage ? (
                <PrimaryButton
                  label={recentQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  onPress={() => void recentQuery.fetchNextPage()}
                  disabled={recentQuery.isFetchingNextPage}
                  style={styles.loadMore}
                />
              ) : null}
              {recentQuery.isFetching && !recentQuery.isFetchingNextPage ? <ActivityIndicator color={colors.accent} /> : null}
            </View>
          )}
        </Card>

        <PrimaryButton
          label="Log activity in this category"
          onPress={() => router.push('/log-activity')}
          style={styles.logAction}
        />

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
  backLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  headerCard: {
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  headerMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  valuePrimary: {
    ...typography.body,
    color: colors.textPrimary,
  },
  sectionHeading: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  listCard: {
    gap: spacing.sm,
  },
  attributeRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  attributeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  attributeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  attributeName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  attributeMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  attributeBar: {
    marginTop: spacing.xs,
  },
  recentList: {
    gap: spacing.md,
  },
  recentRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  recentTemplate: {
    ...typography.body,
    color: colors.textPrimary,
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
    ...typography.label,
    color: colors.textMuted,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyRecent: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  loadMore: {
    marginTop: spacing.xs,
  },
  logAction: {
    marginTop: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  errorTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chartCard: {
    gap: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.xs,
    minHeight: 128,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  chartBarContainer: {
    width: '100%',
    height: 88,
    borderRadius: 0,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    padding: spacing.xs,
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: 0,
  },
  chartValue: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chartLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chartEmptyState: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  refreshText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
