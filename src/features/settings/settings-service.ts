import { getSupabaseClient } from '@/src/lib/supabase';
import { AppError, AppErrorCode } from '@/src/lib/errors';

import type { PostgrestError } from '@supabase/supabase-js';

export type ProfileSettings = {
  id: string;
  displayName: string;
  handle: string;
  emblemKey: string;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
};

export type SettingsCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconKey: string;
  colorToken: string;
  isSelected: boolean;
  sortOrder: number;
  totalXp: number;
  currentLevel: number;
};

export type SettingsData = {
  profile: ProfileSettings;
  categories: SettingsCategory[];
  selectedCategoryIds: string[];
};

export type AccountExportCategory = {
  id: string;
  name: string;
  slug: string;
  colorToken: string;
  iconKey: string;
  sortOrder: number;
  totalXp: number;
  currentLevel: number;
};

export type AccountExportAchievement = {
  id: string;
  name: string;
  slug: string;
  description: string;
  unlockedAt: string;
};

export type AccountExportData = {
  exportedAt: string;
  account: {
    displayName: string;
    handle: string;
    emblemKey: string;
    hapticsEnabled: boolean;
    reducedMotion: boolean;
    createdAt: string;
  };
  progression: {
    totalXp: number;
    characterLevel: number;
    activityCount: number;
    achievementCount: number;
    distinctActiveDays: number;
  };
  categories: AccountExportCategory[];
  achievements: AccountExportAchievement[];
};

export type ProfileSettingsUpdate = Partial<{
  displayName: string;
  handle: string;
  emblemKey: string;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
}>;

type RawJoin<T> = T | T[] | null;

type ProfileRow = {
  id: string;
  display_name: string;
  handle: string;
  emblem_key: string;
  haptics_enabled: boolean;
  reduced_motion: boolean;
  created_at: string;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_key: string;
  color_token: string;
  sort_order: number | string | null;
};

type UserCategoryRow = {
  category_id: string;
  is_selected: boolean;
  sort_order: number | string | null;
  total_xp: number | string | null;
  current_level: number | string | null;
};

type ProgressRow = {
  total_xp: number | string | null;
  current_level: number | string | null;
  activity_count: number | string | null;
  achievement_count: number | string | null;
  distinct_active_days: number | string | null;
};

type ExportCategoryRow = {
  category_id: string;
  sort_order: number | string | null;
  total_xp: number | string | null;
  current_level: number | string | null;
  categories: RawJoin<{
    id: string;
    name: string;
    slug: string;
    color_token: string;
    icon_key: string;
  }>;
};

type ExportAchievementRow = {
  unlocked_at: string | null;
  achievements: RawJoin<{
    id: string;
    name: string;
    slug: string;
    description: string;
  }>;
};

type DeleteAccountResponse = {
  ok: boolean;
  status?: 'deleted' | 'already_deleted';
  message?: string;
};

const MIN_ACTIVE_CATEGORIES = 3;
const MAX_ACTIVE_CATEGORIES = 6;

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function normalizeCategoryIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const normalized = ids
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id.length > 0);

  const ordered: string[] = [];
  for (const id of normalized) {
    if (!seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }

  return ordered;
}

function assertActiveSession(sessionUserId?: string | null): string {
  if (!sessionUserId) {
    throw new AppError(AppErrorCode.AuthError, 'You must be signed in to access settings.');
  }

  return sessionUserId;
}

function parsePostgrestError(error: PostgrestError): never {
  if (error.code === '23505') {
    throw new AppError(AppErrorCode.ValidationError, 'That handle is already taken.');
  }

  if (error.code === '23514' && error.message.includes('active category')) {
    throw new AppError(AppErrorCode.ValidationError, `You must select between ${MIN_ACTIVE_CATEGORIES} and ${MAX_ACTIVE_CATEGORIES} categories.`);
  }

  if (error.message.includes('foreign key') || error.message.includes('violates row-level security')) {
    throw new AppError(AppErrorCode.AuthorizationError, 'You do not have permission for this change.');
  }

  throw new AppError(AppErrorCode.NetworkError, 'Unable to save settings right now.', {
    cause: error.message,
  });
}

