import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { LoadingState } from '@/src/components/ui/Loading';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { Card } from '@/src/components/ui/Card';
import { Screen } from '@/src/components/ui/Screen';
import { toUserMessage } from '@/src/lib/errors';
import { trackEvent } from '@/src/lib/analytics';
import {
  type HistoryActivityItem,
  type HistoryFilterOptions,
  type HistoryFetchFilters,
  type HistoryReversalResult,
  type HistoryStatusFilter,
  type HistoryTimeRange,
  type HistoryXpTier,
  fetchActivityHistoryPage,
  fetchHistoryFilterOptions,
  reverseActivity,
} from '@/src/features/history/history-service';
import { colors, radii, spacing, typography, elevations } from '@/src/theme/tokens';

type FilterOption<T extends string> = {
  label: string;
  value: T;
};

type SafeTimeRange = HistoryTimeRange;
type SafeXpTier = HistoryXpTier | 'all';

const statusFilters: FilterOption<HistoryStatusFilter>[] = [
  { label: 'ALL', value: 'all' },
  { label: 'ACTIVE', value: 'active' },
  { label: 'REVERSED', value: 'reversed' },
];

const tierFilters: FilterOption<SafeXpTier>[] = [
  { label: 'ALL TIERS', value: 'all' },
  { label: 'QUICK', value: 'quick' },
  { label: 'FOCUSED', value: 'focused' },
  { label: 'CHALLENGING', value: 'challenging' },
  { label: 'MILESTONE', value: 'milestone' },
  { label: 'MAJOR', value: 'major' },
];

const timeFilters: FilterOption<SafeTimeRange>[] = [
  { label: 'ALL', value: 'all' },
  { label: 'TODAY', value: 'today' },
  { label: 'LAST 7D', value: '7d' },
  { label: 'LAST 30D', value: '30d' },
  { label: 'LAST 90D', value: '90d' },
];

const MILLISECONDS_IN_DAY = 86_400_000;

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

function formatSummary(values: HistoryReversalResult): string[] {
  const lines: string[] = [];

  if (values.character.oldLevel !== values.character.newLevel) {
    lines.push(`Character: ${values.character.oldLevel} → ${values.character.newLevel}`);
  }

  if (values.category.oldLevel !== values.category.newLevel) {
    lines.push(`Category: ${values.category.oldLevel} → ${values.category.newLevel}`);
  }

  if (values.attribute.oldLevel !== values.attribute.newLevel) {
    lines.push(`Attribute: ${values.attribute.oldLevel} → ${values.attribute.newLevel}`);
  }

  if (lines.length === 0) {
    lines.push('XP is unchanged after reversal because this activity was already reversed.');
  }

  return lines;
}

function mapCategoryColor(token: string): string {
  const categoryColorByToken: Record<string, string> = {
    cobalt: '#4f9cff',
    amber: '#ffd166',
    emerald: '#49d9a1',
    fuchsia: '#e06fff',
    violet: '#8e84ff',
    teal: '#5df0e4',
    gold: '#f4be4f',
  };

  return categoryColorByToken[token] ?? colors.accent;
}

function computeTimeFilter(timeRange: SafeTimeRange): { from?: string; to?: string } {
  if (timeRange === 'all') {
    return {};
  }

  const now = new Date();
  const to = now.toISOString();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (timeRange === 'today') {
    return {
      from: start.toISOString(),
      to,
    };
  }

  if (timeRange === '7d') {
    start.setTime(start.getTime() - (6 * MILLISECONDS_IN_DAY));
  } else if (timeRange === '30d') {
    start.setTime(start.getTime() - (29 * MILLISECONDS_IN_DAY));
  } else {
    start.setTime(start.getTime() - (89 * MILLISECONDS_IN_DAY));
  }

  return {
    from: start.toISOString(),
    to,
  };
}

function searchActivities(activities: HistoryActivityItem[], term: string): HistoryActivityItem[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) {
    return activities;
  }

  return activities.filter((activity) => {
    const tokens = [
      activity.templateName,
      activity.categoryName,
      activity.attributeName,
      activity.xpTier,
      activity.note ?? '',
      activity.privateReflection ?? '',
      activity.categorySlug,
    ];

    return tokens.some((token) => token.toLowerCase().includes(normalized));
  });
}

function buildFilterRows(options: HistoryFilterOptions['attributes'] | undefined, categoryId: string) {
  if (!options || options.length === 0) {
    return [];
  }

  if (!categoryId) {
    return options;
  }

  return options.filter((option) => option.categoryId === categoryId);
}

