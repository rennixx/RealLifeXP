import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import {
  type ActivityAttribute,
  type ActivityLogContext,
  type ActivityLogResult,
  type ActivityTemplateOption,
  fetchActivityLogContext,
  generateClientRequestId,
  type LogActivityPayload,
} from '@/src/features/activity/activity-service';
import { LoadingState } from '@/src/components/ui/Loading';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { Screen } from '@/src/components/ui/Screen';
import {
  type PendingActivityCommand,
  commandIsDue,
  computeRetryInMinutes,
  discardPendingActivity,
  fetchPendingActivityCommands,
  submitActivityWithOfflineSupport,
  syncQueuedActivityCommands,
} from '@/src/features/activity/activity-queue';
import { toUserMessage } from '@/src/lib/errors';
import { colors, spacing, typography } from '@/src/theme/tokens';

const occurrenceOffsets = [
  { label: 'Now', valueMinutes: 0 },
  { label: '5m', valueMinutes: -5 },
  { label: '15m', valueMinutes: -15 },
  { label: '1h', valueMinutes: -60 },
  { label: '2h', valueMinutes: -120 },
] as const;

const logActivitySchema = z.object({
  durationMinutes: z
    .string()
    .trim()
    .default('')
    .refine((value) => value === '' || /^\d+$/.test(value), {
      message: 'Duration must be a whole number.',
    })
    .refine((value) => {
      if (value === '') {
        return true;
      }
      const numericValue = Number(value);
      return numericValue >= 1 && numericValue <= 1440;
    }, {
      message: 'Duration must be between 1 and 1440 minutes.',
    }),
  note: z.string().trim().max(280, 'Notes are limited to 280 characters.').default(''),
  privateReflection: z.string().trim().max(1000, 'Reflection is limited to 1,000 characters.').default(''),
});

type ActivityLogFormValues = z.infer<typeof logActivitySchema>;

type ActivityTemplateSection = {
  title: string;
  templates: ActivityTemplateOption[];
};

function buildTemplateSections(
  favorites: ActivityTemplateOption[],
  templates: ActivityTemplateOption[],
): ActivityTemplateSection[] {
  if (templates.length === 0) {
    return [];
  }

  return [
    {
      title: 'Favorite Templates',
      templates: favorites,
    },
    {
      title: 'Templates',
      templates,
    },
  ].filter((section) => section.templates.length > 0);
}

function templatePreviewKey(template: ActivityTemplateOption): string {
  return `${template.id}:${template.categoryId}:${template.attributeId}`;
}

function summarizeSuccess(result: ActivityLogResult): string[] {
  const lines: string[] = [];

  if (result.category.oldLevel !== result.category.newLevel) {
    lines.push(`Category level changed to ${result.category.newLevel} (from ${result.category.oldLevel}).`);
  }

  if (result.attribute.oldLevel !== result.attribute.newLevel) {
    lines.push(`Attribute level changed to ${result.attribute.newLevel} (from ${result.attribute.oldLevel}).`);
  }

  if (result.character.oldLevel !== result.character.newLevel) {
    lines.push(`Character level changed to ${result.character.newLevel} (from ${result.character.oldLevel}).`);
  }

  return lines;
}

function byLastUsedOrPopularity(
  templates: ActivityTemplateOption[],
): ActivityTemplateOption[] {
  return [...templates].sort((left, right) => {
    const leftUsed = left.lastUsedAt ? new Date(left.lastUsedAt).getTime() : 0;
    const rightUsed = right.lastUsedAt ? new Date(right.lastUsedAt).getTime() : 0;

    if (leftUsed !== rightUsed) {
      return rightUsed - leftUsed;
    }

    if (left.useCount !== right.useCount) {
      return right.useCount - left.useCount;
    }

    return left.name.localeCompare(right.name);
  });
}

function mapAttributesForCategory(
  attributesByCategory: Record<string, ActivityAttribute[]>,
  categoryId: string,
): ActivityAttribute[] {
  return attributesByCategory[categoryId] ?? [];
}

function normalizeContext(context: ActivityLogContext | undefined) {
  return {
    categories: context?.categories ?? [],
    attributesByCategory: context?.attributesByCategory ?? {},
    templates: context?.templates ?? [],
  };
}