function parseFunctionError(error: { message?: string }): never {
  const message = error.message?.toLowerCase() ?? '';

  if (message.includes('unauthorized') || message.includes('unauthenticated') || message.includes('auth required')) {
    throw new AppError(AppErrorCode.AuthError, 'You must sign in again to delete this account.');
  }

  if (message.includes('already deleted') || message.includes('user not found')) {
    return;
  }

  if (message.includes('network') || message.includes('failed to fetch')) {
    throw new AppError(AppErrorCode.NetworkError, 'Network issue. Check your connection and retry.');
  }

  throw new AppError(AppErrorCode.ServerError, 'Unable to process account deletion request.', {
    cause: error.message,
  });
}

function parseDeleteAccountResponse(response: DeleteAccountResponse | null): void {
  if (!response) {
    return;
  }

  if (!response.ok) {
    throw new AppError(AppErrorCode.ServerError, response.message ?? 'Unable to delete account.');
  }
}

function assertCategorySelectionCount(selectedCategoryIds: string[]): void {
  if (selectedCategoryIds.length < MIN_ACTIVE_CATEGORIES || selectedCategoryIds.length > MAX_ACTIVE_CATEGORIES) {
    throw new AppError(
      AppErrorCode.ValidationError,
      `Choose between ${MIN_ACTIVE_CATEGORIES} and ${MAX_ACTIVE_CATEGORIES} active categories.`,
    );
  }
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function mapProfileSettings(row: {
  id: string;
  display_name: string;
  handle: string;
  emblem_key: string;
  haptics_enabled: boolean;
  reduced_motion: boolean;
}): ProfileSettings {
  return {
    id: row.id,
    displayName: row.display_name,
    handle: row.handle,
    emblemKey: row.emblem_key,
    hapticsEnabled: row.haptics_enabled,
    reducedMotion: row.reduced_motion,
  };
}

function mapSettingsCategory(
  row: CategoryRow,
  userCategoryById: Map<string, UserCategoryRow>,
): SettingsCategory {
  const selected = userCategoryById.get(row.id);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    iconKey: row.icon_key,
    colorToken: row.color_token,
    isSelected: selected?.is_selected ?? false,
    sortOrder: parseNumber(selected?.sort_order, parseNumber(row.sort_order, 0)),
    totalXp: parseNumber(selected?.total_xp, 0),
    currentLevel: Math.max(1, parseNumber(selected?.current_level, 1)),
  };
}

function buildSettingsFromRows(
  profileRow: ProfileRow,
  categories: CategoryRow[],
  userCategories: UserCategoryRow[],
): SettingsData {
  const userCategoryById = new Map<string, UserCategoryRow>(userCategories.map((row) => [row.category_id, row]));

  const sortedCategories = categories
    .map((row) => mapSettingsCategory(row, userCategoryById))
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.name.localeCompare(right.name);
    });

  const selectedCategoryIds = sortedCategories
    .filter((category) => category.isSelected)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((category) => category.id);

  return {
    profile: mapProfileSettings(profileRow),
    categories: sortedCategories,
    selectedCategoryIds,
  };
}

function buildUpdatePayload(changes: ProfileSettingsUpdate) {
  const payload: {
    display_name?: string;
    handle?: string;
    emblem_key?: string;
    haptics_enabled?: boolean;
    reduced_motion?: boolean;
  } = {};

  if (changes.displayName !== undefined) {
    payload.display_name = changes.displayName.trim();
  }

  if (changes.handle !== undefined) {
    payload.handle = changes.handle.trim().replace(/^@/, '').toLowerCase();
  }

  if (changes.emblemKey !== undefined) {
    payload.emblem_key = changes.emblemKey;
  }

  if (changes.hapticsEnabled !== undefined) {
    payload.haptics_enabled = changes.hapticsEnabled;
  }

  if (changes.reducedMotion !== undefined) {
    payload.reduced_motion = changes.reducedMotion;
  }

  return payload;
}

async function getActiveUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load your session.', { cause: sessionError.message });
  }

  return assertActiveSession(session?.user?.id);
}

