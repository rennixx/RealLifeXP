import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable, TextInput } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '@/src/theme/tokens';
import { useOnboardingDraft } from '@/src/features/onboarding/OnboardingDraftContext';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { Screen } from '@/src/components/ui/Screen';

type IdentityForm = {
  displayName: string;
  handle: string;
};

const emblemOptions = [
  { key: 'atlas-default', icon: 'star', label: 'Atlas' },
  { key: 'raven', icon: 'shield-checkmark', label: 'Raven' },
  { key: 'flare', icon: 'flash', label: 'Flare' },
  { key: 'prism', icon: 'sparkles', label: 'Prism' },
  { key: 'cipher', icon: 'lock-closed', label: 'Cipher' },
];

const schema = z.object({
  displayName: z.string().min(1, 'Display name is required.').max(50, 'Display name is too long.'),
  handle: z
    .string()
    .min(3, 'Handle must be at least 3 characters.')
    .max(24, 'Handle is too long.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Use only letters, numbers, and underscore.'),
});

export default function IdentityScreen() {
  const router = useRouter();
  const draft = useOnboardingDraft();
  const { control, watch, handleSubmit } = useForm<IdentityForm>({
    defaultValues: {
      displayName: draft.identity?.displayName ?? '',
      handle: draft.identity?.handle ?? '',
    },
  });

  const displayName = watch('displayName');
  const handle = watch('handle');
  const selectedEmblem = draft.identity?.emblemKey ?? emblemOptions[0].key;

  const canContinue = useMemo(() => {
    const parsed = schema.safeParse({
      displayName,
      handle,
    });

    return parsed.success && Boolean(selectedEmblem);
  }, [displayName, handle, selectedEmblem]);

  const onSubmit = (values: IdentityForm) => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      return;
    }

    draft.setIdentity({
      displayName: parsed.data.displayName.trim(),
      handle: parsed.data.handle.trim().toLowerCase(),
      emblemKey: selectedEmblem,
    });
    router.push('/(onboarding)/categories');
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.step}>Step 1 / 4</Text>
        <Text style={styles.title}>Create Profile</Text>
        <Text style={styles.subtitle}>Start with who you are. Your stats come next.</Text>

        <View style={styles.card}>
          <Ionicons name="person-circle-outline" size={44} color={colors.accent} />
          <View style={styles.previewText}>
            <Text style={styles.previewLabel}>LVL 1 NOVICE</Text>
            <Text style={styles.previewName}>{displayName || 'New User'}</Text>
            <Text style={styles.previewHandle}>@{handle || 'handle'}</Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Controller
            control={control}
            name="displayName"
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>DISPLAY NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Your display name"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="handle"
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={styles.label}>UNIQUE HANDLE</Text>
                <View style={styles.handleInputContainer}>
                  <Text style={styles.handlePrefix}>@</Text>
                  <TextInput
                    style={styles.handleInput}
                    value={value}
                    onChangeText={onChange}
                    placeholder="username"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}
          />

          <Text style={styles.label}>CHOOSE EMBLEM</Text>
          <View style={styles.emblemsRow}>
            {emblemOptions.map((emblem) => {
              const isSelected = selectedEmblem === emblem.key;
              return (
                <Pressable
                  key={emblem.key}
                  onPress={() =>
                    draft.setIdentity({
                      displayName: displayName?.trim() || 'New User',
                      handle: handle?.trim() || 'handle',
                      emblemKey: emblem.key,
                    })
                  }
                  style={[
                    styles.emblemButton,
                    isSelected ? styles.emblemButtonSelected : undefined,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${emblem.label} emblem`}
                >
                  <Ionicons name={emblem.icon as 'star'} size={26} color={colors.textPrimary} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <PrimaryButton
          label="Continue"
          disabled={!canContinue}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  step: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
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
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.md,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  previewText: {
    flex: 1,
  },
  previewLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  previewName: {
    ...typography.title,
    color: colors.textPrimary,
  },
  previewHandle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    color: colors.textPrimary,
    ...typography.body,
    includeFontPadding: false,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceContainer,
    textAlignVertical: 'center',
  },
  handleInputContainer: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 0,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    flexDirection: 'row',
  },
  handlePrefix: {
    paddingLeft: spacing.md,
    ...typography.body,
    color: colors.textSecondary,
  },
  handleInput: {
    flex: 1,
    ...typography.body,
    includeFontPadding: false,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    color: colors.textPrimary,
    textAlignVertical: 'center',
  },
  emblemsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  emblemButton: {
    width: 52,
    height: 52,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
  },
  emblemButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceContainerHigh,
  },
});
