import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';
import { useForm, useWatch } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveTemplate,
  createTemplate,
  fetchTemplateManagementData,
  setTemplateFavorite,
  templateValueForTier,
  type ManagedTemplate,
  type TemplateAttribute,
  type TemplateCategory,
  type TemplateManagementData,
  type TemplatePayload,
  updateTemplate,
  type TemplateXpTier,
} from '@/src/features/templates/templates-service';
import { LoadingState } from '@/src/components/ui/Loading';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { Screen } from '@/src/components/ui/Screen';
import { toUserMessage } from '@/src/lib/errors';
import { colors, spacing, typography } from '@/src/theme/tokens';

const emptyManagementData: TemplateManagementData = {
  categories: [],
  attributesByCategory: {},
  templates: [],
};

const templateSchema = z.object({
  name: z.string().trim().min(1, 'Template name is required.').max(80, 'Name must be 80 characters or fewer.'),
  description: z.string().trim().max(240, 'Description must be 240 characters or fewer.'),
  categoryId: z.string().min(1, 'Choose a category.'),
  attributeId: z.string().min(1, 'Choose an attribute.'),
  xpTier: z.enum(['quick', 'focused', 'challenging', 'milestone', 'major']),
  iconKey: z.string().trim().min(1, 'Icon key is required.').max(60, 'Icon key is too long.'),
  defaultDurationMinutes: z
    .string()
    .trim()
    .max(4)
    .default('')
    .refine((value) => {
      if (value.trim() === '') {
        return true;
      }

      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1 && parsed <= 1440;
    }, 'Duration must be between 1 and 1,440 minutes or left blank.'),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

const xpTierOptions: Array<{ value: TemplateXpTier; label: string }> = [
  { value: 'quick', label: 'Quick' },
  { value: 'focused', label: 'Focused' },
  { value: 'challenging', label: 'Challenging' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'major', label: 'Major' },
];

function defaultFormValues(categoryId = '', attributeId = '') {
  return {
    name: '',
    description: '',
    categoryId,
    attributeId,
    xpTier: 'quick' as TemplateXpTier,
    iconKey: 'star-outline',
    defaultDurationMinutes: '',
  };
}

function sortTemplatesByCategoryAndName(templates: ManagedTemplate[], categories: TemplateCategory[]): ManagedTemplate[] {
  const categoryOrder = new Map(categories.map((category, index) => [category.id, index]));
  return [...templates].sort((left, right) => {
    const leftCategoryOrder = categoryOrder.get(left.categoryId) ?? Number.MAX_SAFE_INTEGER;
    const rightCategoryOrder = categoryOrder.get(right.categoryId) ?? Number.MAX_SAFE_INTEGER;

    if (leftCategoryOrder !== rightCategoryOrder) {
      return leftCategoryOrder - rightCategoryOrder;
    }

    if (left.isFavorite !== right.isFavorite) {
      return left.isFavorite ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

export function TemplatesScreen() {
  const queryClient = useQueryClient();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const {
    control,
    reset,
    setValue,
    handleSubmit,
  } = useForm<TemplateFormValues>({
    defaultValues: defaultFormValues(),
  });

  const selectedCategoryId = useWatch({ control, name: 'categoryId' });
  const selectedAttributeId = useWatch({ control, name: 'attributeId' });
  const selectedName = useWatch({ control, name: 'name' });
  const selectedDescription = useWatch({ control, name: 'description' });
  const selectedXpTier = useWatch({ control, name: 'xpTier' });
  const selectedIconKey = useWatch({ control, name: 'iconKey' });
  const selectedDuration = useWatch({ control, name: 'defaultDurationMinutes' });

  const managementQuery = useQuery({
    queryKey: ['templates', 'management'],
    queryFn: fetchTemplateManagementData,
    staleTime: 60_000,
  });

  const {
    categories,
    attributesByCategory,
    templates,
  } = managementQuery.data ?? emptyManagementData;

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );
  const attributesForCategory: TemplateAttribute[] = attributesByCategory[selectedCategoryId] ?? [];

  const formDefaults = useMemo(() => {
    return defaultFormValues(
      categories[0]?.id ?? '',
      categories[0] ? attributesByCategory[categories[0].id]?.[0]?.id ?? '' : '',
    );
  }, [categories, attributesByCategory]);

  const sortedTemplates = useMemo(
    () => sortTemplatesByCategoryAndName(templates, categories),
    [categories, templates],
  );

  const saveTemplateMutation = useMutation({
    mutationFn: async (payload: TemplatePayload) => {
      if (editingTemplateId) {
        return updateTemplate({ templateId: editingTemplateId, ...payload });
      }

      return createTemplate(payload);
    },
    onSuccess: () => {
      setEditingTemplateId(null);
      reset(formDefaults);
      setErrorMessage(undefined);
      setMessage('Template saved.');
      queryClient.invalidateQueries({ queryKey: ['templates', 'management'] });
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(toUserMessage(error));
    },
  });

  const archiveTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return archiveTemplate(templateId);
    },
    onSuccess: () => {
      setMessage('Template archived.');
      setErrorMessage(undefined);
      setEditingTemplateId(null);
      reset(formDefaults);
      queryClient.invalidateQueries({ queryKey: ['templates', 'management'] });
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(toUserMessage(error));
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ templateId, isFavorite }: { templateId: string; isFavorite: boolean }) => {
      return setTemplateFavorite(templateId, isFavorite);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', 'management'] });
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(toUserMessage(error));
    },
  });

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }

    if (!selectedCategoryId || !categories.some((category) => category.id === selectedCategoryId)) {
      setValue('categoryId', formDefaults.categoryId);
      return;
    }

    if (selectedCategory && attributesForCategory.length === 0) {
      setValue('attributeId', '');
    }
  }, [attributesForCategory.length, categories, selectedCategory, selectedCategoryId, setValue, formDefaults.categoryId]);

  useEffect(() => {
    if (attributesForCategory.length === 0) {
      return;
    }

    if (!selectedAttributeId || !attributesForCategory.some((attribute) => attribute.id === selectedAttributeId)) {
      setValue('attributeId', attributesForCategory[0]!.id);
    }
  }, [attributesForCategory, selectedAttributeId, setValue]);

  useEffect(() => {
    if (!managementQuery.data && !managementQuery.isLoading) {
      reset(formDefaults);
    }
  }, [formDefaults, managementQuery.data, managementQuery.isLoading, reset]);

  const resetToCreate = () => {
    setEditingTemplateId(null);
    reset(formDefaults);
    setMessage(null);
    setErrorMessage(undefined);
  };

  const startEdit = (template: ManagedTemplate) => {
    setEditingTemplateId(template.id);
    setMessage(null);
    setErrorMessage(undefined);
    setValue('categoryId', template.categoryId);
    setValue('attributeId', template.attributeId);
    setValue('name', template.name);
    setValue('description', template.description ?? '');
    setValue('xpTier', template.xpTier);
    setValue('iconKey', template.iconKey);
    setValue(
      'defaultDurationMinutes',
      template.defaultDurationMinutes === null ? '' : String(template.defaultDurationMinutes),
    );
  };

  const archiveTemplateConfirmed = (template: ManagedTemplate) => {
    Alert.alert(
      'Archive template',
      'You can still keep history snapshots, but archived templates won’t appear when logging.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => archiveTemplateMutation.mutate(template.id) },
      ],
    );
  };

  const submit: (values: TemplateFormValues) => void = (values) => {
    const parsed = templateSchema.safeParse(values);
    if (!parsed.success) {
      setErrorMessage(parsed.error.errors[0]?.message ?? 'Invalid template input.');
      return;
    }

    const payload: TemplatePayload = {
      categoryId: parsed.data.categoryId,
      attributeId: parsed.data.attributeId,
      name: parsed.data.name,
      description: parsed.data.description,
      xpTier: parsed.data.xpTier,
      iconKey: parsed.data.iconKey,
      defaultDurationMinutes:
        parsed.data.defaultDurationMinutes.trim() === '' ? undefined : Number(parsed.data.defaultDurationMinutes),
    };

    setMessage(null);
    setErrorMessage(undefined);
    saveTemplateMutation.mutate(payload);
  };

  if (managementQuery.isLoading) {
    return <LoadingState message="Loading templates..." />;
  }

  if (managementQuery.isError) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load templates.</Text>
          <Text style={styles.messageText}>{toUserMessage(managementQuery.error)}</Text>
          <PrimaryButton label="Retry" onPress={() => managementQuery.refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Templates</Text>
          <Text style={styles.subtitle}>Create custom templates and manage your favorites.</Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>
              {editingTemplateId ? 'Edit template' : 'Create template'}
            </Text>
            {editingTemplateId ? (
              <Pressable accessibilityRole="button" onPress={resetToCreate} style={styles.panelAction}>
                <Text style={styles.actionText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={selectedName ?? ''}
              onChangeText={(next) => setValue('name', next)}
              placeholder="e.g., Finish focused study session"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.multiLineInput]}
              value={selectedDescription ?? ''}
              onChangeText={(next) => setValue('description', next)}
              placeholder="Add a short description."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRowWrap}>
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
                  onPress={() => setValue('categoryId', category.id)}
                  style={[styles.chip, selectedCategoryId === category.id ? styles.chipActive : undefined]}
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
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Attribute</Text>
            {attributesForCategory.length > 0 ? (
              <View style={styles.chipRowWrap}>
                {attributesForCategory.map((attribute) => (
                  <Pressable
                    key={attribute.id}
                    accessibilityRole="button"
                    onPress={() => setValue('attributeId', attribute.id)}
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
              <Text style={styles.helpText}>Select a category with attributes.</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>XP tier</Text>
            <View style={styles.chipRowWrap}>
              {xpTierOptions.map((option) => {
                const isSelected = selectedXpTier === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    onPress={() => setValue('xpTier', option.value)}
                    style={[styles.chip, isSelected ? styles.chipActive : undefined]}
                  >
                    <Text style={[styles.chipText, isSelected ? styles.chipTextActive : undefined]}>
                      {option.label} +{templateValueForTier(option.value)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Icon key</Text>
            <TextInput
              style={styles.textInput}
              value={selectedIconKey ?? ''}
              onChangeText={(next) => setValue('iconKey', next)}
              placeholder="e.g., flash"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <Text style={styles.helpText}>Use an icon from Ionicons family.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Default duration (minutes, optional)</Text>
            <TextInput
              style={styles.textInput}
              value={selectedDuration ?? ''}
              onChangeText={(next) => setValue('defaultDurationMinutes', next.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.helpText}>Optional: keep it to a typical duration.</Text>
          </View>

          <PrimaryButton
            label={
              saveTemplateMutation.isPending
                ? 'Saving...'
                : editingTemplateId
                  ? 'Save changes'
                  : 'Create template'
            }
            onPress={handleSubmit(submit)}
            disabled={saveTemplateMutation.isPending}
          />
        </View>

        {message ? <Text style={styles.successText}>{message}</Text> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your templates</Text>
          {sortedTemplates.length === 0 ? (
            <Text style={styles.helpText}>No templates yet. Create your first one above.</Text>
          ) : (
            sortedTemplates.map((template) => {
              const isOwned = template.ownerUserId !== null;
              const isSystem = template.ownerUserId === null;
              const isEditing = editingTemplateId === template.id;

              return (
                <View
                  key={template.id}
                  style={[
                    styles.templateRow,
                    template.isArchived ? styles.templateRowArchived : undefined,
                    isEditing ? styles.templateRowActive : undefined,
                  ]}
                >
                  <View style={styles.templateRowLead}>
                    <View style={styles.templateRowRow}>
                      <Text style={styles.templateName}>{template.name}</Text>
                      <Text style={styles.templateTag}>{template.xpTier}</Text>
                    </View>
                    <Text style={styles.templateMeta}>
                      {template.categoryName} · {template.attributeName}
                    </Text>
                    {template.description ? <Text style={styles.templateMeta}>{template.description}</Text> : null}
                    <Text style={styles.templateMeta}>
                      +{template.xpValue} XP
                      {template.defaultDurationMinutes ? ` · ${template.defaultDurationMinutes}m` : ''}
                      {isSystem ? ' · System template' : ' · Custom template'}
                      {template.isArchived ? ' · Archived' : ''}
                    </Text>
                  </View>
                  <View style={styles.templateActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => favoriteMutation.mutate({ templateId: template.id, isFavorite: !template.isFavorite })}
                      style={styles.iconButton}
                    >
                      <Ionicons
                        name={template.isFavorite ? 'heart' : 'heart-outline'}
                        size={20}
                        color={colors.accent}
                      />
                    </Pressable>
                    {isOwned && !template.isArchived ? (
                      <>
                        <PrimaryButton
                          label="Edit"
                          variant="ghost"
                          onPress={() => startEdit(template)}
                          disabled={isEditing || saveTemplateMutation.isPending || archiveTemplateMutation.isPending}
                        />
                        <PrimaryButton
                          label="Archive"
                          variant="ghost"
                          onPress={() => archiveTemplateConfirmed(template)}
                          disabled={saveTemplateMutation.isPending || archiveTemplateMutation.isPending}
                        />
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
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
  panel: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surfaceContainer,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  panelTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  panelAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  field: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 44,
    includeFontPadding: false,
    ...typography.body,
    textAlignVertical: 'center',
  },
  multiLineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingTop: spacing.xs,
  },
  helpText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  successText: {
    ...typography.body,
    color: colors.success,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
  },
  messageText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  templateRow: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.md,
    gap: spacing.sm,
  },
  templateRowActive: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  templateRowArchived: {
    opacity: 0.7,
    backgroundColor: colors.surfaceContainerHigh,
  },
  templateRowLead: {
    gap: spacing.xs,
  },
  templateRowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  templateName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    flex: 1,
  },
  templateTag: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  templateMeta: {
    ...typography.body,
    color: colors.textSecondary,
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  iconButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    padding: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
