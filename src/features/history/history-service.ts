import { AppError, AppErrorCode } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';

import type { PostgrestError } from '@supabase/supabase-js';

type RawCategoryHistory = {
  id: string;
  name: string;
  slug: string;
  color_token: string;
};

type RawAttributeHistory = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
};

type RawJoin<T> = T | T[] | null;

type RawHistoryActivityRow = {
  id: string;
  template_id: string | null;
  template_name_snapshot: string;
  xp_value_snapshot: number | string | null;
  xp_tier_snapshot: string | null;
  status: string | null;
  occurred_at: string;
  note: string | null;
  private_reflection: string | null;
  duration_minutes: number | string | null;
  client_request_id: string | null;
  category_id: string;
  attribute_id: string;
  categories: RawJoin<RawCategoryHistory>;
  attributes: RawJoin<RawAttributeHistory>;
};

type RawHistoryFilterCategoryRow = {
  category_id: string;
  sort_order: number | string | null;
  categories: RawJoin<RawCategoryHistory>;
};

type RawHistoryFilterAttributeRow = {
  attribute_id: string;
  attributes: RawJoin<RawAttributeHistory>;
};

type RawHistoryTemplateOptionRow = {
  template_id: string | null;
  template_name_snapshot: string | null;
};

type ProgressChunk = {
  oldLevel: number;
  newLevel: number;
  oldTotalXp: number;
  newTotalXp: number;
};

type RawReversalResult = {
  activityId?: unknown;
  xpAwarded?: unknown;
  character?: unknown;
  category?: unknown;
  attribute?: unknown;
};

export type HistoryActivityStatus = 'active' | 'reversed';
export type HistoryXpTier = 'quick' | 'focused' | 'challenging' | 'milestone' | 'major';
export type HistoryStatusFilter = 'all' | HistoryActivityStatus;
export type HistoryTimeRange = 'all' | 'today' | '7d' | '30d' | '90d';

export type HistoryActivityItem = {
  id: string;
  templateId: string | null;
  templateName: string;
  xpAwarded: number;
  xpTier: HistoryXpTier;
  status: HistoryActivityStatus;
  occurredAt: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  categoryColorToken: string;
  attributeId: string;
  attributeName: string;
  attributeSlug: string;
  note: string | null;
  privateReflection: string | null;
  durationMinutes: number | null;
  clientRequestId: string;
};

export type HistoryActivityPage = {
  activities: HistoryActivityItem[];
  hasMore: boolean;
  nextPage: number;
};

export type HistoryFilterOption = {
  id: string;
  name: string;
};

export type HistoryFilterOptions = {
  categories: (HistoryFilterOption & { slug: string; colorToken: string })[];
  attributes: HistoryFilterOption & {
    categoryId: string;
    categoryName: string;
  }[];
  templates: HistoryFilterOption[];
};

export type HistoryFetchFilters = {
  categoryId?: string;
  attributeId?: string;
  templateId?: string;
  status?: HistoryStatusFilter;
  xpTier?: HistoryXpTier;
  from?: string;
  to?: string;
};

export type HistoryReversalResult = {
  activityId: string;
  xpAwarded: number;
  character: ProgressChunk & { totalXp?: number };
  category: ProgressChunk & { id: string };
  attribute: ProgressChunk & { id: string };
};

type CategoryFilter = {
  id: string;
  name: string;
  slug: string;
  colorToken: string;
  sortOrder: number;
};

const PAGE_SIZE = 20;

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

function parseText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseStatus(value: unknown): HistoryActivityStatus {
  return value === 'reversed' ? 'reversed' : 'active';
}

function parseTier(value: unknown): HistoryXpTier {
  switch (value) {
    case 'focused':
      return 'focused';
    case 'challenging':
      return 'challenging';
    case 'milestone':
      return 'milestone';
    case 'major':
      return 'major';
    case 'quick':
    default:
      return 'quick';
  }
}

function parseProgressChunk(value: unknown): ProgressChunk {
  if (!value || typeof value !== 'object') {
    throw new AppError(AppErrorCode.ServerError, 'Invalid server progression payload.');
  }

  const candidate = value as Record<string, unknown>;
  return {
    oldLevel: parseNumber(candidate.oldLevel, 1),
    newLevel: parseNumber(candidate.newLevel, 1),
    oldTotalXp: parseNumber(candidate.oldTotalXp),
    newTotalXp: parseNumber(candidate.newTotalXp),
  };
}