function statusTextForQueuedCommand(command: PendingActivityCommand): string {
  if (command.isPermanentFailure) {
    return `Permanent failure${command.lastError ? ` · ${command.lastError}` : ''}`;
  }

  const retryMinutes = computeRetryInMinutes(command);
  if (retryMinutes === null) {
    return 'Queued';
  }

  if (retryMinutes <= 0) {
    return 'Ready to retry';
  }

  return `Retry in ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}`;
}

export function ActivityLogScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedAttributeId, setSelectedAttributeId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplateMeta, setSelectedTemplateMeta] = useState<ActivityTemplateOption | null>(null);
  const [submittedTemplateMeta, setSubmittedTemplateMeta] = useState<ActivityTemplateOption | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [occurrenceOffsetMinutes, setOccurrenceOffsetMinutes] = useState<number>(0);
  const [submissionError, setSubmissionError] = useState<string | undefined>(undefined);
  const [submissionResult, setSubmissionResult] = useState<ActivityLogResult | null>(null);
  const [queuedSubmissionTemplateMeta, setQueuedSubmissionTemplateMeta] = useState<ActivityTemplateOption | null>(null);
  const [queueSyncStatus, setQueueSyncStatus] = useState<string | null>(null);
  const [clientRequestId, setClientRequestId] = useState<string>(generateClientRequestId());
  const [manualExpanded, setManualExpanded] = useState<boolean>(true);

  const {
    control,
    reset,
    setValue,
    handleSubmit,
  } = useForm<ActivityLogFormValues>({
    defaultValues: {
      durationMinutes: '',
      note: '',
      privateReflection: '',
    },
  });

  const contextQuery = useQuery({
    queryKey: ['activity', 'log-context'],
    queryFn: fetchActivityLogContext,
    staleTime: 60_000,
  });

  const pendingQueueQuery = useQuery({
    queryKey: ['activity', 'pending-activity-commands'],
    queryFn: fetchPendingActivityCommands,
    staleTime: 30_000,
  });

  const templateLookup = useMemo(
    () =>
      new Map(
        (contextQuery.data?.templates ?? []).map((template) => [template.id, template]),
      ),
    [contextQuery.data?.templates],
  );

  const queuedCommands = pendingQueueQuery.data ?? [];
  const pendingQueueCount = queuedCommands.length;
  const hasAutoSyncedPendingQueue = useRef(false);

  const { categories, attributesByCategory, templates } = normalizeContext(contextQuery.data);
  const filteredByCategory = templates.filter((template) => template.categoryId === selectedCategoryId);
  const filteredByAttribute = filteredByCategory.filter(
    (template) => !selectedAttributeId || template.attributeId === selectedAttributeId
  );
  const searchFiltered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return filteredByAttribute;
    }

    return filteredByAttribute.filter((template) =>
      template.name.toLowerCase().includes(term) ||
      template.attributeName.toLowerCase().includes(term) ||
      template.categoryName.toLowerCase().includes(term) ||
      template.categorySlug.toLowerCase().includes(term)
    );
  }, [searchTerm, filteredByAttribute]);

  const availableAttributes = mapAttributesForCategory(attributesByCategory, selectedCategoryId);
  const favorites = byLastUsedOrPopularity(searchFiltered.filter((template) => template.isFavorite));
  const recent = byLastUsedOrPopularity(searchFiltered);
  const sections = buildTemplateSections(favorites, searchFiltered);
  const selectedTemplate = selectedTemplateMeta ?? null;

  useEffect(() => {
    if (!contextQuery.data) {
      return;
    }

    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
      return;
    }

    const chosenCategoryAvailable = categories.some((category) => category.id === selectedCategoryId);
    if (!chosenCategoryAvailable && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
      return;
    }

    if (categories.length === 0) {
      setSelectedCategoryId('');
      setSelectedAttributeId('');
      setSelectedTemplateId('');
      setSelectedTemplateMeta(null);
      return;
    }

    const nextAttributes = mapAttributesForCategory(attributesByCategory, selectedCategoryId);
    if (nextAttributes.length > 0 && !nextAttributes.some((attribute) => attribute.id === selectedAttributeId)) {
      setSelectedAttributeId(nextAttributes[0].id);
      return;
    }

    if (nextAttributes.length === 0) {
      setSelectedAttributeId('');
    }
  }, [categories, contextQuery.data, attributesByCategory, selectedCategoryId, selectedAttributeId]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setSelectedTemplateMeta(null);
      return;
    }

    const nextTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;
    setSelectedTemplateMeta(nextTemplate);
    if (!nextTemplate) {
      setSelectedTemplateId('');
    }
  }, [selectedTemplateId, templates]);

  const syncQueuedMutation = useMutation({
    mutationFn: (options?: { commandIds?: string[]; force?: boolean }) => syncQueuedActivityCommands(options ?? {}),
    onSuccess: async (result) => {
      setQueueSyncStatus(
        result.synced > 0 || result.failed > 0
          ? `Synced ${result.synced}, failed ${result.failed}, pending ${result.remaining}.`
          : null,
      );
      if (result.synced > 0) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['history', 'activities'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['history', 'filter-options'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['progression', 'dashboard'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['progression', 'character'],
            refetchType: 'all',
          }),
        ]);
      }
      await pendingQueueQuery.refetch();
    },
    onError: (error) => {
      setQueueSyncStatus(null);
      setSubmissionError(toUserMessage(error));
    },
  });

  const discardQueuedMutation = useMutation({
    mutationFn: (clientRequestId: string) => discardPendingActivity(clientRequestId),
    onSuccess: async () => {
      setQueueSyncStatus(null);
      await pendingQueueQuery.refetch();
    },
    onError: (error) => {
      setSubmissionError(toUserMessage(error));
    },
  });

  const submitMutation = useMutation({
    mutationFn: (payload: LogActivityPayload) => submitActivityWithOfflineSupport(payload),
    onSuccess: async (outcome) => {
      setQueueSyncStatus(null);
      setSubmissionError(undefined);

      if (outcome.type === 'confirmed') {
        setSubmissionResult(outcome.result);
        setQueuedSubmissionTemplateMeta(null);

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ['activity', 'log-context'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['history', 'filter-options'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['history', 'activities'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['progression', 'dashboard'],
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: ['progression', 'character'],
            refetchType: 'all',
          }),
        ]);
      } else {
        setSubmissionResult(null);
        setQueuedSubmissionTemplateMeta(selectedTemplateMeta);
      }

      setSelectedTemplateId('');
      setSelectedTemplateMeta(null);
      setSearchTerm('');
      setOccurrenceOffsetMinutes(0);
      reset();
      setClientRequestId(generateClientRequestId());

      if (queuedCommands.length > 0) {
        syncQueuedMutation.mutate({ force: false });
      } else {
        await pendingQueueQuery.refetch();
      }

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Keep core flow intact even if the device does not support haptics.
      }
    },
    onError: (error) => {
      setSubmissionResult(null);
      setQueuedSubmissionTemplateMeta(null);
      setSubmissionError(toUserMessage(error));
    },
  });

  useEffect(() => {
    if (hasAutoSyncedPendingQueue.current) {
      return;
    }

    if (pendingQueueCount === 0 || pendingQueueQuery.isLoading || syncQueuedMutation.isPending || discardQueuedMutation.isPending) {
      return;
    }

    hasAutoSyncedPendingQueue.current = true;
    syncQueuedMutation.mutate({ force: false });
  }, [
    pendingQueueCount,
    pendingQueueQuery.isLoading,
    syncQueuedMutation.isPending,
    syncQueuedMutation.mutate,
    discardQueuedMutation.isPending,
  ]);

  const submit: SubmitHandler<ActivityLogFormValues> = (values) => {
    setSubmissionResult(null);
    setQueuedSubmissionTemplateMeta(null);

    if (!selectedTemplate) {
      setSubmissionError('Choose an activity template first.');
      return;
    }

    const validatedValues = logActivitySchema.safeParse(values);
    if (!validatedValues.success) {
      setSubmissionError(validatedValues.error.issues[0]?.message ?? 'Invalid input.');
      return;
    }

    const durationMinutes = validatedValues.data.durationMinutes.trim() === '' ? undefined : Number(validatedValues.data.durationMinutes);
    const occurredAt = new Date(Date.now() + occurrenceOffsetMinutes * 60_000).toISOString();
    const payload: LogActivityPayload = {
      templateId: selectedTemplate.id,
      clientRequestId,
      durationMinutes,
      note: validatedValues.data.note || undefined,
      privateReflection: validatedValues.data.privateReflection || undefined,
      occurredAt,
    };

    setSubmittedTemplateMeta(selectedTemplate);
    setSubmissionError(undefined);
    submitMutation.mutate(payload);
  };

  const formatTemplateName = (command: PendingActivityCommand) =>
    templateLookup.get(command.templateId)?.name ?? command.templateId;

  const resetAllInputs = () => {
    reset();
    setSearchTerm('');
    setOccurrenceOffsetMinutes(0);
    setClientRequestId(generateClientRequestId());
  };

  if (contextQuery.isLoading) {
    return <LoadingState message="Preparing activity log..." />;
  }

  if (contextQuery.isError) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load your activity setup.</Text>
          <Text style={styles.errorMeta}>{toUserMessage(contextQuery.error)}</Text>
          <PrimaryButton label="Retry" onPress={() => contextQuery.refetch()} />
          <PrimaryButton label="Back" variant="ghost" onPress={() => router.replace('/(tabs)')} />
        </View>
      </Screen>
    );
  }

  if (categories.length === 0) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <Text style={styles.title}>Log Activity</Text>
          <Text style={styles.emptyText}>No active categories were found. Complete onboarding first.</Text>
          <PrimaryButton label="Go to home" onPress={() => router.replace('/(tabs)')} />
        </View>
      </Screen>
    );
  }

  return (
      <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/templates')}
            style={styles.manageTemplatesButton}
          >
            <Text style={styles.manageTemplatesText}>Manage templates</Text>
          </Pressable>
          <Text style={styles.title}>Log Activity</Text>
          <Text style={styles.subtitle}>Choose category, attribute, then template, then confirm.</Text>
        </View>

        <View style={styles.chipRow}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              onPress={() => {
                setSelectedCategoryId(category.id);
                setSelectedAttributeId(mapAttributesForCategory(attributesByCategory, category.id)[0]?.id ?? '');
                setSubmissionResult(null);
                setSubmittedTemplateMeta(null);
                setSelectedTemplateId('');
                setValue('durationMinutes', '');
                setValue('note', '');
                setValue('privateReflection', '');
              }}
              style={[
                styles.chip,
                selectedCategoryId === category.id ? styles.chipActive : undefined,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedCategoryId === category.id ? styles.chipTextActive : undefined,
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search templates..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        {availableAttributes.length > 0 ? (
          <View style={styles.chipRowWrap}>
            {availableAttributes.map((attribute) => (
              <Pressable
                key={attribute.id}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedAttributeId(attribute.id);
                  setSubmissionResult(null);
                  setSubmittedTemplateMeta(null);
                  setSelectedTemplateId('');
                  setValue('durationMinutes', '');
                  setValue('note', '');
                  setValue('privateReflection', '');
                }}
                style={[
                  styles.chip,
                  selectedAttributeId === attribute.id ? styles.chipActive : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedAttributeId === attribute.id ? styles.chipTextActive : undefined,
                  ]}
                >
                  {attribute.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.sectionHint}>No attributes in this category yet.</Text>
        )}

        {recent.length > 0 ? (
          <View style={styles.section}>
            {manualExpanded ? (
              <View>
                <Text style={styles.sectionLabel}>Template feed</Text>
                {sections.map((section) => (
                  <View key={section.title} style={styles.templateSection}>
                    <Text style={styles.sectionSubLabel}>{section.title}</Text>
                    {section.templates.map((template) => {
                      const isSelected = selectedTemplateId === template.id;
                      return (
                        <Pressable
                          key={templatePreviewKey(template)}
                          style={[styles.templateRow, isSelected ? styles.templateRowActive : undefined]}
                          accessibilityRole="button"
                          onPress={() => {
                            setSelectedTemplateId(template.id);
                            setSubmissionResult(null);
                            setSubmittedTemplateMeta(null);
                            setSubmissionError(undefined);
                          }}
                        >
                          <View style={styles.templateRowLead}>
                            <Text style={styles.templateName}>{template.name}</Text>
                            <Text style={styles.templateMeta}>
                              {template.categoryName} · {template.attributeName}
                            </Text>
                          </View>
                          <Text style={styles.templateXp}>+{template.xpValue} XP</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => setManualExpanded((current) => !current)}
              style={styles.toggleButton}
            >
              <Text style={styles.toggleText}>
                {manualExpanded ? 'Hide template list' : 'Show template list'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Selected template</Text>
          {selectedTemplate ? (
            <View style={styles.selectedCard}>
              <Text style={styles.selectedName}>{selectedTemplate.name}</Text>
              <Text style={styles.selectedMeta}>
                {selectedTemplate.categoryName} · {selectedTemplate.attributeName} · {selectedTemplate.xpTier.toUpperCase()}
              </Text>
              <Text style={styles.selectedXp}>Award {selectedTemplate.xpValue} XP</Text>
            </View>
          ) : (
            <Text style={styles.sectionHint}>Pick a template to continue.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Time logged</Text>
          <View style={styles.chipRowWrap}>
            {occurrenceOffsets.map((option) => (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                onPress={() => setOccurrenceOffsetMinutes(option.valueMinutes)}
                style={[styles.chip, occurrenceOffsetMinutes === option.valueMinutes ? styles.chipActive : undefined]}
              >
                <Text
                  style={[
                    styles.chipText,
                    occurrenceOffsetMinutes === option.valueMinutes ? styles.chipTextActive : undefined,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Controller
          control={control}
          name="durationMinutes"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Duration (minutes, optional)</Text>
              <TextInput
                style={styles.textField}
                value={value}
                onChangeText={(next) => onChange(next)}
                keyboardType="number-pad"
                placeholder="e.g. 45"
                placeholderTextColor={colors.textMuted}
                maxLength={4}
              />
            </View>
          )}
        />

        <Controller
          control={control}
          name="note"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Note (optional)</Text>
              <TextInput
                style={[styles.textField, styles.multiLineInput]}
                value={value}
                onChangeText={(next) => onChange(next)}
                placeholder="Add context to this log."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.helperText}>{value.length}/280</Text>
            </View>
          )}
        />

        <Controller
          control={control}
          name="privateReflection"
          render={({ field: { onChange, value } }) => (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Private reflection (optional)</Text>
              <TextInput
                style={[styles.textField, styles.multiLineInput]}
                value={value}
                onChangeText={(next) => onChange(next)}
                placeholder="Private context for later review."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
              />
              <Text style={styles.helperText}>{value.length}/1000</Text>
            </View>
          )}
        />

        <PrimaryButton
          label={submitMutation.isPending ? 'Logging…' : 'Confirm and log activity'}
          onPress={handleSubmit(submit)}
          disabled={submitMutation.isPending}
        />

        {submissionError ? <Text style={styles.errorText}>{submissionError}</Text> : null}

        {submissionResult ? (
          <View style={styles.success}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
              <Text style={styles.successTitle}>Activity logged!</Text>
            </View>
            <Text testID="activity-log-success-xp" style={styles.successValue}>
              +{submissionResult.xpAwarded} XP
            </Text>
            <Text style={styles.successSub}>Template: {submittedTemplateMeta?.name ?? 'template'}</Text>
            {summarizeSuccess(submissionResult).map((line) => (
              <Text key={line} style={styles.successLine}>
                {line}
              </Text>
            ))}
            {submissionResult.unlockedAchievements.length > 0 ? (
              <Text style={styles.successLine}>
                Unlocked {submissionResult.unlockedAchievements.join(', ')}
              </Text>
            ) : null}
            {submissionResult.unlockedTitles.length > 0 ? (
              <Text style={styles.successLine}>
                Unlocked titles: {submissionResult.unlockedTitles.join(', ')}
              </Text>
            ) : null}
            <View style={styles.successActions}>
              <PrimaryButton
                label="Log another activity"
                variant="ghost"
                onPress={() => {
                  setSubmissionResult(null);
                  setSubmittedTemplateMeta(null);
                  resetAllInputs();
                }}
              />
              <PrimaryButton
                label="Dismiss"
                variant="ghost"
                onPress={() => {
                  setSubmissionResult(null);
                  setSubmittedTemplateMeta(null);
                }}
              />
            </View>
          </View>
        ) : null}

        {queuedSubmissionTemplateMeta ? (
          <View style={styles.warning}>
            <View style={styles.successHeader}>
              <Ionicons name="cloud-offline-outline" size={24} color={colors.warning} />
              <Text style={styles.successTitle}>Activity queued</Text>
            </View>
            <Text style={styles.successSub}>Template: {queuedSubmissionTemplateMeta.name}</Text>
            <Text style={styles.successLine}>Saved for retry when connection is available.</Text>
            <View style={styles.successActions}>
              <PrimaryButton
                label="Dismiss"
                variant="ghost"
                onPress={() => {
                  setQueuedSubmissionTemplateMeta(null);
                }}
              />
            </View>
          </View>
        ) : null}

        {pendingQueueCount > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Queued activity logs</Text>
              <Text style={styles.sectionHint}>{pendingQueueCount} pending</Text>
            </View>
            {queueSyncStatus ? <Text style={styles.warningText}>{queueSyncStatus}</Text> : null}
            <View style={styles.pendingSection}>
              <PrimaryButton
                label={syncQueuedMutation.isPending ? 'Syncing…' : 'Sync queued'}
                onPress={() => syncQueuedMutation.mutate({ force: false })}
                disabled={syncQueuedMutation.isPending || discardQueuedMutation.isPending}
              />
              {queuedCommands.map((command) => {
                const commandTemplateName = formatTemplateName(command);
                const isDue = commandIsDue(command);

                return (
                  <View key={command.clientRequestId} style={styles.pendingItem}>
                    <Text style={styles.pendingName}>{commandTemplateName}</Text>
                    <Text style={styles.pendingMeta}>{statusTextForQueuedCommand(command)}</Text>
                    <View style={styles.pendingActions}>
                      <PrimaryButton
                        label={isDue ? 'Retry now' : 'Retry later'}
                        variant="ghost"
                        onPress={() => syncQueuedMutation.mutate({
                          commandIds: [command.clientRequestId],
                          force: true,
                        })}
                        disabled={syncQueuedMutation.isPending || discardQueuedMutation.isPending}
                      />
                      <PrimaryButton
                        label="Discard"
                        variant="ghost"
                        onPress={() => discardQueuedMutation.mutate(command.clientRequestId)}
                        disabled={discardQueuedMutation.isPending || syncQueuedMutation.isPending}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: 0,
    gap: spacing.lg,
  },
  header: {
    marginBottom: spacing.sm,
  },
  manageTemplatesButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 0,
    marginBottom: spacing.xs,
  },
  manageTemplatesText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sectionSubLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  chip: {
    minHeight: 44,
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
  },
  chipTextActive: {
    color: colors.textPrimary,
  },
  sectionHint: {
    ...typography.body,
    color: colors.textMuted,
  },
  templateSection: {
    gap: spacing.xs,
  },
  templateRow: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 0,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  templateRowActive: {
    borderColor: colors.accent,
  },
  templateRowLead: {
    flex: 1,
    gap: spacing.xs,
  },
  templateName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  templateMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  templateXp: {
    ...typography.body,
    color: colors.accent,
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  toggleText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  selectedCard: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 0,
    padding: spacing.md,
    gap: spacing.sm,
  },
  selectedName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  selectedMeta: {
    ...typography.body,
    color: colors.textSecondary,
  },
  selectedXp: {
    ...typography.body,
    color: colors.accent,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  textField: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    color: colors.textPrimary,
    ...typography.body,
    includeFontPadding: false,
    backgroundColor: colors.surfaceContainer,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    textAlignVertical: 'center',
  },
  multiLineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingTop: spacing.xs,
    includeFontPadding: false,
  },
  helperText: {
    ...typography.label,
    color: colors.textMuted,
    alignSelf: 'flex-end',
  },
  success: {
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 0,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    gap: spacing.sm,
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  successTitle: {
    ...typography.bodyLarge,
    color: colors.success,
  },
  successValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  successSub: {
    ...typography.body,
    color: colors.textSecondary,
  },
  successLine: {
    ...typography.body,
    color: colors.textPrimary,
  },
  successActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  warning: {
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 0,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    gap: spacing.sm,
  },
  warningText: {
    ...typography.caption,
    color: colors.warning,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  errorMeta: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    color: colors.textPrimary,
    ...typography.body,
    backgroundColor: colors.surfaceContainer,
    includeFontPadding: false,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    minHeight: 44,
    textAlignVertical: 'center',
  },
  pendingSection: {
    gap: spacing.sm,
  },
  pendingItem: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 0,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pendingName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  pendingMeta: {
    ...typography.label,
    color: colors.textSecondary,
  },
  pendingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
