import { AppError, AppErrorCode } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

type UserCategoryLevelRow = {
  level: number | string | null;
  cumulative_xp: number | string | null;
  required_for_next_level: number | string | null;
};

type ProfileRow = {
  id: string;
  display_name: string;
  handle: string;
  emblem_key: string;
  equipped_title_id: string | null;
};

type ProfileProgressRow = {
  total_xp: number | string | null;
  current_level: number | string | null;
  activity_count: number | string | null;
  achievement_count: number | string | null;
  distinct_active_days: number | string | null;
};

type TitleRow = {
  id: string;
  name: string;
  slug: string;
  rarity: string | null;
};

type DashboardCategoryRow = {
  category_id: string;
  total_xp: number | string | null;
  current_level: number | string | null;
  sort_order: number | string | null;
  categories:
    | {
        id: string;
        name: string;
        slug: string;
        color_token: string;
        icon_key: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
        color_token: string;
        icon_key: string;
      }[];
};

type CharacterAttributeRow = {
  attribute_id: string;
  total_xp: number | string | null;
  current_level: number | string | null;
  attributes:
    | {
        id: string;
        name: string;
        category_id: string;
        icon_key: string;
        categories:
          | {
              id: string;
              name: string;
              slug: string;
              color_token: string;
            }
          | {
              id: string;
              name: string;
              slug: string;
              color_token: string;
            }[];
      }
    | {
        id: string;
        name: string;
        category_id: string;
        icon_key: string;
        categories:
          | {
              id: string;
              name: string;
              slug: string;
              color_token: string;
            }
          | {
              id: string;
              name: string;
              slug: string;
              color_token: string;
            };
      }[];
};

type RecentActivityRow = {
  id: string;
  template_name_snapshot: string;
  xp_value_snapshot: number | string | null;
  xp_tier_snapshot: string | null;
  occurred_at: string;
  categories:
    | {
        name: string;
      }
    | { name: string }[]
    | null;
  attributes:
    | {
        name: string;
      }
    | { name: string }[]
    | null;
};

export type ProgressBarSnapshot = {
  level: number;
  totalXp: number;
  xpInCurrentLevel: number;
  xpToNext: number;
  xpRequiredForNext: number;
  progressPercent: number;
};

export type DashboardProfile = {
  userId: string;
  displayName: string;
  handle: string;
  emblemKey: string;
  titleName: string | null;
  titleSlug: string | null;
  titleRarity: string | null;
  totalXp: number;
  level: number;
  activityCount: number;
  achievementCount: number;
  distinctActiveDays: number;
  progress: ProgressBarSnapshot;
};

export type DashboardCategory = {
  id: string;
  name: string;
  slug: string;
  colorToken: string;
  iconKey: string;
  totalXp: number;
  level: number;
  sortOrder: number;
  progress: ProgressBarSnapshot;
};

export type DashboardRecentActivity = {
  id: string;
  templateName: string;
  categoryName: string;
  attributeName: string;
  xpAwarded: number;
  xpTier: string;
  occurredAt: string;
};

export type DashboardSummary = {
  character: DashboardProfile;
  categories: DashboardCategory[];
  recentActivities: DashboardRecentActivity[];
};

export type CharacterAttribute = {
  id: string;
  name: string;
  categoryName: string;
  categoryColorToken: string;
  iconKey: string;
  totalXp: number;
  level: number;
  progress: ProgressBarSnapshot;
};

export type CharacterSummary = {
  character: DashboardProfile;
  categories: DashboardCategory[];
  topAttributes: CharacterAttribute[];
};

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

function normalizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function asInteger(value: unknown, fallback = 0): number {
  return Math.max(0, Math.floor(parseNumber(value, fallback)));
}