function mapRPCError(error: PostgrestError): never {
  if (error.message.includes('AUTH_REQUIRED')) {
    throw new AppError(AppErrorCode.AuthError, 'You must sign in to load or reverse history.');
  }

  if (error.message.includes('INVALID_ACTIVITY_ID') || error.message.includes('ACTIVITY_NOT_FOUND')) {
    throw new AppError(AppErrorCode.ValidationError, 'Could not find the selected activity.');
  }

  if (error.message.includes('ACTIVITY_LOCKED') || error.message.includes('REVERSAL_LOCKED')) {
    throw new AppError(AppErrorCode.ConflictError, 'This activity cannot be reversed right now.');
  }

  throw new AppError(
    AppErrorCode.ServerError,
    'The server could not reverse this activity.',
    { cause: error.message },
  );
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
      'Could not load your session.',
      { cause: error.message },
    );
  }

  if (!session?.user?.id) {
    throw new AppError(AppErrorCode.AuthError, 'You must be signed in to load history.');
  }

  return session.user.id;
}

function mapFilterCategoryRows(rows: RawHistoryFilterCategoryRow[]): CategoryFilter[] {
  return rows
    .map((row) => {
      const category = firstOrNull(row.categories);
      if (!category) {
        return null;
      }

      return {
        id: row.category_id,
        name: category.name,
        slug: category.slug,
        colorToken: category.color_token,
        sortOrder: parseNumber(row.sort_order, Number.MAX_SAFE_INTEGER),
      };
    })
    .filter((entry): entry is CategoryFilter => entry !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function mapFilterAttributeRows(
  rows: RawHistoryFilterAttributeRow[],
  categoryMap: Map<string, string>,
): HistoryFilterOptions['attributes'] {
  const mapped = rows
    .map((row) => {
      const attribute = firstOrNull(row.attributes);
      if (!attribute) {
        return null;
      }

      return {
        id: row.attribute_id,
        name: attribute.name,
        slug: attribute.slug,
        categoryId: attribute.category_id,
        categoryName: categoryMap.get(attribute.category_id) ?? 'Category',
      };
    })
    .filter((entry): entry is HistoryFilterOptions['attributes'][number] => entry !== null);

  return mapped
    .filter((entry, index, list) => list.findIndex((item) => item.id === entry.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function mapHistoryRow(row: RawHistoryActivityRow): HistoryActivityItem {
  const category = firstOrNull(row.categories);
  const attribute = firstOrNull(row.attributes);

  return {
    id: row.id,
    templateId: row.template_id ?? null,
    templateName: parseText(row.template_name_snapshot, 'Activity'),
    xpAwarded: parseNumber(row.xp_value_snapshot, 0),
    xpTier: parseTier(row.xp_tier_snapshot),
    status: parseStatus(row.status),
    occurredAt: parseText(row.occurred_at),
    categoryId: row.category_id,
    categoryName: parseText(category?.name, 'Category'),
    categorySlug: parseText(category?.slug, ''),
    categoryColorToken: parseText(category?.color_token, 'accent'),
    attributeId: row.attribute_id,
    attributeName: parseText(attribute?.name, 'Attribute'),
    attributeSlug: parseText(attribute?.slug, ''),
    note: parseText(row.note, ''),
    privateReflection: parseText(row.private_reflection, ''),
    durationMinutes: row.duration_minutes === null ? null : parseNumber(row.duration_minutes, 0),
    clientRequestId: parseText(row.client_request_id),
  };
}

export async function fetchHistoryFilterOptions(): Promise<HistoryFilterOptions> {
  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();

  const [categoryResult, attributeResult, templateResult] = await Promise.all([
    supabase
      .from('user_categories')
      .select(
        `
          category_id,
          sort_order,
          categories:categories!inner(id, name, slug, color_token)
        `,
      )
      .eq('user_id', userId)
      .order('sort_order')
      .order('category_id'),
    supabase
      .from('user_attributes')
      .select(
        `
          attribute_id,
          attributes:attributes!inner(id, name, slug, category_id)
        `,
      )
      .eq('user_id', userId),
    supabase
      .from('activity_logs')
      .select('template_id, template_name_snapshot')
      .eq('user_id', userId)
      .not('template_id', 'is', null)
      .order('occurred_at', { ascending: false }),
  ]);

  if (categoryResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load category filters.', {
      cause: categoryResult.error.message,
    });
  }

  if (attributeResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load attribute filters.', {
      cause: attributeResult.error.message,
    });
  }

  if (templateResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load template filters.', {
      cause: templateResult.error.message,
    });
  }

  const categoryRows = (categoryResult.data ?? []) as RawHistoryFilterCategoryRow[];
  const categories = mapFilterCategoryRows(categoryRows);
  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));
  const attributes = mapFilterAttributeRows(
    (attributeResult.data ?? []) as RawHistoryFilterAttributeRow[],
    categoryMap,
  );

  const templateRows = (templateResult.data ?? []) as RawHistoryTemplateOptionRow[];
  const templateById = new Map<string, string>();
  templateRows.forEach((row) => {
    if (row.template_id) {
      const templateName = parseText(row.template_name_snapshot, 'Activity template');
      if (!templateById.has(row.template_id)) {
        templateById.set(row.template_id, templateName);
      }
    }
  });

  const templates = Array.from(templateById.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      colorToken: category.colorToken,
    })),
    attributes,
    templates,
  };
}

