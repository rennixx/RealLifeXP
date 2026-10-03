import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { FormField } from '@/src/components/ui/FormField';
import { LoadingState } from '@/src/components/ui/Loading';
import { Card } from '@/src/components/ui/Card';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { Screen } from '@/src/components/ui/Screen';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { toUserMessage } from '@/src/lib/errors';
import { colors, spacing, typography } from '@/src/theme/tokens';
import {
  fetchAccountExportData,
  fetchSettingsData,
  requestAccountDeletion,
  type SettingsData,
  type ProfileSettingsUpdate,
  type SettingsCategory,
  updateProfileCategorySelections,
  updateProfileSettings,
} from '@/src/features/settings/settings-service';

const MIN_ACTIVE_CATEGORIES = 3;
const MAX_ACTIVE_CATEGORIES = 6;

const emblemOptions = [
  { key: 'atlas-default', label: 'Atlas' },
  { key: 'raven', label: 'Raven' },
  { key: 'flare', label: 'Flare' },
  { key: 'prism', label: 'Prism' },
  { key: 'cipher', label: 'Cipher' },
] as const;

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

function validateInputs(values: { displayName: string; handle: string }): string | null {
  const displayName = values.displayName.trim();
  const handle = values.handle.trim();

  if (displayName.length < 1 || displayName.length > 50) {
    return 'Display name must be between 1 and 50 characters.';
  }

  const handleNormalized = normalizeHandle(handle);
  if (handleNormalized.length < 3 || handleNormalized.length > 24) {
    return 'Handle must be between 3 and 24 characters.';
  }

  if (!/^[a-z0-9_-]+$/i.test(handleNormalized)) {
    return 'Handle can only use letters, numbers, underscores, and dashes.';
  }

  return null;
}

