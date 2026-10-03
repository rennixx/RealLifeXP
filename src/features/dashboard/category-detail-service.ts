import { AppError, AppErrorCode } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

import type { DashboardRecentActivity, ProgressBarSnapshot } from '@/src/features/dashboard/dashboard-service';

const ONE_WEEK_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
const CATEGORY_ACTIVITY_PAGE_SIZE = 5;
const CATEGORY_PROGRESS_WEEK_WINDOW = 4;

type SupabaseUserCategoryRow = {
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

type SupabaseAttributeCategoryRow = {
  id: string;
  name: string;
  color_token: string;
};

type SupabaseAttributeJoinRow = {
  id: string;
  name: string;
  category_id: string;
  icon_key: string;
  categories: SupabaseAttributeCategoryRow | SupabaseAttributeCategoryRow[] | null;
};

type SupabaseUserAttributeRow = {
  attribute_id: string;
  total_xp: number | string | null;
  current_level: number | string | null;
  attributes: SupabaseAttributeJoinRow | SupabaseAttributeJoinRow[] | null;
};

type SupabaseRecentActivityRow = {
  id: string;
  template_name_snapshot: string;
  xp_value_snapshot: number | string | null;
  xp_tier_snapshot: string | null;
  occurred_at: string;
};

type CategoryLevelRow = {
  level: number | string | null;
  cumulative_xp: number | string | null;
  required_for_next_level: number | string | null;
};

type SupabaseProgressRow = {
  occurred_at: string;
  xp_value_snapshot: number | string | null;
};

type ThresholdLookup = Map<number, CategoryLevelRow>;

export type CategoryAttribute = {
  id: string;
  name: string;
  iconKey: string;
  categoryName: string;
  categoryColorToken: string;
  totalXp: number;
  level: number;
  progress: ProgressBarSnapshot;
};

export type CategoryDetail = {
  category: {
    id: string;
    name: string;
    slug: string;
    iconKey: string;
    colorToken: string;
    totalXp: number;
    level: number;
    sortOrder: number;
    progress: ProgressBarSnapshot;
  };
  topAttributes: CategoryAttribute[];
  recentActivities: DashboardRecentActivity[];
  hasMoreActivities: boolean;
  nextPage: number;
  progressSeries: CategoryProgressPoint[];
};

export type CategoryProgressPoint = {
  label: string;
  xp: number;
  start: string;
  end: string;
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

function asInteger(value: unknown, fallback = 0): number {
  return Math.max(0, Math.floor(parseNumber(value, fallback)));
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function buildProgress(levelValue: unknown, totalXpValue: unknown, thresholdMap: ThresholdLookup): ProgressBarSnapshot {
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

function safeDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function cloneToWeekStart(value: Date): Date {
  const current = new Date(value.getTime());
  const day = current.getDay();
  const daysFromMonday = (day + 6) % 7;
  current.setHours(0, 0, 0, 0);
  current.setDate(current.getDate() - daysFromMonday);
  return current;
}

function addWeeks(baseDate: Date, weeks: number): Date {
  const next = new Date(baseDate.getTime());
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function formatWeekLabel(value: Date): string {
  return value.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function buildProgressSeriesFromRows(rows: SupabaseProgressRow[], now = new Date()): CategoryProgressPoint[] {
  const nowWeekStart = cloneToWeekStart(now);
  const windowStart = addWeeks(nowWeekStart, -(CATEGORY_PROGRESS_WEEK_WINDOW - 1));
  const bucketMap = new Map<string, number>();
  const bucketMeta = new Map<string, { label: string; start: string; end: string }>();

  for (let offset = 0; offset < CATEGORY_PROGRESS_WEEK_WINDOW; offset += 1) {
    const start = addWeeks(windowStart, offset);
    const end = new Date(start.getTime() + ONE_WEEK_MILLISECONDS - 1);
    const key = `${start.getTime()}`;
    const label = `${formatWeekLabel(start)}–${formatWeekLabel(end)}`;
    bucketMap.set(key, 0);
    bucketMeta.set(key, {
      label,
      start: start.toISOString(),
      end: end.toISOString(),
    });
  }

  rows.forEach((row) => {
    const occurredAt = safeDate(row.occurred_at);
    if (!occurredAt) {
      return;
    }

    const weekStart = cloneToWeekStart(occurredAt);
    if (weekStart < windowStart || weekStart > nowWeekStart) {
      return;
    }

    const key = `${weekStart.getTime()}`;
    bucketMap.set(key, (bucketMap.get(key) ?? 0) + parseNumber(row.xp_value_snapshot, 0));
  });

  return Array.from(bucketMap.entries())
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([key, xp]) => {
      const meta = bucketMeta.get(key);
      return {
        label: meta?.label ?? '—',
        xp,
        start: meta?.start ?? windowStart.toISOString(),
        end: meta?.end ?? now.toISOString(),
      };
    });
}

export async function fetchCategoryProgressSeries(categoryId: string, userId: string): Promise<CategoryProgressPoint[]> {
  const supabase = getSupabaseClient();
  const now = new Date();
  const windowStart = cloneToWeekStart(addWeeks(now, -(CATEGORY_PROGRESS_WEEK_WINDOW - 1)));

  const { data, error } = await supabase
    .from('activity_logs')
    .select('occurred_at, xp_value_snapshot')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .eq('status', 'active')
    .gte('occurred_at', windowStart.toISOString())
    .order('occurred_at', { ascending: true });

  if (error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load category progress chart.', {
      cause: error.message,
    });
  }

  return buildProgressSeriesFromRows((data ?? []) as SupabaseProgressRow[], now);
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
    throw new AppError(AppErrorCode.AuthError, 'You must sign in to view category details.');
  }

  return session.user.id;
}

async function fetchThresholds(levels: Set<number>): Promise<ThresholdLookup> {
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

function parseRecentActivityRow(row: SupabaseRecentActivityRow): DashboardRecentActivity {
  return {
    id: row.id,
    templateName: row.template_name_snapshot ?? 'Activity',
    categoryName: '',
    attributeName: '',
    xpAwarded: parseNumber(row.xp_value_snapshot, 0),
    xpTier: row.xp_tier_snapshot ?? 'quick',
    occurredAt: row.occurred_at ?? '',
  };
}

function normalizeCategoryRow(row: SupabaseUserCategoryRow | null): CategoryDetail['category'] | null {
  if (!row) {
    return null;
  }

  const category = firstOrNull(row.categories);
  if (!category) {
    return null;
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    iconKey: category.icon_key,
    colorToken: category.color_token,
    totalXp: parseNumber(row.total_xp, 0),
    level: asInteger(row.current_level, 1),
    sortOrder: asInteger(row.sort_order, 0),
    progress: {
      level: 0,
      totalXp: 0,
      xpInCurrentLevel: 0,
      xpToNext: 0,
      xpRequiredForNext: 0,
      progressPercent: 0,
    },
  };
}

export async function fetchCategoryActivitiesPage(
  categoryId: string,
  page: number,
): Promise<{ activities: DashboardRecentActivity[]; hasMore: boolean; nextPage: number }> {
  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();
  const normalizedPage = Math.max(0, Math.floor(page));
  const startIndex = normalizedPage * CATEGORY_ACTIVITY_PAGE_SIZE;
  const endIndex = startIndex + CATEGORY_ACTIVITY_PAGE_SIZE;

  const { data, error } = await supabase
    .from('activity_logs')
    .select(
      `
          id,
          template_name_snapshot,
          xp_value_snapshot,
          xp_tier_snapshot,
          occurred_at
        `
    )
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .eq('status', 'active')
    .order('occurred_at', { ascending: false })
    .range(startIndex, endIndex);

  if (error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load category activity.', {
      cause: error.message,
    });
  }

  const rows = (data ?? []) as SupabaseRecentActivityRow[];
  const trimmedRows = rows.slice(0, CATEGORY_ACTIVITY_PAGE_SIZE);
  const hasMore = rows.length > CATEGORY_ACTIVITY_PAGE_SIZE;
  return {
    activities: trimmedRows.map(parseRecentActivityRow),
    hasMore,
    nextPage: normalizedPage + 1,
  };
}

export async function fetchCategoryDetail(categoryId: string): Promise<CategoryDetail> {
  if (!categoryId) {
    throw new AppError(AppErrorCode.ValidationError, 'Category id is required.');
  }

  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();
  const [categoryResult, attributeResult, activityPage, progressSeries] = await Promise.all([
    supabase
      .from('user_categories')
      .select(
        `
          total_xp,
          current_level,
          sort_order,
          categories:categories!inner(id, name, slug, color_token, icon_key)
        `
      )
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('is_selected', true)
      .maybeSingle(),
    supabase
      .from('user_attributes')
      .select(
        `
        attribute_id,
        total_xp,
        current_level,
        attributes:attributes!inner(
          id,
          name,
          category_id,
          icon_key,
          categories:categories!inner(id, name, color_token)
        )
        `
      )
      .eq('user_id', userId),
    fetchCategoryActivitiesPage(categoryId, 0),
    fetchCategoryProgressSeries(categoryId, userId),
  ]);

  if (categoryResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load category data.', {
      cause: categoryResult.error.message,
    });
  }

  if (attributeResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load category attributes.', {
      cause: attributeResult.error.message,
    });
  }

  const category = normalizeCategoryRow(categoryResult.data as SupabaseUserCategoryRow | null);
  if (!category) {
    throw new AppError(AppErrorCode.ValidationError, 'Category not found for your account.');
  }

  const attributeRows = (attributeResult.data ?? []) as unknown as SupabaseUserAttributeRow[];
  const matchingAttributes = attributeRows.filter((row) => {
    const attribute = firstOrNull(row.attributes);
    return attribute?.category_id === categoryId;
  });

  const levels = new Set<number>([category.level]);
  matchingAttributes.forEach((row) => {
    levels.add(asInteger(row.current_level, 1));
  });

  const thresholds = await fetchThresholds(levels);
  category.progress = buildProgress(category.level, category.totalXp, thresholds);

  const topAttributes: CategoryAttribute[] = matchingAttributes
    .map((row) => {
      const attribute = firstOrNull(row.attributes);
      const attributeCategory = firstOrNull(attribute?.categories);
      const level = asInteger(row.current_level, 1);
      return {
        id: row.attribute_id,
        name: attribute?.name ?? 'Attribute',
        iconKey: attribute?.icon_key ?? 'star-outline',
        categoryName: attributeCategory?.name ?? 'Category',
        categoryColorToken: attributeCategory?.color_token ?? 'accent',
        totalXp: parseNumber(row.total_xp, 0),
        level,
        progress: buildProgress(level, row.total_xp, thresholds),
      };
    })
    .sort((left, right) => right.totalXp - left.totalXp);

  return {
    category,
    topAttributes,
    recentActivities: activityPage.activities,
    hasMoreActivities: activityPage.hasMore,
    nextPage: activityPage.nextPage,
    progressSeries,
  };
}