export async function fetchActivityHistoryPage(
  page: number,
  filters: HistoryFetchFilters = {},
): Promise<HistoryActivityPage> {
  const userId = await getCurrentUserId();
  const supabase = getSupabaseClient();
  const normalizedPage = Math.max(0, Math.floor(page));
  const startIndex = normalizedPage * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;

  let query = supabase
    .from('activity_logs')
    .select(
      `
        id,
        template_id,
        template_name_snapshot,
        xp_value_snapshot,
        xp_tier_snapshot,
        status,
        occurred_at,
        note,
        private_reflection,
        duration_minutes,
        client_request_id,
        category_id,
        attribute_id,
        categories:categories!inner(id, name, slug, color_token),
        attributes:attributes!inner(id, name, slug, category_id)
      `,
    )
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .range(startIndex, endIndex);

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.attributeId) {
    query = query.eq('attribute_id', filters.attributeId);
  }

  if (filters.templateId) {
    query = query.eq('template_id', filters.templateId);
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.xpTier) {
    query = query.eq('xp_tier_snapshot', filters.xpTier);
  }

  if (filters.from) {
    query = query.gte('occurred_at', filters.from);
  }

  if (filters.to) {
    query = query.lte('occurred_at', filters.to);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load activity history.', {
      cause: error.message,
    });
  }

  const rows = (data ?? []) as RawHistoryActivityRow[];
  const activities = rows.slice(0, PAGE_SIZE).map(mapHistoryRow);

  return {
    activities,
    hasMore: rows.length > PAGE_SIZE,
    nextPage: normalizedPage + 1,
  };
}

export async function reverseActivity(activityId: string): Promise<HistoryReversalResult> {
  if (!activityId) {
    throw new AppError(AppErrorCode.ValidationError, 'An activity id is required.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = (await supabase.rpc('reverse_activity', {
    p_activity_id: activityId,
  })) as { data: unknown; error: PostgrestError | null };

  if (error) {
    mapRPCError(error);
  }

  if (!data || typeof data !== 'object') {
    throw new AppError(AppErrorCode.ServerError, 'The server returned an invalid reversal response.');
  }

  const payload = data as RawReversalResult;
  if (typeof payload.activityId !== 'string') {
    throw new AppError(AppErrorCode.ServerError, 'The server returned an invalid reversal payload.');
  }

  if (typeof payload.xpAwarded !== 'number' && typeof payload.xpAwarded !== 'string') {
    throw new AppError(AppErrorCode.ServerError, 'The server returned an invalid reversal XP value.');
  }

  if (!payload.character || !payload.category || !payload.attribute) {
    throw new AppError(AppErrorCode.ServerError, 'The server returned incomplete reversal progress data.');
  }

  return {
    activityId: payload.activityId,
    xpAwarded: parseNumber(payload.xpAwarded),
    character: {
      ...(parseProgressChunk(payload.character) as ProgressChunk),
      totalXp: parseNumber((payload.character as { newTotalXp?: unknown }).newTotalXp),
    },
    category: {
      id: parseText((payload.category as Record<string, unknown>).id),
      ...parseProgressChunk(payload.category),
    },
    attribute: {
      id: parseText((payload.attribute as Record<string, unknown>).id),
      ...parseProgressChunk(payload.attribute),
    },
  };
}
