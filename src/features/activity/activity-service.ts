import { randomUUID } from 'expo-crypto';
import type { PostgrestError } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/src/lib/supabase';
import { AppError, AppErrorCode } from '@/src/lib/errors';

type TemplateRow = {
  id: string;
  category_id: string;
  attribute_id: string;
  name: string;
  description: string | null;
  xp_tier: 'quick' | 'focused' | 'challenging' | 'milestone' | 'major';
  xp_value: number;
  icon_key: string;
  categories: {
    id: string;
    name: string;
    slug: string;
  }
  | { id: string; name: string; slug: string }[];
  attributes: {
    id: string;
    name: string;
    slug: string;
  }
  | { id: string; name: string; slug: string }[];
};

type UserCategoryRow = {
  category_id: string;
  sort_order: number;
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
};

type UserTemplatePreferenceRow = {
  template_id: string;
  is_favorite: boolean;
  use_count: number;
  last_used_at: string | null;
};

type AttributeRow = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
};

export type ActivityCategory = {
  id: string;
  name: string;
  slug: string;
  colorToken: string;
  sortOrder: number;
};

export type ActivityAttribute = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
};

export type ActivityTemplateOption = {
  id: string;
  categoryId: string;
  attributeId: string;
  name: string;
  description: string | null;
  xpTier: 'quick' | 'focused' | 'challenging' | 'milestone' | 'major';
  xpValue: number;
  iconKey: string;
  categoryName: string;
  categorySlug: string;
  attributeName: string;
  attributeSlug: string;
  isFavorite: boolean;
  useCount: number;
  lastUsedAt: string | null;
};

export type ActivityLogContext = {
  categories: ActivityCategory[];
  attributesByCategory: Record<string, ActivityAttribute[]>;
  templates: ActivityTemplateOption[];
};

export type LogActivityPayload = {
  templateId: string;
  clientRequestId: string;
  durationMinutes?: number;
  note?: string;
  privateReflection?: string;
  occurredAt?: string;
};

type ProgressChunk = {
  oldLevel: number;
  newLevel: number;
  oldTotalXp: number;
  newTotalXp: number;
};

export type ActivityLogResult = {
  activityId: string;
  xpAwarded: number;
  character: ProgressChunk;
  category: ProgressChunk & { id: string };
  attribute: ProgressChunk & { id: string };
  unlockedAchievements: string[];
  unlockedTitles: string[];
};