export function buildProgress(levelValue: unknown, totalXpValue: unknown, thresholdMap: Map<number, UserCategoryLevelRow>): ProgressBarSnapshot {
  const level = Math.max(asInteger(levelValue, 1), 1);
  const totalXp = Math.max(asInteger(totalXpValue, 0), 0);
  const threshold = thresholdMap.get(level);
  const levelStartXp = parseNumber(threshold?.cumulative_xp, 0);
  const required = parseNumber(threshold?.required_for_next_level, 0);
  const xpInCurrentLevel = Math.max(0, totalXp - levelStartXp);
  const xpRequiredForNext = Math.max(required, 0);
  const xpToNext = xpRequiredForNext > 0 ? Math.max(xpRequiredForNext - xpInCurrentLevel, 0) : 0;
  const progressPercent = xpRequiredForNext > 0
    ? Math.max(0, Math.min((xpInCurrentLevel / xpRequiredForNext) * 100, 100))
    : 0;

  return {
    level,
    totalXp,
    xpInCurrentLevel,
    xpToNext,
    xpRequiredForNext,
    progressPercent,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new AppError(
      AppErrorCode.NetworkError,
      'Could not load authentication session.',
      { cause: error.message }
    );
  }

  if (!session?.user?.id) {
    throw new AppError(AppErrorCode.AuthError, 'You must sign in to view progression.');
  }

  return session.user.id;
}

async function fetchThresholds(levels: Set<number>): Promise<Map<number, UserCategoryLevelRow>> {
  const normalizedLevels = Array.from(levels).filter((level) => level >= 1 && Number.isFinite(level));

  if (normalizedLevels.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('level_thresholds')
    .select('level, cumulative_xp, required_for_next_level')
    .in('level', normalizedLevels);

  if (error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load level thresholds.', {
      cause: error.message,
    });
  }

  return new Map((data ?? []).map((row) => [asInteger(row.level), row]));
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();

  const [profileResult, progressResult, categoriesResult, recentResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, handle, emblem_key, equipped_title_id')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('profile_progress')
      .select('total_xp, current_level, activity_count, achievement_count, distinct_active_days')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_categories')
      .select(
        `
          category_id,
          total_xp,
          current_level,
          sort_order,
          categories:categories!inner(id, name, slug, color_token, icon_key)
        `
      )
      .eq('user_id', userId)
      .eq('is_selected', true)
      .order('sort_order')
      .order('category_id'),
    supabase
      .from('activity_logs')
      .select(
        `
          id,
          template_name_snapshot,
          xp_value_snapshot,
          xp_tier_snapshot,
          occurred_at,
          categories:categories(name),
          attributes:attributes(name)
        `
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('occurred_at', { ascending: false })
      .limit(4),
  ]);

  if (profileResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load character profile.', {
      cause: profileResult.error.message,
    });
  }

  if (progressResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load character progression.', {
      cause: progressResult.error.message,
    });
  }

  if (categoriesResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load active categories.', {
      cause: categoriesResult.error.message,
    });
  }

  if (recentResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load recent activity.', {
      cause: recentResult.error.message,
    });
  }

  const profile = profileResult.data as ProfileRow | null;

  if (!profile) {
    throw new AppError(AppErrorCode.AuthError, 'Profile not found for this session.');
  }

  const profileProgress = progressResult.data as ProfileProgressRow | null;
  const levelSet = new Set<number>();
  const profileLevel = asInteger(profileProgress?.current_level, 1);
  levelSet.add(profileLevel);

  const categoryRows = (categoriesResult.data ?? []) as DashboardCategoryRow[];
  categoryRows.forEach((row) => {
    levelSet.add(asInteger(row.current_level, 1));
  });

  const thresholdByLevel = await fetchThresholds(levelSet);

  const characterTitle = await (async () => {
    if (!profile.equipped_title_id) {
      return null;
    }

    const { data: titleRow, error: titleError } = await supabase
      .from('titles')
      .select('id, name, slug, rarity')
      .eq('id', profile.equipped_title_id)
      .maybeSingle();

    if (titleError) {
      throw new AppError(AppErrorCode.NetworkError, 'Unable to load equipped title.', {
        cause: titleError.message,
      });
    }

    return titleRow as TitleRow | null;
  })();

  const character: DashboardProfile = {
    userId: profile.id,
    displayName: profile.display_name,
    handle: profile.handle,
    emblemKey: profile.emblem_key,
    titleName: characterTitle?.name ?? null,
    titleSlug: characterTitle?.slug ?? null,
    titleRarity: characterTitle?.rarity ?? null,
    totalXp: parseNumber(profileProgress?.total_xp, 0),
    level: profileLevel,
    activityCount: parseNumber(profileProgress?.activity_count, 0),
    achievementCount: parseNumber(profileProgress?.achievement_count, 0),
    distinctActiveDays: parseNumber(profileProgress?.distinct_active_days, 0),
    progress: buildProgress(profileLevel, profileProgress?.total_xp, thresholdByLevel),
  };

  const categories = categoryRows.map((row) => {
    const category = firstOrNull(row.categories);
    const level = asInteger(row.current_level, 1);
    return {
      id: row.category_id,
      name: category?.name ?? 'Category',
      slug: category?.slug ?? 'category',
      colorToken: category?.color_token ?? 'accent',
      iconKey: category?.icon_key ?? 'apps-outline',
      totalXp: parseNumber(row.total_xp, 0),
      level,
      sortOrder: asInteger(row.sort_order, 0),
      progress: buildProgress(level, row.total_xp, thresholdByLevel),
    };
  });

  const recentActivityRows = (recentResult.data ?? []) as RecentActivityRow[];
  const recentActivities: DashboardRecentActivity[] = recentActivityRows.map((row) => {
    const category = firstOrNull(row.categories);
    const attribute = firstOrNull(row.attributes);
    return {
      id: row.id,
      templateName: normalizeText(row.template_name_snapshot, 'Activity'),
      categoryName: normalizeText(category?.name, 'Category'),
      attributeName: normalizeText(attribute?.name, 'Attribute'),
      xpAwarded: parseNumber(row.xp_value_snapshot, 0),
      xpTier: normalizeText(row.xp_tier_snapshot, 'quick'),
      occurredAt: normalizeText(row.occurred_at, ''),
    };
  });

  return {
    character,
    categories,
    recentActivities,
  };
}

