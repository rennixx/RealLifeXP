import {
  AccessibilityInfo,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { toUserMessage } from '@/src/lib/errors';
import {
  type AchievementFilter,
  type AchievementItem,
  type TitleItem,
  equipTitle,
  fetchAchievementsOverview,
} from '@/src/features/achievements/achievements-service';
import { Card } from '@/src/components/ui/Card';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { Screen } from '@/src/components/ui/Screen';
import { LoadingState } from '@/src/components/ui/Loading';
import { trackEvent } from '@/src/lib/analytics';
import { colors, spacing, typography, elevations } from '@/src/theme/tokens';

type FilterOption = {
  label: string;
  value: AchievementFilter;
};

type RarityToken = 'common' | 'rare' | 'epic' | 'legendary';
type IconName = ComponentProps<typeof Ionicons>['name'];

const filterOptions: FilterOption[] = [
  { label: 'ALL', value: 'all' },
  { label: 'UNLOCKED', value: 'unlocked' },
  { label: 'LOCKED', value: 'locked' },
  { label: 'HIDDEN', value: 'hidden' },
];

const iconByName: Record<string, IconName> = {
  'workspace_premium': 'ribbon',
  'sparkles': 'sparkles',
  'play-circle': 'play-circle-outline',
  'school': 'school',
  'hammer': 'hammer-outline',
  'military_tech': 'medal-outline',
  'psychology': 'school',
  'wb_sunny': 'sunny-outline',
  'construction': 'construct-outline',
  'emoji_events': 'trophy-outline',
  'groups': 'people-outline',
  default: 'ribbon',
};

const iconRarityGlow: Record<RarityToken, string> = {
  common: colors.outlineVariant,
  rare: colors.accentGlow,
  epic: colors.accent,
  legendary: colors.warning,
};

const rarityText: Record<RarityToken, string> = {
  common: colors.textSecondary,
  rare: colors.accentGlow,
  epic: colors.accent,
  legendary: colors.warning,
};

function mapIcon(key: string): ComponentProps<typeof Ionicons>['name'] {
  return iconByName[key] ?? iconByName.default;
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Locked';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unlocked';
  }

  return parsed.toLocaleDateString();
}

function getVisibleAchievements(
  items: AchievementItem[],
  filter: AchievementFilter,
  searchTerm: string,
): AchievementItem[] {
  const normalized = searchTerm.trim().toLowerCase();
  const withFilter = (() => {
    if (filter === 'all') {
      return items;
    }

    if (filter === 'unlocked') {
      return items.filter((item) => item.isUnlocked);
    }

    if (filter === 'locked') {
      return items.filter((item) => !item.isUnlocked);
    }

    return items.filter((item) => item.isHidden);
  })();

  if (!normalized) {
    return withFilter;
  }

  return withFilter.filter((achievement) => {
    const haystack = [
      achievement.name,
      achievement.hiddenName,
      achievement.description,
      achievement.hiddenDescription,
      achievement.rarity,
      achievement.isUnlocked ? 'unlocked' : 'locked',
      achievement.isHidden ? 'hidden' : '',
    ].map((value) => value?.toLowerCase() ?? '');

    return haystack.some((value) => value.includes(normalized));
  });
}

function filterTitlesBySearch(titles: TitleItem[], searchTerm: string): TitleItem[] {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) {
    return titles;
  }

  return titles.filter((title) => {
    const haystack = [
      title.name,
      title.description,
      title.rarity,
      title.isOwned ? 'unlocked' : 'locked',
      title.isEquipped ? 'equipped' : '',
      title.iconKey,
    ].map((value) => value.toLowerCase());

    return haystack.some((value) => value.includes(normalized));
  });
}

function normalizeProgressValue(unlocked: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((unlocked / total) * 100);
}

function isTargetReduceMotionSupported(): boolean {
  return typeof AccessibilityInfo.isReduceMotionEnabled === 'function';
}

function compareTitleRows(left: TitleItem, right: TitleItem): number {
  if (left.isEquipped !== right.isEquipped) {
    return left.isEquipped ? -1 : 1;
  }

  if (left.isOwned !== right.isOwned) {
    return left.isOwned ? -1 : 1;
  }

  if (left.rarity !== right.rarity) {
    return left.rarity.localeCompare(right.rarity);
  }

  return left.name.localeCompare(right.name);
}