function hasVisibleActivities(activities: HistoryActivityItem[], query: string): boolean {
  return searchActivities(activities, query).length > 0;
}

export default function HistoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all');
  const [xpTierFilter, setXpTierFilter] = useState<SafeXpTier>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<SafeTimeRange>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [attributeFilter, setAttributeFilter] = useState<string>('');
  const [templateFilter, setTemplateFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<HistoryActivityItem | null>(null);
  const [reversalError, setReversalError] = useState<string | null>(null);
  const [reversalResult, setReversalResult] = useState<HistoryReversalResult | null>(null);

  const filterOptionsQuery = useQuery({
    queryKey: ['history', 'filter-options'],
    queryFn: fetchHistoryFilterOptions,
    staleTime: 60_000,
  });

  const validCategoryFilter = useMemo(() => {
    if (!filterOptionsQuery.data?.categories.length || !categoryFilter) {
      return '';
    }

    return filterOptionsQuery.data.categories.some((category) => category.id === categoryFilter)
      ? categoryFilter
      : '';
  }, [categoryFilter, filterOptionsQuery.data]);

  const filteredAttributeOptions = useMemo(
    () => buildFilterRows(filterOptionsQuery.data?.attributes, validCategoryFilter),
    [filterOptionsQuery.data?.attributes, validCategoryFilter],
  );

  const validAttributeFilter = useMemo(() => {
    if (!attributeFilter) {
      return '';
    }

    const found = filteredAttributeOptions.some((attribute) => attribute.id === attributeFilter);
    return found ? attributeFilter : '';
  }, [attributeFilter, filteredAttributeOptions]);

  const validTemplateFilter = useMemo(() => {
    if (!templateFilter || !filterOptionsQuery.data?.templates.length) {
      return '';
    }

    return filterOptionsQuery.data.templates.some((template) => template.id === templateFilter)
      ? templateFilter
      : '';
  }, [templateFilter, filterOptionsQuery.data?.templates]);

  const fetchFilters = useMemo<HistoryFetchFilters>(() => {
    const filters: HistoryFetchFilters = {};
    const range = computeTimeFilter(timeRangeFilter);

    if (validCategoryFilter) {
      filters.categoryId = validCategoryFilter;
    }

    if (validAttributeFilter) {
      filters.attributeId = validAttributeFilter;
    }

    if (validTemplateFilter) {
      filters.templateId = validTemplateFilter;
    }

    if (statusFilter !== 'all') {
      filters.status = statusFilter;
    }

    if (xpTierFilter !== 'all') {
      filters.xpTier = xpTierFilter;
    }

    if (range.from) {
      filters.from = range.from;
    }

    if (range.to) {
      filters.to = range.to;
    }

    return filters;
  }, [xpTierFilter, statusFilter, timeRangeFilter, validAttributeFilter, validCategoryFilter, validTemplateFilter]);

  const historyQuery = useInfiniteQuery({
    queryKey: ['history', 'activities', fetchFilters],
    queryFn: ({ pageParam }) => fetchActivityHistoryPage(pageParam, fetchFilters),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextPage : undefined),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!filterOptionsQuery.data?.categories.length) {
      return;
    }

    if (validCategoryFilter !== categoryFilter) {
      setCategoryFilter('');
      setAttributeFilter('');
      setTemplateFilter('');
    }
  }, [validCategoryFilter, categoryFilter, filterOptionsQuery.data?.categories.length]);

  useEffect(() => {
    if (attributeFilter && validAttributeFilter !== attributeFilter) {
      setAttributeFilter('');
    }
  }, [attributeFilter, validAttributeFilter]);

  useEffect(() => {
    if (templateFilter && validTemplateFilter !== templateFilter) {
      setTemplateFilter('');
    }
  }, [templateFilter, validTemplateFilter]);

  const allActivities = useMemo(
    () => (historyQuery.data?.pages ?? []).flatMap((page) => page.activities),
    [historyQuery.data],
  );

  const visibleActivities = useMemo(
    () => searchActivities(allActivities, searchTerm),
    [allActivities, searchTerm],
  );

  const reverseMutation = useMutation({
    mutationFn: (activityId: string) => reverseActivity(activityId),
    onMutate: () => {
      setReversalError(null);
    },
    onSuccess: (result, activityId) => {
      setReversalResult(result);
      setSelectedActivity(null);
      setReversalError(null);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['history', 'activities'] }),
        queryClient.invalidateQueries({ queryKey: ['progression', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['progression', 'character'] }),
      ]);
      trackEvent('activity_reversed', {
        activity_id: activityId,
      });
    },
    onError: (error) => {
      setReversalError(toUserMessage(error));
    },
  });

  const canRequest = !reverseMutation.isPending && (selectedActivity?.status === 'active');

  const requestReversal = () => {
    if (!selectedActivity) {
      return;
    }

    setReversalError(null);
    setReversalResult(null);
    reverseMutation.mutate(selectedActivity.id);
  };

  const handleCloseModal = () => {
    if (reverseMutation.isPending) {
      return;
    }

    setSelectedActivity(null);
    setReversalError(null);
  };

  if (historyQuery.isLoading || (!filterOptionsQuery.data && filterOptionsQuery.isLoading)) {
    return <LoadingState message="Loading activity history…" />;
  }

  if (historyQuery.isError && !historyQuery.data) {
    return (
      <Screen>
        <Card style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load history</Text>
          <Text style={styles.errorMessage}>Try again after checking your network.</Text>
          <Text style={styles.errorDetail}>{toUserMessage(historyQuery.error)}</Text>
          <PrimaryButton
            label="Retry"
            onPress={() => {
              void filterOptionsQuery.refetch();
              void historyQuery.refetch();
            }}
          />
          <PrimaryButton
            label="Back"
            variant="ghost"
            onPress={() => router.replace('/(tabs)')}
          />
        </Card>
      </Screen>
    );
  }

  const hasActivityHistory = visibleActivities.length > 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Review activity records and reverse when needed.</Text>
        </View>

        <Card style={styles.searchCard}>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by template, category, attribute, or note…"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
          </Card>

        <View style={styles.controlsRow}>
          <PrimaryButton
            label="Refresh"
            variant="ghost"
            onPress={() => {
              void filterOptionsQuery.refetch();
              void historyQuery.refetch();
            }}
            style={styles.refreshButton}
            disabled={historyQuery.isRefetching}
          />
          <PrimaryButton
            label="Clear all"
            variant="ghost"
            onPress={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setXpTierFilter('all');
              setTimeRangeFilter('all');
              setCategoryFilter('');
              setAttributeFilter('');
              setTemplateFilter('');
            }}
            style={styles.clearButton}
          />
        </View>

        <Card style={styles.filterCard}>
          <Text style={styles.filterSectionTitle}>Status</Text>
          <View style={styles.chipRow}>
            {statusFilters.map((option) => {
              const isActive = statusFilter === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => {
                    setStatusFilter(option.value);
                    setSearchTerm('');
                  }}
                  style={[styles.chip, isActive ? styles.chipActive : undefined]}
                >
                  <Text style={[styles.chipText, isActive ? styles.chipTextActive : undefined]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.filterSectionTitle}>XP Tier</Text>
          <View style={styles.chipRow}>
            {tierFilters.map((option) => {
              const isActive = xpTierFilter === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => {
                    setXpTierFilter(option.value);
                    setSearchTerm('');
                  }}
                  style={[styles.chip, isActive ? styles.chipActive : undefined]}
                >
                  <Text style={[styles.chipText, isActive ? styles.chipTextActive : undefined]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.filterSectionTitle}>Time range</Text>
          <View style={styles.chipRow}>
            {timeFilters.map((option) => {
              const isActive = timeRangeFilter === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => {
                    setTimeRangeFilter(option.value);
                    setSearchTerm('');
                  }}
                  style={[styles.chip, isActive ? styles.chipActive : undefined]}
                >
                  <Text style={[styles.chipText, isActive ? styles.chipTextActive : undefined]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.filterSectionTitle}>Category</Text>
          <View style={styles.chipRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCategoryFilter('');
                setAttributeFilter('');
                setTemplateFilter('');
              }}
              style={[styles.chip, !categoryFilter ? styles.chipActive : undefined]}
            >
              <Text style={[styles.chipText, !categoryFilter ? styles.chipTextActive : undefined]}>
                ALL
              </Text>
            </Pressable>
            {filterOptionsQuery.data?.categories.map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                onPress={() => {
                  setCategoryFilter((current) => (current === category.id ? '' : category.id));
                  setAttributeFilter('');
                  setTemplateFilter('');
                }}
                style={[
                  styles.chip,
                  categoryFilter === category.id ? styles.chipActive : undefined,
                  { borderColor: mapCategoryColor(category.colorToken) },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    categoryFilter === category.id ? styles.chipTextActive : undefined,
                  ]}
                >
                  {category.slug.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterSectionTitle}>Attribute</Text>
          <View style={styles.chipRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAttributeFilter('');
              }}
              style={[styles.chip, !attributeFilter ? styles.chipActive : undefined]}
            >
              <Text style={[styles.chipText, !attributeFilter ? styles.chipTextActive : undefined]}>
                ALL
              </Text>
            </Pressable>
            {filteredAttributeOptions.map((attribute) => (
              <Pressable
                key={attribute.id}
                accessibilityRole="button"
                onPress={() => {
                  setAttributeFilter((current) => (current === attribute.id ? '' : attribute.id));
                }}
                style={[styles.chip, attributeFilter === attribute.id ? styles.chipActive : undefined]}
              >
                <Text
                  style={[
                    styles.chipText,
                    attributeFilter === attribute.id ? styles.chipTextActive : undefined,
                  ]}
                >
                  {attribute.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterSectionTitle}>Template</Text>
          <View style={styles.chipRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setTemplateFilter('');
              }}
              style={[styles.chip, !templateFilter ? styles.chipActive : undefined]}
            >
              <Text style={[styles.chipText, !templateFilter ? styles.chipTextActive : undefined]}>
                ALL
              </Text>
            </Pressable>
            {filterOptionsQuery.data?.templates.map((template) => (
              <Pressable
                key={template.id}
                accessibilityRole="button"
                onPress={() => {
                  setTemplateFilter((current) => (current === template.id ? '' : template.id));
                }}
                style={[styles.chip, templateFilter === template.id ? styles.chipActive : undefined]}
              >
                <Text
                  style={[
                    styles.chipText,
                    templateFilter === template.id ? styles.chipTextActive : undefined,
                  ]}
                >
                  {template.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {reversalResult ? (
          <Card style={styles.successCard}>
            <Text style={styles.successTitle}>Activity reversed</Text>
            <Text style={styles.successMessage}>
              Entry {reversalResult.activityId} was reversed for {Math.abs(reversalResult.xpAwarded)} XP.
            </Text>
            {formatSummary(reversalResult).map((line) => (
              <Text key={line} style={styles.successLine}>
                {line}
              </Text>
            ))}
            <PrimaryButton
              label="Done"
              variant="ghost"
              onPress={() => {
                setReversalResult(null);
              }}
              style={styles.successButton}
            />
          </Card>
        ) : null}

        {historyQuery.isError ? (
          <Card style={styles.lockedCard}>
            <Text style={styles.errorText}>Could not refresh the list. Showing latest cached data.</Text>
            <Text style={styles.errorDetail}>{toUserMessage(historyQuery.error)}</Text>
          </Card>
        ) : null}

        <Card>
          <View style={styles.historyHeader}>
            <Text style={styles.cardTitle}>Logged activity</Text>
            {historyQuery.isFetching ? <Text style={styles.updatingText}>Updating…</Text> : null}
          </View>

          {!hasActivityHistory ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={26} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {hasVisibleActivities(allActivities, searchTerm)
                  ? 'No matches for the current search.'
                  : 'No activity found for these filters.'}
              </Text>
              <Text style={styles.emptyMessage}>
                Update a filter or search term, or log new activity to populate history.
              </Text>
              <PrimaryButton
                label="Clear filters"
                variant="ghost"
                onPress={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setXpTierFilter('all');
                  setTimeRangeFilter('all');
                  setCategoryFilter('');
                  setAttributeFilter('');
                  setTemplateFilter('');
                }}
              />
            </View>
          ) : (
            <View style={styles.activityList}>
              {visibleActivities.map((activity) => {
                const isReversed = activity.status === 'reversed';

                return (
                  <View key={activity.id} style={styles.activityRow}>
                    <View style={styles.activityMark}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: isReversed ? colors.outlineVariant : mapCategoryColor(activity.categoryColorToken),
                          },
                        ]}
                      />
                      <View style={styles.activityMeta}>
                        <Text style={styles.templateName} numberOfLines={1}>
                          {activity.templateName}
                        </Text>
                        <Text style={styles.activityMetaText}>
                          {activity.categoryName} · {activity.attributeName} · {activity.xpTier.toUpperCase()}
                        </Text>
                        <Text style={styles.activityMetaText}>
                          {activity.durationMinutes === null ? 'No duration logged' : `${activity.durationMinutes} min`} · {activity.note ? 'Has notes' : 'No note'}
                        </Text>
                        {activity.privateReflection ? (
                          <Text style={styles.activityMetaText}>Reflection saved</Text>
                        ) : null}
                        <Text style={styles.activityDate}>{formatDateLabel(activity.occurredAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.activityRight}>
                      <Text style={styles.xpText}>+{activity.xpAwarded} XP</Text>
                      <Text style={styles.statusText}>{isReversed ? 'REVERSED' : 'ACTIVE'}</Text>
                      {activity.status === 'active' ? (
                        <PrimaryButton
                          label="Reverse"
                          variant="ghost"
                          onPress={() => {
                            setReversalError(null);
                            setSelectedActivity(activity);
                          }}
                          style={styles.reverseButton}
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })}

              {historyQuery.hasNextPage ? (
                <PrimaryButton
                  label={historyQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  onPress={() => void historyQuery.fetchNextPage()}
                  disabled={historyQuery.isFetchingNextPage}
                  style={styles.loadMoreButton}
                />
              ) : null}
              {historyQuery.isFetching && !historyQuery.isFetchingNextPage ? (
                <ActivityIndicator color={colors.accent} style={styles.inlineSpinner} />
              ) : null}
            </View>
          )}
        </Card>

      </ScrollView>

      <Modal
        visible={Boolean(selectedActivity)}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleCloseModal} accessibilityRole="button">
          {selectedActivity ? (
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Reverse this activity?</Text>
              <Text style={styles.modalSubtle}>
                {selectedActivity.templateName} · {selectedActivity.categoryName} · {selectedActivity.attributeName}
              </Text>
              <Text style={styles.modalSubtle}>
                XP to remove: {selectedActivity.xpAwarded} XP • {formatDateLabel(selectedActivity.occurredAt)}
              </Text>

              <Text style={styles.modalWarning}>
                Reversal creates an immutable audit entry and can be triggered once per activity.
              </Text>

              {reversalError ? <Text style={styles.errorText}>{reversalError}</Text> : null}

              <View style={styles.modalActions}>
                <PrimaryButton
                  label="Cancel"
                  variant="ghost"
                  onPress={handleCloseModal}
                  disabled={reverseMutation.isPending}
                  style={styles.modalActionButton}
                />
                <PrimaryButton
                  label={reverseMutation.isPending ? 'Reversing…' : 'Confirm'}
                  onPress={requestReversal}
                  disabled={reverseMutation.isPending || !canRequest}
                  style={styles.modalActionButton}
                />
              </View>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  pageHeader: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    color: colors.textPrimary,
    ...typography.body,
    backgroundColor: colors.surfaceContainer,
    includeFontPadding: false,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    textAlignVertical: 'center',
    minHeight: 44,
  },
  controlsRow: {
    alignItems: 'flex-end',
    gap: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  searchCard: {
    padding: spacing.xs,
  },
  refreshButton: {
    minWidth: 118,
  },
  clearButton: {
    minWidth: 118,
  },
  filterCard: {
    gap: spacing.md,
  },
  filterSectionTitle: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    minWidth: 88,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipText: {
    ...typography.label,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  chipTextActive: {
    color: colors.textPrimary,
  },
  successCard: {
    borderColor: colors.success,
    backgroundColor: colors.surfaceContainer,
    gap: spacing.sm,
  },
  successTitle: {
    ...typography.bodyLarge,
    color: colors.success,
  },
  successMessage: {
    ...typography.body,
    color: colors.textPrimary,
  },
  successLine: {
    ...typography.body,
    color: colors.textSecondary,
  },
  successButton: {
    alignSelf: 'flex-start',
    minWidth: 92,
  },
  errorCard: {
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.warning,
  },
  errorDetail: {
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  lockedCard: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.warning,
  },
  updatingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activityList: {
    gap: spacing.md,
  },
  activityRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  activityMark: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  activityMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
  },
  templateName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  activityMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  activityDate: {
    ...typography.label,
    color: colors.textMuted,
  },
  activityRight: {
    alignSelf: 'stretch',
    marginLeft: spacing.lg,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  xpText: {
    ...typography.body,
    color: colors.accent,
  },
  statusText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  reverseButton: {
    minWidth: 96,
  },
  loadMoreButton: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
  inlineSpinner: {
    alignSelf: 'center',
    paddingTop: spacing.sm,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.lg,
    gap: spacing.md,
    ...elevations.subtle,
  },
  modalTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalSubtle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalWarning: {
    ...typography.label,
    color: colors.warning,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalActionButton: {
    flex: 1,
  },
});