export async function fetchCharacterSummary(): Promise<CharacterSummary> {
  const summary = await fetchDashboardSummary();
  const userId = summary.character.userId;
  const supabase = getSupabaseClient();

  const { data: attributeRows, error: attributeError } = (await supabase
    .from('user_attributes')
    .select(
      `
      attribute_id,
      total_xp,
      current_level,
      attributes:attributes!inner(
        id,
        name,
        icon_key,
        categories:categories!inner(id, name, slug, color_token)
      )
      `
    )
    .eq('user_id', userId)
    .gt('total_xp', 0)
    .order('total_xp', { ascending: false })
    .limit(6)) as { data: CharacterAttributeRow[] | null; error: { message: string } | null };

  if (attributeError) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load strongest attributes.', {
      cause: attributeError.message,
    });
  }

  const levels = new Set<number>([summary.character.level, ...summary.categories.map((category) => category.level)]);
  (attributeRows ?? []).forEach((row) => {
    levels.add(asInteger(row.current_level, 1));
  });

  const thresholdByLevel = await fetchThresholds(levels);

  const topAttributes: CharacterAttribute[] = (attributeRows ?? []).map((row) => {
    const attribute = firstOrNull(row.attributes);
    const category = firstOrNull(attribute?.categories);

    return {
      id: row.attribute_id,
      name: attribute?.name ?? 'Attribute',
      categoryName: category?.name ?? 'Category',
      categoryColorToken: category?.color_token ?? 'accent',
      iconKey: attribute?.icon_key ?? 'star-outline',
      totalXp: parseNumber(row.total_xp, 0),
      level: asInteger(row.current_level, 1),
      progress: buildProgress(asInteger(row.current_level, 1), row.total_xp, thresholdByLevel),
    };
  });

  return {
    ...summary,
    topAttributes,
  };
}