export default function AchievementsScreen() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<AchievementFilter>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [equipError, setEquipError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const achievementsQuery = useQuery({
    queryKey: ['achievements', 'overview'],
    queryFn: fetchAchievementsOverview,
    staleTime: 30_000,
  });

  const queryData = achievementsQuery.data;
  const visibleAchievements = useMemo(
    () =>
      queryData
        ? getVisibleAchievements(queryData.achievements, activeFilter, searchTerm)
        : [],
    [queryData, activeFilter, searchTerm],
  );

  const visibleTitles = useMemo(
    () =>
      queryData
        ? filterTitlesBySearch([...queryData.titles], searchTerm).sort(compareTitleRows)
        : [],
    [queryData, searchTerm],
  );

  const equipMutation = useMutation({
    mutationFn: (titleId: string) => equipTitle(titleId),
    onMutate: () => {
      setEquipError(null);
    },
    onSuccess: async (_result, titleId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['achievements', 'overview'] }),
        queryClient.invalidateQueries({ queryKey: ['progression', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['progression', 'character'] }),
      ]);

      trackEvent('title_equipped', {
        title_id: titleId,
      });
    },
    onError: (error) => {
      setEquipError(toUserMessage(error));
    },
  });

  useEffect(() => {
    let isActive = true;

    if (!isTargetReduceMotionSupported()) {
      return undefined;
    }

    void AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
      if (isActive) {
        setReduceMotionEnabled(isEnabled);
      }
    });

    const reducedMotionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );

    return () => {
      isActive = false;
      reducedMotionSubscription.remove();
    };
  }, []);

  const progress = queryData
    ? normalizeProgressValue(queryData.unlockedAchievementCount, queryData.totalAchievementCount)
    : 0;

  if (achievementsQuery.isLoading) {
    return <LoadingState message="Loading achievements..." />;
  }

  if (achievementsQuery.isError || !queryData) {
    return (
      <Screen>
        <Card style={styles.errorContainer}>
          <Text style={styles.sectionTitle}>Unable to load progression awards.</Text>
          <Text style={styles.errorText}>
            {toUserMessage(achievementsQuery.error)}
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.heading}>Trophies</Text>

        <Card style={styles.searchCard}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search trophies and titles..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </Card>

        <Card style={styles.overviewCard}>
          <Text style={styles.progressText}>
            {queryData.unlockedAchievementCount} / {queryData.totalAchievementCount} Unlocked
          </Text>
          <ProgressBar
            value={progress}
            showLabel
            label={`${progress}% complete`}
            style={styles.progressBar}
          />
        </Card>

        <Card style={styles.filterCard}>
          <Text style={styles.sectionHeader}>Filter by status</Text>
          <View style={styles.filterRow}>
            {filterOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setActiveFilter(option.value)}
                style={[
                  styles.filterChip,
                  activeFilter === option.value && styles.filterChipActive,
                ]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === option.value ? styles.filterTextActive : undefined,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionHeader}>Achievements</Text>
          <View style={styles.achievementGrid}>
            {visibleAchievements.length === 0 ? (
              <Text style={styles.emptyMessage}>No achievements match the selected filter.</Text>
            ) : (
              visibleAchievements.map((achievement) => (
                <Pressable
                  key={achievement.id}
                  accessibilityRole="button"
                  onPress={() => setSelectedAchievement(achievement)}
                  style={[
                    styles.achievementCard,
                    achievement.isHidden && styles.hiddenCard,
                    achievement.isUnlocked ? styles.achievementUnlocked : styles.achievementLocked,
                    { borderColor: iconRarityGlow[achievement.rarity as RarityToken] },
                  ]}
                  testID={`achievement-card-${achievement.slug}`}
                >
                  <View style={styles.achievementIconWrap}>
                    <Ionicons
                      name={mapIcon(achievement.iconKey)}
                      size={24}
                      color={rarityText[achievement.rarity as RarityToken]}
                    />
                  </View>
                  <Text
                    style={styles.achievementTitle}
                    numberOfLines={2}
                  >
                    {achievement.isHidden && !achievement.isUnlocked ? achievement.hiddenName : achievement.name}
                  </Text>
                  <Text style={styles.achievementRarity}>
                    {achievement.rarity.toUpperCase()}
                  </Text>
                  <Text style={styles.achievementState}>
                    {achievement.isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Available Titles</Text>
            <Text style={styles.sectionMeta}>
              {visibleTitles.filter((title) => title.isOwned).length} / {visibleTitles.length} Unlocked
            </Text>
          </View>

          <View style={styles.titleList}>
            {visibleTitles.length === 0 ? (
              <Text style={styles.emptyMessage}>No titles available yet.</Text>
            ) : (
              visibleTitles.map((title) => {
                const titleLabel = title.isOwned ? 'Unlocked' : 'Locked';

                return (
                  <View key={title.id} style={[
                    styles.titleRow,
                    !title.isOwned ? styles.lockedTitle : undefined,
                  ]}>
                    <View style={styles.titleIconWrap}>
                      <Ionicons
                        name={mapIcon(title.iconKey)}
                        size={20}
                        color={title.isOwned ? colors.accent : colors.textMuted}
                      />
                    </View>
                    <View style={styles.titleTextWrap}>
                      <View style={styles.titleHeader}>
                        <Text style={styles.titleName} numberOfLines={1}>{title.name}</Text>
                        <Text style={styles.titleRarity}>{title.rarity.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.titleDescription} numberOfLines={2}>
                        {title.description}
                      </Text>
                      <Text style={styles.titleUnlockedLabel}>
                        {titleLabel}
                      </Text>
                    </View>
                    {title.isEquipped ? (
                      <Text style={styles.equippedPill}>Equipped</Text>
                    ) : title.isOwned ? (
                      <PrimaryButton
                        label="Equip"
                        variant="ghost"
                        onPress={() => equipMutation.mutate(title.id)}
                        disabled={equipMutation.isPending}
                        style={styles.equipButton}
                      />
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </Card>

        {equipError ? <Text style={styles.errorText}>{equipError}</Text> : null}
      </View>

      <Modal
        visible={Boolean(selectedAchievement)}
        transparent
        animationType={reduceMotionEnabled ? 'none' : 'fade'}
        onRequestClose={() => setSelectedAchievement(null)}
      >
        <Pressable
          onPress={() => setSelectedAchievement(null)}
          style={styles.modalBackdrop}
          accessibilityRole="button"
        >
          <View style={styles.modalContent}>
            {selectedAchievement ? (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Ionicons
                    name={mapIcon(selectedAchievement.iconKey)}
                    size={36}
                    color={rarityText[selectedAchievement.rarity as RarityToken]}
                    style={styles.modalIcon}
                  />
                  <Text style={styles.modalTitle}>
                    {selectedAchievement.isHidden && !selectedAchievement.isUnlocked
                      ? selectedAchievement.hiddenName
                      : selectedAchievement.name
                    }
                  </Text>
                  <Text style={styles.modalRarity}>
                    {selectedAchievement.rarity.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.modalDescription}>
                  {selectedAchievement.isHidden && !selectedAchievement.isUnlocked
                    ? selectedAchievement.hiddenDescription
                    : selectedAchievement.description
                  }
                </Text>

                <View style={styles.modalStatRow}>
                  <Text style={styles.modalStatLabel}>Unlocked</Text>
                  <Text style={styles.modalStatValue}>{formatDate(selectedAchievement.unlockedAt)}</Text>
                </View>
                {selectedAchievement.rewardTitleName ? (
                  <View style={styles.modalStatRow}>
                    <Text style={styles.modalStatLabel}>Reward</Text>
                    <Text style={styles.modalStatValue}>{selectedAchievement.rewardTitleName}</Text>
                  </View>
                ) : null}

                <PrimaryButton
                  label="Dismiss"
                  variant="ghost"
                  onPress={() => setSelectedAchievement(null)}
                  style={styles.modalButton}
                />
              </ScrollView>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    ...typography.title,
    color: colors.textPrimary,
  },
  progressText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  overviewCard: {
    gap: spacing.md,
  },
  progressBar: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  searchCard: {
    borderColor: colors.outlineVariant,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    color: colors.textPrimary,
    ...typography.body,
    includeFontPadding: false,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    textAlignVertical: 'center',
    backgroundColor: colors.surfaceContainer,
    minHeight: 44,
  },
  filterCard: {
    gap: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    minHeight: 44,
  },
  filterChipActive: {
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerHigh,
  },
  filterText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  filterTextActive: {
    color: colors.textPrimary,
  },
  sectionHeader: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  sectionMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  achievementCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 0,
    padding: spacing.md,
    minHeight: 130,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  achievementUnlocked: {
    backgroundColor: colors.surface,
    opacity: 1,
  },
  achievementLocked: {
    backgroundColor: colors.surface,
    opacity: 0.65,
  },
  hiddenCard: {
    borderStyle: 'dashed',
  },
  achievementIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementTitle: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  achievementRarity: {
    ...typography.label,
    color: colors.textSecondary,
  },
  achievementState: {
    ...typography.label,
    color: colors.textMuted,
  },
  titleList: {
    gap: spacing.md,
  },
  titleRow: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  lockedTitle: {
    opacity: 0.6,
  },
  titleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  titleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  titleRarity: {
    ...typography.label,
    color: colors.accent,
  },
  titleDescription: {
    ...typography.body,
    color: colors.textSecondary,
  },
  titleUnlockedLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  equippedPill: {
    ...typography.label,
    color: colors.textPrimary,
    backgroundColor: colors.accent,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 0,
    overflow: 'hidden',
  },
  equipButton: {
    minWidth: 88,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  errorContainer: {
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    padding: spacing.lg,
    ...elevations.subtle,
  },
  modalHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalIcon: {
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalRarity: {
    ...typography.label,
    color: colors.textSecondary,
  },
  modalDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalStatRow: {
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalStatLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  modalStatValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  modalButton: {
    marginTop: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
});
