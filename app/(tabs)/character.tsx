import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/src/components/ui/Card';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { Screen } from '@/src/components/ui/Screen';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { type CharacterSummary, fetchCharacterSummary } from '@/src/features/dashboard/dashboard-service';
import { Skeleton } from '@/src/components/ui/Skeleton';
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

function formatInt(value: number): string {
  return `${Math.max(0, Math.floor(value))}`;
}

function CharacterSkeleton() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.profileCard}>
          <Skeleton height={28} width="40%" />
          <Skeleton height={20} width="60%" />
          <Skeleton height={20} width="45%" />
          <Skeleton height={16} width="50%" />
          <Skeleton height={18} width="30%" />
        </Card>
        <Card style={styles.listContainer}>
          <Skeleton height={24} width="45%" />
          <Skeleton height={18} width="90%" />
          <Skeleton height={18} width="90%" />
        </Card>
        <Card style={styles.listContainer}>
          <Skeleton height={24} width="45%" />
          <Skeleton height={18} width="70%" />
          <Skeleton height={18} width="70%" />
        </Card>
      </ScrollView>
    </Screen>
  );
}

export default function CharacterScreen() {
  const characterQuery = useQuery({
    queryKey: ['progression', 'character'],
    queryFn: fetchCharacterSummary,
    staleTime: 30_000,
  });

  if (characterQuery.isLoading) {
    return <CharacterSkeleton />;
  }

  if (characterQuery.isError && !characterQuery.data) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.sectionHeading}>Unable to load character sheet</Text>
          <Text style={styles.errorMessage}>Please retry after checking your network.</Text>
        </View>
      </Screen>
    );
  }

  if (!characterQuery.data) {
    return <CharacterSkeleton />;
  }

  const summary = characterQuery.data as CharacterSummary;
  const sortedCategories = [...summary.categories].sort((left, right) => right.totalXp - left.totalXp);
  const { character, topAttributes } = summary;
  const isRefreshing = characterQuery.isFetching;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Ionicons
              name={resolveEmblemIcon(character.emblemKey)}
              size={34}
              color={colors.accent}
            />
            <View style={styles.profileText}>
              <Text style={styles.profileName}>{character.displayName}</Text>
              <Text style={styles.profileHandle}>@{character.handle}</Text>
            </View>
          </View>
          <Text style={styles.profileMeta}>Level {formatInt(character.level)}</Text>
          <Text style={styles.profileMeta}>Total XP: {formatInt(character.totalXp)}</Text>
          <Text style={styles.profileMeta}>Activities: {formatInt(character.activityCount)}</Text>
          <Text style={styles.profileMeta}>Achievements: {formatInt(character.achievementCount)}</Text>
          <ProgressBar
            value={character.progress.progressPercent}
            showLabel
            label={`${character.progress.xpInCurrentLevel}/${character.progress.xpRequiredForNext} XP to next level`}
          />
          {character.titleName ? (
            <Text style={styles.equippedTitle}>Equipped title: {character.titleName}</Text>
          ) : null}
        </Card>

        <Text style={styles.sectionHeading}>Active categories</Text>
        <Card style={styles.listContainer}>
          {sortedCategories.length === 0 ? (
            <Text style={styles.emptyMessage}>No active category stats yet.</Text>
          ) : (
            sortedCategories.map((category) => (
              <View key={category.id} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <Ionicons
                    name={category.iconKey as ComponentProps<typeof Ionicons>['name']}
                    size={16}
                    color={mapCategoryColor(category.colorToken)}
                  />
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                <Text style={styles.categoryValue}>
                  {formatInt(category.totalXp)} XP · Lvl {category.level}
                </Text>
                <ProgressBar
                  value={category.progress.progressPercent}
                  style={styles.miniBar}
                />
              </View>
            ))
          )}
        </Card>

        <Text style={styles.sectionHeading}>Strongest attributes</Text>
        <Card style={styles.listContainer}>
          {topAttributes.length === 0 ? (
            <Text style={styles.emptyMessage}>Log activities to grow attributes.</Text>
          ) : (
            topAttributes.map((attribute) => (
              <View key={attribute.id} style={styles.attributeRow}>
                <View style={styles.attributeTop}>
                  <Text style={styles.attributeName}>
                    {attribute.name}
                  </Text>
                  <Text style={styles.attributeMeta}>
                    {attribute.categoryName} · Lvl {attribute.level}
                  </Text>
                </View>
                <Text style={styles.attributeMeta}>
                  {formatInt(attribute.totalXp)} XP
                </Text>
                <ProgressBar
                  value={attribute.progress.progressPercent}
                  style={styles.attributeBar}
                />
              </View>
            ))
          )}
        </Card>

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
  profileCard: {
    gap: spacing.sm,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    ...typography.title,
    color: colors.textPrimary,
  },
  profileHandle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  profileMeta: {
    ...typography.body,
    color: colors.textPrimary,
  },
  equippedTitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionHeading: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  listContainer: {
    gap: spacing.sm,
  },
  emptyMessage: {
    ...typography.body,
    color: colors.textSecondary,
  },
  categoryRow: {
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  categoryValue: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  miniBar: {
    marginTop: spacing.xs,
  },
  attributeRow: {
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  attributeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attributeName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  attributeMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  attributeBar: {
    marginTop: spacing.xs,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
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