export async function fetchProfileSettings(): Promise<ProfileSettings> {
  const { profile } = await fetchSettingsData();
  return profile;
}

export async function fetchSettingsData(): Promise<SettingsData> {
  const supabase = getSupabaseClient();
  const userId = await getActiveUserId();

  const [profileResult, categoryResult, userCategoryResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, handle, emblem_key, haptics_enabled, reduced_motion, created_at')
      .eq('id', userId)
      .single() as Promise<{
        data: ProfileRow | null;
        error: PostgrestError | null;
      }>,
    supabase
      .from('categories')
      .select('id, slug, name, description, icon_key, color_token, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('name') as Promise<{
        data: CategoryRow[] | null;
        error: PostgrestError | null;
      }>,
    supabase
      .from('user_categories')
      .select('category_id, is_selected, sort_order, total_xp, current_level')
      .eq('user_id', userId)
      .order('sort_order') as Promise<{
        data: UserCategoryRow[] | null;
        error: PostgrestError | null;
      }>,
  ]);

  if (profileResult.error) {
    if (profileResult.error.code === 'PGRST116') {
      throw new AppError(AppErrorCode.ValidationError, 'Profile not found. Complete onboarding first.');
    }

    throw new AppError(AppErrorCode.NetworkError, 'Unable to load profile settings.', {
      cause: profileResult.error.message,
    });
  }

  if (categoryResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load category list.', {
      cause: categoryResult.error.message,
    });
  }

  if (userCategoryResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load your active categories.', {
      cause: userCategoryResult.error.message,
    });
  }

  const profile = profileResult.data;
  if (!profile) {
    throw new AppError(AppErrorCode.ValidationError, 'Profile not found. Complete onboarding first.');
  }

  return buildSettingsFromRows(profile, categoryResult.data ?? [], userCategoryResult.data ?? []);
}

export async function updateProfileSettings(updates: ProfileSettingsUpdate): Promise<ProfileSettings> {
  const payload = buildUpdatePayload(updates);
  if (Object.keys(payload).length === 0) {
    return fetchProfileSettings();
  }

  const supabase = getSupabaseClient();
  const userId = await getActiveUserId();

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('id, display_name, handle, emblem_key, haptics_enabled, reduced_motion')
    .single();

  if (error) {
    parsePostgrestError(error);
  }

  if (!data) {
    throw new AppError(AppErrorCode.ServerError, 'Profile update returned no data.');
  }

  return mapProfileSettings(data);
}

export async function updateProfileCategorySelections(categoryIds: string[]): Promise<SettingsData> {
  const normalizedCategoryIds = normalizeCategoryIds(categoryIds);
  assertCategorySelectionCount(normalizedCategoryIds);

  const supabase = getSupabaseClient();
  const userId = await getActiveUserId();

  const selectedSet = new Set(normalizedCategoryIds);
  const categoryOrderById = new Map<string, number>();
  normalizedCategoryIds.forEach((categoryId, index) => {
    categoryOrderById.set(categoryId, index + 1);
  });

  const { data: categoryRows, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('is_active', true)
    .order('sort_order')
    .order('name') as { data: { id: string }[] | null; error: PostgrestError | null };

  if (categoryError) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to validate categories.', { cause: categoryError.message });
  }

  const validIds = (categoryRows ?? []).map((row) => row.id).filter((id) => id);
  const validIdsSet = new Set(validIds);

  const hasInvalidCategory = normalizedCategoryIds.some((categoryId) => !validIdsSet.has(categoryId));
  if (hasInvalidCategory) {
    throw new AppError(AppErrorCode.ValidationError, `Select between ${MIN_ACTIVE_CATEGORIES} and ${MAX_ACTIVE_CATEGORIES} active categories.`);
  }

  const rowsToUpsert = validIds.map((categoryId) => ({
    user_id: userId,
    category_id: categoryId,
    is_selected: selectedSet.has(categoryId),
    sort_order: selectedSet.has(categoryId) ? (categoryOrderById.get(categoryId) ?? 0) : 0,
  }));

  const { error: upsertError } = await supabase
    .from('user_categories')
    .upsert(rowsToUpsert, { onConflict: 'user_id,category_id' });

  if (upsertError) {
    parsePostgrestError(upsertError);
  }

  return fetchSettingsData();
}