function hasSameOrder(first: string[], second: string[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((id, index) => id === second[index]);
}

function getCategorySelectionCountMessage(selectedCategoryIds: string[]): string | null {
  if (selectedCategoryIds.length < MIN_ACTIVE_CATEGORIES) {
    return `Pick at least ${MIN_ACTIVE_CATEGORIES} categories.`;
  }

  if (selectedCategoryIds.length > MAX_ACTIVE_CATEGORIES) {
    return `Pick no more than ${MAX_ACTIVE_CATEGORIES} categories.`;
  }

  return null;
}

function categoryButtonStyle(isSelected: boolean) {
  return isSelected ? styles.categoryButtonSelected : styles.categoryButton;
}

function categoryButtonLabelStyle(isSelected: boolean) {
  return isSelected ? styles.categoryButtonLabelSelected : styles.categoryButtonLabel;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [emblemKey, setEmblemKey] = useState<string>(emblemOptions[0]?.key ?? 'atlas-default');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['settings', 'data'],
    queryFn: fetchSettingsData,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    const nextSettings = settingsQuery.data;
    setSettingsData(nextSettings);
    setDisplayName(nextSettings.profile.displayName);
    setHandle(nextSettings.profile.handle);
    setEmblemKey(nextSettings.profile.emblemKey);
    setHapticsEnabled(nextSettings.profile.hapticsEnabled);
    setReducedMotion(nextSettings.profile.reducedMotion);
    setSelectedCategoryIds(nextSettings.selectedCategoryIds);
    setProfileError(null);
    setProfileMessage(null);
    setCategoryError(null);
    setCategoryMessage(null);
    setAccountError(null);
    setAccountMessage(null);
  }, [settingsQuery.data]);

  const hasProfileChanges = useMemo(() => {
    const profile = settingsData?.profile;
    if (!profile) {
      return false;
    }

    return (
      displayName.trim() !== profile.displayName ||
      normalizeHandle(handle) !== profile.handle.toLowerCase() ||
      emblemKey !== profile.emblemKey ||
      hapticsEnabled !== profile.hapticsEnabled ||
      reducedMotion !== profile.reducedMotion
    );
  }, [displayName, handle, emblemKey, hapticsEnabled, reducedMotion, settingsData?.profile]);

  const hasCategoryChanges = useMemo(() => {
    if (!settingsData) {
      return false;
    }

    return !hasSameOrder(selectedCategoryIds, settingsData.selectedCategoryIds);
  }, [settingsData, selectedCategoryIds]);

  const saveProfileMutation = useMutation({
    mutationFn: (payload: ProfileSettingsUpdate) => updateProfileSettings(payload),
    onSuccess: (nextProfile) => {
      if (!settingsData) {
        return;
      }

      const updatedSettings: SettingsData = { ...settingsData, profile: nextProfile };
      setSettingsData(updatedSettings);
      setProfileMessage('Settings updated.');
      setProfileError(null);
      void queryClient.invalidateQueries({ queryKey: ['settings', 'data'] });
      void queryClient.invalidateQueries({ queryKey: ['progression', 'dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['progression', 'character'] });
    },
    onError: (error) => {
      setProfileError(toUserMessage(error));
      setProfileMessage(null);
    },
  });

  const saveCategoryMutation = useMutation({
    mutationFn: (categoryIds: string[]) => updateProfileCategorySelections(categoryIds),
    onSuccess: (nextSettings) => {
      setSettingsData(nextSettings);
      setSelectedCategoryIds(nextSettings.selectedCategoryIds);
      setCategoryMessage('Active categories updated.');
      setCategoryError(null);
      void queryClient.invalidateQueries({ queryKey: ['settings', 'data'] });
      void queryClient.invalidateQueries({ queryKey: ['progression', 'dashboard'] });
    },
    onError: (error) => {
      setCategoryError(toUserMessage(error));
      setCategoryMessage(null);
    },
  });

  const categorySelectionError = getCategorySelectionCountMessage(selectedCategoryIds);
  const canSaveCategories = Boolean(settingsData) && hasCategoryChanges && !categorySelectionError && !saveCategoryMutation.isPending;

  const exportMutation = useMutation({
    mutationFn: fetchAccountExportData,
    onError: (error) => {
      setAccountError(toUserMessage(error));
      setAccountMessage(null);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: requestAccountDeletion,
    onError: (error) => {
      setAccountError(toUserMessage(error));
      setAccountMessage(null);
    },
  });

  const handleSaveProfile = () => {
    const invalid = validateInputs({ displayName, handle });
    if (invalid) {
      setProfileError(invalid);
      return;
    }

    if (!settingsData) {
      return;
    }

    const updates: ProfileSettingsUpdate = {};

    if (!hasProfileChanges) {
      setProfileError('No profile changes to save.');
      return;
    }

    if (displayName.trim() !== settingsData.profile.displayName) {
      updates.displayName = displayName.trim();
    }

    if (normalizeHandle(handle) !== settingsData.profile.handle.toLowerCase()) {
      updates.handle = normalizeHandle(handle);
    }

    if (emblemKey !== settingsData.profile.emblemKey) {
      updates.emblemKey = emblemKey;
    }

    if (hapticsEnabled !== settingsData.profile.hapticsEnabled) {
      updates.hapticsEnabled = hapticsEnabled;
    }

    if (reducedMotion !== settingsData.profile.reducedMotion) {
      updates.reducedMotion = reducedMotion;
    }

    setProfileError(null);
    setProfileMessage(null);
    saveProfileMutation.mutate(updates);
  };

  const handleSaveCategories = () => {
    if (!settingsData) {
      return;
    }

    if (categorySelectionError) {
      setCategoryError(categorySelectionError);
      return;
    }

    if (!hasCategoryChanges) {
      setCategoryError('No category changes to save.');
      return;
    }

    setCategoryError(null);
    setCategoryMessage(null);
    saveCategoryMutation.mutate(selectedCategoryIds);
  };

  const handleExport = async () => {
    setAccountError(null);
    setAccountMessage(null);

    try {
      const payload = await exportMutation.mutateAsync();
      const message = `RealLife XP Account Export\n\n${JSON.stringify(payload, null, 2)}`;
      await Share.share({ title: 'RealLife XP Export', message });
      setAccountMessage('Export prepared in your share menu.');
    } catch (error) {
      setAccountError(toUserMessage(error));
    }
  };

  const handleDeleteAccount = async () => {
    const didConfirm = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Delete account',
        'This will permanently remove your profile and all owned progression data. This cannot be undone.',
        [
          { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
          { text: 'Delete account', onPress: () => resolve(true), style: 'destructive' },
        ],
      );
    });

    if (!didConfirm) {
      return;
    }

    setAccountError(null);
    setAccountMessage(null);

    try {
      await deleteAccountMutation.mutateAsync();
      await signOut();
      queryClient.clear();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      setAccountError(toUserMessage(error));
    }
  };

  const handleSignOut = async () => {
    const didConfirm = await new Promise<boolean>((resolve) => {
      Alert.alert('Sign out', 'You will be signed out of this account.', [
        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
        { text: 'Sign out', onPress: () => resolve(true), style: 'destructive' },
      ]);
    });

    if (!didConfirm) {
      return;
    }

    await signOut();
    queryClient.clear();
    router.replace('/(auth)/sign-in');
  };

  const toggleCategorySelection = (category: SettingsCategory) => {
    setCategoryError(null);

    if (selectedCategoryIds.includes(category.id)) {
      if (selectedCategoryIds.length <= MIN_ACTIVE_CATEGORIES) {
        setCategoryError(`Keep at least ${MIN_ACTIVE_CATEGORIES} active categories.`);
        return;
      }

      setSelectedCategoryIds((current) => current.filter((id) => id !== category.id));
      return;
    }

    if (selectedCategoryIds.length >= MAX_ACTIVE_CATEGORIES) {
      setCategoryError(`Keep up to ${MAX_ACTIVE_CATEGORIES} active categories.`);
      return;
    }

    setSelectedCategoryIds((current) => [...current, category.id]);
  };

  if (settingsQuery.isLoading) {
    return <LoadingState message="Loading settings..." />;
  }

  if (settingsQuery.isError && !settingsData) {
    return (
      <Screen>
        <Card style={styles.errorCard}>
          <Text style={styles.cardTitle}>Unable to load settings.</Text>
          <Text style={styles.errorText}>Try again after checking your network.</Text>
          <PrimaryButton label="Retry" onPress={() => void settingsQuery.refetch()} />
          <PrimaryButton label="Home" variant="ghost" onPress={() => router.replace('/(tabs)')} />
        </Card>
      </Screen>
    );
  }

  const categories = settingsData?.categories ?? [];

  return (
    <Screen>
      <View style={styles.scrollContainer}>
        <View style={styles.pageHeader}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Update account details and app preferences.</Text>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Profile identity</Text>
          <FormField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Captain Clarity"
            autoCapitalize="words"
          />
          <FormField
            label="Handle"
            value={handle}
            onChangeText={setHandle}
            placeholder="handle-name"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Emblem</Text>
          <View style={styles.emblemRow}>
            {emblemOptions.map((option) => {
              const isActive = emblemKey === option.key;
              return (
                <PrimaryButton
                  key={option.key}
                  label={option.label}
                  variant={isActive ? 'primary' : 'ghost'}
                  onPress={() => {
                    setEmblemKey(option.key);
                  }}
                  style={[styles.emblemButton, isActive ? styles.emblemButtonActive : undefined]}
                  labelStyle={styles.emblemLabel}
                />
              );
            })}
          </View>

          {profileError ? <Text style={styles.messageError}>{profileError}</Text> : null}
          {profileMessage ? <Text style={styles.messageSuccess}>{profileMessage}</Text> : null}

          <PrimaryButton
            label={saveProfileMutation.isPending ? 'Saving...' : 'Save profile'}
            onPress={handleSaveProfile}
            disabled={saveProfileMutation.isPending || !hasProfileChanges}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceText}>
              <Text style={styles.preferenceLabel}>Haptics feedback</Text>
              <Text style={styles.preferenceMeta}>Use vibrations for confirmed actions.</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ true: colors.accent, false: colors.surfaceVariant }}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceText}>
              <Text style={styles.preferenceLabel}>Reduced motion</Text>
              <Text style={styles.preferenceMeta}>Prefer fewer animations.</Text>
            </View>
            <Switch
              value={reducedMotion}
              onValueChange={setReducedMotion}
              trackColor={{ true: colors.accent, false: colors.surfaceVariant }}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Active categories</Text>
          <Text style={styles.sectionMeta}>
            Select between {MIN_ACTIVE_CATEGORIES} and {MAX_ACTIVE_CATEGORIES} categories.
          </Text>
          <View style={styles.categoryList}>
            {categories.map((category) => {
              const isSelected = selectedCategoryIds.includes(category.id);
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  onPress={() => toggleCategorySelection(category)}
                  style={[styles.categoryButton, categoryButtonStyle(isSelected)]}
                >
                  <Text style={[styles.categoryButtonText, categoryButtonLabelStyle(isSelected)]}>{category.name}</Text>
                  {isSelected ? <Text style={styles.categoryButtonMeta}>{category.totalXp} XP</Text> : null}
                </Pressable>
              );
            })}
          </View>

          {categoryError ? <Text style={styles.messageError}>{categoryError}</Text> : null}
          {categoryMessage ? <Text style={styles.messageSuccess}>{categoryMessage}</Text> : null}

          <PrimaryButton
            label={saveCategoryMutation.isPending ? 'Saving categories...' : 'Save categories'}
            onPress={handleSaveCategories}
            disabled={!canSaveCategories}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Account and privacy</Text>
          <Text style={styles.sectionMeta}>
            Export includes profile settings, progression totals, active categories, and unlocked achievements.
          </Text>
          <Text style={styles.sectionMeta}>Private reflections and full activity notes are not included.</Text>

          {accountError ? <Text style={styles.messageError}>{accountError}</Text> : null}
          {accountMessage ? <Text style={styles.messageSuccess}>{accountMessage}</Text> : null}

          <PrimaryButton
            label={exportMutation.isPending ? 'Preparing export...' : 'Export account data'}
            onPress={handleExport}
            disabled={exportMutation.isPending}
          />
          <PrimaryButton
            label={deleteAccountMutation.isPending ? 'Deleting account...' : 'Delete account'}
            variant="ghost"
            onPress={handleDeleteAccount}
            disabled={deleteAccountMutation.isPending}
            style={styles.deleteButton}
            labelStyle={styles.deleteButtonLabel}
          />
        </Card>

        <PrimaryButton
          label="Sign out"
          variant="ghost"
          onPress={handleSignOut}
          disabled={saveProfileMutation.isPending || saveCategoryMutation.isPending}
        />

        {settingsQuery.isError ? <Text style={styles.errorText}>{toUserMessage(settingsQuery.error)}</Text> : null}
      </View>
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
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emblemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  emblemButton: {
    minWidth: 96,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  emblemButtonActive: {
    borderColor: colors.accent,
  },
  emblemLabel: {
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  preferenceText: {
    flex: 1,
    gap: spacing.xs,
  },
  preferenceLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  preferenceMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryButton: {
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  categoryButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceContainerHigh,
  },
  categoryButtonText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  categoryButtonLabel: {
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  categoryButtonMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  categoryButtonLabelSelected: {
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  deleteButton: {
    borderColor: colors.danger,
  },
  deleteButtonLabel: {
    color: colors.danger,
  },
  messageError: {
    ...typography.label,
    color: colors.warning,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  messageSuccess: {
    ...typography.label,
    color: colors.success,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  errorCard: {
    gap: spacing.md,
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  errorText: {
    ...typography.body,
    color: colors.warning,
    textAlign: 'center',
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});