export function generateClientRequestId(): string {
  return randomUUID();
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getUserIdFromSession(): Promise<string> {
  const supabase = getSupabaseClient();

  return supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      throw new AppError(
        AppErrorCode.NetworkError,
        'Unable to load authentication session for activity logging.',
        { cause: error.message }
      );
    }

    if (!data.session?.user?.id) {
      throw new AppError(
        AppErrorCode.AuthError,
        'You must be signed in to log an activity.'
      );
    }

    return data.session.user.id;
  });
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function parseProgressChunk(value: unknown): ProgressChunk {
  if (!value || typeof value !== 'object') {
    throw new AppError(AppErrorCode.ServerError, 'Invalid progression payload from server.');
  }

  const candidate = value as Record<string, unknown>;

  return {
    oldLevel: Number(candidate.oldLevel),
    newLevel: Number(candidate.newLevel),
    oldTotalXp: Number(candidate.oldTotalXp),
    newTotalXp: Number(candidate.newTotalXp),
  };
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapRPCError(error: PostgrestError): never {
  if (error.message.includes('AUTH_REQUIRED')) {
    throw new AppError(AppErrorCode.AuthError, 'You must sign in before logging activities.');
  }

  if (error.message.includes('INVALID_TEMPLATE')) {
    throw new AppError(AppErrorCode.AuthorizationError, 'That template is not available for your account.');
  }

  if (error.message.includes('DUPLICATE') || error.message.includes('UNIQUE')) {
    throw new AppError(AppErrorCode.ConflictError, 'This activity has already been logged.');
  }

  if (error.message.includes('INVALID_DURATION')) {
    throw new AppError(AppErrorCode.ValidationError, 'Duration must be between 1 and 1,440 minutes.');
  }

  if (error.message.includes('not visible')) {
    throw new AppError(AppErrorCode.AuthorizationError, 'This template is not visible to you.');
  }

  throw new AppError(
    AppErrorCode.ServerError,
    'The server could not log this activity.',
    { cause: error.message }
  );
}

export async function fetchActivityLogContext(): Promise<ActivityLogContext> {
  const supabase = getSupabaseClient();
  const userId = await getUserIdFromSession();

  const {
    data: userCategoryRows,
    error: userCategoryError,
  } = (await supabase
    .from('user_categories')
    .select(
      `
      category_id,
      sort_order,
      categories:categories!inner(id, name, slug, color_token)
      `
    )
    .eq('user_id', userId)
    .eq('is_selected', true)
    .order('sort_order')
  ) as { data: UserCategoryRow[] | null; error: PostgrestError | null };

  if (userCategoryError) {
    throw new AppError(
      AppErrorCode.NetworkError,
      'Unable to load selected categories.',
      { cause: userCategoryError.message }
    );
  }

  const selectedCategories = (userCategoryRows ?? []).map((row) => {
    const category = firstOrNull(row.categories);
    return {
      id: row.category_id,
      name: category?.name ?? 'Unknown category',
      slug: category?.slug ?? '',
      colorToken: category?.color_token ?? colorsFallbackColor(row.sort_order),
      sortOrder: row.sort_order,
    };
  });

  const categoryIds = selectedCategories.map((category) => category.id);

  if (categoryIds.length === 0) {
    return {
      categories: [],
      attributesByCategory: {},
      templates: [],
    };
  }

  const [
    { data: attributeRows, error: attributeError },
    { data: templateRows, error: templateError },
  ] = await Promise.all([
    supabase
      .from('attributes')
      .select('id, category_id, name, slug')
      .in('category_id', categoryIds)
      .eq('is_active', true),
    supabase
      .from('activity_templates')
      .select(
        `
        id,
        category_id,
        attribute_id,
        name,
        description,
        xp_tier,
        xp_value,
        icon_key,
        categories:categories!inner(id, name, slug),
        attributes:attributes!inner(id, name, slug)
        `
      )
      .eq('is_archived', false)
      .or(`owner_user_id.is.null,owner_user_id.eq.${userId}`)
      .in('category_id', categoryIds)
      .order('name')
  ] as const);

  if (attributeError) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load attributes for this account.', {
      cause: attributeError.message,
    });
  }

  if (templateError) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load templates for this account.', {
      cause: templateError.message,
    });
  }

  const normalizedAttributes: AttributeRow[] = attributeRows ?? [];
  const attributesByCategory = normalizedAttributes.reduce<Record<string, ActivityAttribute[]>>(
    (acc, attribute) => {
      acc[attribute.category_id] = [
        ...(acc[attribute.category_id] ?? []),
        {
          id: attribute.id,
          categoryId: attribute.category_id,
          name: attribute.name,
          slug: attribute.slug,
        },
      ];

      return acc;
    },
    {}
  );

  const templatesRaw = (templateRows ?? []) as TemplateRow[];
  const templateIds = templatesRaw.map((template) => template.id);

  let templatePrefRows: UserTemplatePreferenceRow[] = [];
  if (templateIds.length > 0) {
    const { data: templatePreferenceRows, error: templatePreferenceError } = (await supabase
      .from('user_template_preferences')
      .select('template_id, is_favorite, use_count, last_used_at')
      .eq('user_id', userId)
      .in('template_id', templateIds)) as {
      data: UserTemplatePreferenceRow[] | null;
      error: PostgrestError | null;
    };

    if (templatePreferenceError) {
      throw new AppError(
        AppErrorCode.NetworkError,
        'Unable to load template preferences.',
        { cause: templatePreferenceError.message }
      );
    }

    templatePrefRows = templatePreferenceRows ?? [];
  }

  const templatePrefById = new Map<string, UserTemplatePreferenceRow>();
  templatePrefRows.forEach((preference) => {
    templatePrefById.set(preference.template_id, preference);
  });

  const templates: ActivityTemplateOption[] = templatesRaw.map((template) => {
    const category = firstOrNull(template.categories);
    const attribute = firstOrNull(template.attributes);
    const preference = templatePrefById.get(template.id);

    return {
      id: template.id,
      categoryId: template.category_id,
      attributeId: template.attribute_id,
      name: template.name,
      description: template.description,
      xpTier: template.xp_tier,
      xpValue: template.xp_value,
      iconKey: template.icon_key,
      categoryName: category?.name ?? 'Unknown category',
      categorySlug: category?.slug ?? '',
      attributeName: attribute?.name ?? 'Unknown attribute',
      attributeSlug: attribute?.slug ?? '',
      isFavorite: preference?.is_favorite ?? false,
      useCount: preference?.use_count ?? 0,
      lastUsedAt: preference?.last_used_at ?? null,
    };
  });

  return {
    categories: selectedCategories,
    attributesByCategory,
    templates,
  };
}

function colorsFallbackColor(index: number) {
  const fallback = ['#9f8e78', '#ffd597', '#ffba43', '#ffd597', '#9f8e78'];
  return fallback[index % fallback.length];
}

export async function logActivity(payload: LogActivityPayload): Promise<ActivityLogResult> {
  const supabase = getSupabaseClient();
  const {
    data,
    error,
  } = (await supabase.rpc('log_activity', {
    p_template_id: payload.templateId,
    p_note: payload.note ?? null,
    p_private_reflection: payload.privateReflection ?? null,
    p_duration_minutes: payload.durationMinutes ?? null,
    p_occurred_at: payload.occurredAt ?? null,
    p_client_request_id: payload.clientRequestId,
  })) as { data: unknown; error: PostgrestError | null };

  if (error) {
    mapRPCError(error);
  }

  if (!data || typeof data !== 'object') {
    throw new AppError(AppErrorCode.ServerError, 'Server returned an invalid activity response.');
  }

  const result = data as {
    activityId?: unknown;
    xpAwarded?: number;
    character?: unknown;
    category?: unknown;
    attribute?: unknown;
    unlockedAchievements?: unknown;
    unlockedTitles?: unknown;
  };

  if (typeof result.activityId !== 'string' || typeof result.xpAwarded !== 'number') {
    throw new AppError(AppErrorCode.ServerError, 'Server returned incomplete activity response.');
  }

  return {
    activityId: result.activityId,
    xpAwarded: result.xpAwarded,
    character: parseProgressChunk(result.character),
    category: {
      id: normalizeText((result.category as { id?: unknown })?.id),
      ...parseProgressChunk(result.category),
    },
    attribute: {
      id: normalizeText((result.attribute as { id?: unknown })?.id),
      ...parseProgressChunk(result.attribute),
    },
    unlockedAchievements: parseStringArray(result.unlockedAchievements),
    unlockedTitles: parseStringArray(result.unlockedTitles),
  };
}