export async function fetchAccountExportData(): Promise<AccountExportData> {
  const supabase = getSupabaseClient();
  const userId = await getActiveUserId();

  const [profileResult, progressResult, categoryResult, achievementResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, handle, emblem_key, haptics_enabled, reduced_motion, created_at')
      .eq('id', userId)
      .maybeSingle() as Promise<{
        data: ProfileRow | null;
        error: PostgrestError | null;
      }>,
    supabase
      .from('profile_progress')
      .select('total_xp, current_level, activity_count, achievement_count, distinct_active_days')
      .eq('user_id', userId)
      .maybeSingle() as Promise<{
        data: ProgressRow | null;
        error: PostgrestError | null;
      }>,
    supabase
      .from('user_categories')
      .select(
        `
        category_id,
        sort_order,
        total_xp,
        current_level,
        categories:categories!inner(id, name, slug, color_token, icon_key)
        `,
      )
      .eq('user_id', userId)
      .eq('is_selected', true)
      .order('sort_order')
      .order('category_id') as Promise<{
        data: ExportCategoryRow[] | null;
        error: PostgrestError | null;
      }>,
    supabase
      .from('user_achievements')
      .select('unlocked_at, achievements:achievements!inner(id, name, slug, description)')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false }) as Promise<{
        data: ExportAchievementRow[] | null;
        error: PostgrestError | null;
      }>,
  ]);

  if (profileResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load export profile details.', {
      cause: profileResult.error.message,
    });
  }

  if (progressResult.error && progressResult.error.code !== 'PGRST116') {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load progression summary for export.', {
      cause: progressResult.error.message,
    });
  }

  if (categoryResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load category selections for export.', {
      cause: categoryResult.error.message,
    });
  }

  if (achievementResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load achievements for export.', {
      cause: achievementResult.error.message,
    });
  }

  const profile = profileResult.data;
  if (!profile) {
    throw new AppError(AppErrorCode.ValidationError, 'Profile not found. Complete onboarding first.');
  }

  const progress = progressResult.data;
  const selectedCategories = (categoryResult.data ?? []).map((row) => {
    const category = firstOrNull(row.categories);
    return {
      id: row.category_id,
      name: category?.name ?? 'Unknown',
      slug: category?.slug ?? 'category',
      colorToken: category?.color_token ?? 'accent',
      iconKey: category?.icon_key ?? 'apps-outline',
      sortOrder: parseNumber(row.sort_order, 0),
      totalXp: parseNumber(row.total_xp, 0),
      currentLevel: Math.max(1, parseNumber(row.current_level, 1)),
    };
  });

  const achievements = (achievementResult.data ?? [])
    .map((achievement) => {
      const row = firstOrNull(achievement.achievements);
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        unlockedAt: achievement.unlocked_at ?? new Date(0).toISOString(),
      };
    })
    .filter((entry): entry is AccountExportAchievement => entry !== null);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      displayName: profile.display_name ?? '',
      handle: profile.handle ?? '',
      emblemKey: profile.emblem_key ?? 'atlas-default',
      hapticsEnabled: profile.haptics_enabled ?? true,
      reducedMotion: profile.reduced_motion ?? false,
      createdAt: profile.created_at ?? new Date(0).toISOString(),
    },
    progression: {
      totalXp: parseNumber(progress?.total_xp, 0),
      characterLevel: parseNumber(progress?.current_level, 1),
      activityCount: parseNumber(progress?.activity_count, 0),
      achievementCount: parseNumber(progress?.achievement_count, 0),
      distinctActiveDays: parseNumber(progress?.distinct_active_days, 0),
    },
    categories: selectedCategories,
    achievements,
  };
}

export async function requestAccountDeletion(): Promise<void> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to start account deletion.', {
      cause: sessionError.message,
    });
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new AppError(AppErrorCode.AuthError, 'You must sign in again to delete your account.');
  }

  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    parseFunctionError(error as { message?: string });
  }

  parseDeleteAccountResponse((data ?? null) as DeleteAccountResponse | null);
}
