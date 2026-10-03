import { AppError, AppErrorCode } from '@/src/lib/errors';
import { getSupabaseClient } from '@/src/lib/supabase';
import { trackEvent } from '@/src/lib/analytics';

import type { PostgrestError } from '@supabase/supabase-js';

type RawJoin<T> = T | T[] | null;

type RawUserCategory = {
  category_id: string;
  sort_order: number | string | null;
  categories: RawJoin<{
    id: string;
    name: string;
    slug: string;
    color_token: string;
  }>;
};

type RawAttribute = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
};

type RawTemplate = {
  id: string;
  owner_user_id: string | null;
  category_id: string;
  attribute_id: string;
  name: string;
  description: string | null;
  xp_tier: string;
  xp_value: number | string;
  icon_key: string;
  default_duration_minutes: number | string | null;
  is_archived: boolean;
  categories: RawJoin<{
    id: string;
    name: string;
    slug: string;
  }>;
  attributes: RawJoin<{
    id: string;
    name: string;
    slug: string;
  }>;
};

type RawTemplatePreference = {
  template_id: string;
  is_favorite: boolean;
};

export type TemplateXpTier = 'quick' | 'focused' | 'challenging' | 'milestone' | 'major';

export type TemplateCategory = {
  id: string;
  name: string;
  slug: string;
  colorToken: string;
  sortOrder: number;
};

export type TemplateAttribute = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
};

export type ManagedTemplate = {
  id: string;
  ownerUserId: string | null;
  categoryId: string;
  attributeId: string;
  categoryName: string;
  categorySlug: string;
  attributeName: string;
  attributeSlug: string;
  name: string;
  description: string | null;
  xpTier: TemplateXpTier;
  xpValue: number;
  iconKey: string;
  defaultDurationMinutes: number | null;
  isArchived: boolean;
  isFavorite: boolean;
};

export type TemplateManagementData = {
  categories: TemplateCategory[];
  attributesByCategory: Record<string, TemplateAttribute[]>;
  templates: ManagedTemplate[];
};

export type TemplatePayload = {
  categoryId: string;
  attributeId: string;
  name: string;
  description: string;
  xpTier: TemplateXpTier;
  iconKey: string;
  defaultDurationMinutes?: number;
};

type RawTemplateWithPreferences = RawTemplate & {
  is_favorite?: boolean;
};

const TEMPLATE_XP_MAP: Record<TemplateXpTier, number> = {
  quick: 10,
  focused: 25,
  challenging: 60,
  milestone: 150,
  major: 400,
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

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

function parseBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function parseTier(value: unknown): TemplateXpTier {
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

async function getCurrentUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new AppError(
      AppErrorCode.NetworkError,
      'Unable to load your session.',
      { cause: error.message },
    );
  }

  if (!session?.user?.id) {
    throw new AppError(AppErrorCode.AuthError, 'You must be signed in to manage templates.');
  }

  return session.user.id;
}

function mapError(error: PostgrestError): never {
  if (error.code === 'PGRST116') {
    throw new AppError(AppErrorCode.ValidationError, 'Template not found.');
  }

  if (error.code === '23505') {
    throw new AppError(
      AppErrorCode.ValidationError,
      'A template with that name already exists in this category and attribute.',
    );
  }

  if (error.code === '23503' || error.message.includes('foreign key')) {
    throw new AppError(
      AppErrorCode.ValidationError,
      'Selected category or attribute is invalid.',
    );
  }

  if (
    error.message.includes('INVALID_TEMPLATE_ATTRIBUTE') ||
    error.message.includes('INVALID_TEMPLATE_RELATIONSHIP') ||
    error.message.includes('violates check constraint')
  ) {
    throw new AppError(
      AppErrorCode.ValidationError,
      'Template category and attribute relationship is not valid.',
    );
  }

  if (error.message.includes('AUTH_REQUIRED') || error.message.includes('row-level security policy')) {
    throw new AppError(AppErrorCode.AuthorizationError, 'You do not have permission to perform this template action.');
  }

  throw new AppError(
    AppErrorCode.ServerError,
    'The server could not process your template request.',
    { cause: error.message },
  );
}

async function assertAttributeMatchesCategory(
  supabase: ReturnType<typeof getSupabaseClient>,
  categoryId: string,
  attributeId: string,
): Promise<void> {
  const { data, error } = (await supabase
    .from('attributes')
    .select('id, category_id, is_active')
    .eq('id', attributeId)
    .single()) as { data: { category_id: string; is_active: boolean } | null; error: PostgrestError | null };

  if (error) {
    throw new AppError(
      AppErrorCode.NetworkError,
      'Unable to verify selected template attribute.',
      { cause: error.message },
    );
  }

  if (!data || data.category_id !== categoryId || !data.is_active) {
    throw new AppError(AppErrorCode.ValidationError, 'Please select an attribute that matches the category.');
  }
}

function mapTemplateRows(
  rows: RawTemplate[],
  preferenceMap: Map<string, boolean>,
): ManagedTemplate[] {
  return rows.map((row) => {
    const category = firstOrNull(row.categories);
    const attribute = firstOrNull(row.attributes);

    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      categoryId: row.category_id,
      attributeId: row.attribute_id,
      categoryName: parseText(category?.name, 'Unknown category'),
      categorySlug: parseText(category?.slug, ''),
      attributeName: parseText(attribute?.name, 'Unknown attribute'),
      attributeSlug: parseText(attribute?.slug, ''),
      name: row.name,
      description: row.description,
      xpTier: parseTier(row.xp_tier),
      xpValue: parseNumber(row.xp_value, TEMPLATE_XP_MAP.quick),
      iconKey: row.icon_key,
      defaultDurationMinutes:
        row.default_duration_minutes === null ? null : parseNumber(row.default_duration_minutes, 0),
      isArchived: parseBoolean(row.is_archived),
      isFavorite: preferenceMap.get(row.id) ?? false,
    };
  });
}

function normalizeCategories(rows: RawUserCategory[]): TemplateCategory[] {
  return rows
    .map((row) => {
      const category = firstOrNull(row.categories);
      return {
        id: row.category_id,
        name: parseText(category?.name, 'Category'),
        slug: parseText(category?.slug, ''),
        colorToken: parseText(category?.color_token, '#ffd597'),
        sortOrder: parseNumber(row.sort_order, 0),
      };
    })
    .filter((category) => category.id);
}

function normalizeAttributes(rows: RawAttribute[]): Record<string, TemplateAttribute[]> {
  return rows.reduce<Record<string, TemplateAttribute[]>>((acc, attribute) => {
    const next = acc[attribute.category_id] ?? [];
    acc[attribute.category_id] = [...next, {
      id: attribute.id,
      categoryId: attribute.category_id,
      name: attribute.name,
      slug: attribute.slug,
    }].sort((left, right) => left.name.localeCompare(right.name));

    return acc;
  }, {});
}

export async function fetchTemplateManagementData(): Promise<TemplateManagementData> {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  const { data: userCategoryRows, error: userCategoryError } = (await supabase
    .from('user_categories')
    .select(
      `
      category_id,
      sort_order,
      categories:categories!inner(id, name, slug, color_token)
      `,
    )
    .eq('user_id', userId)
    .eq('is_selected', true)
    .order('sort_order')) as {
    data: RawUserCategory[] | null;
    error: PostgrestError | null;
  };

  if (userCategoryError) {
    throw new AppError(
      AppErrorCode.NetworkError,
      'Unable to load your active categories.',
      { cause: userCategoryError.message },
    );
  }

  const categories = normalizeCategories(userCategoryRows ?? []);
  const categoryIds = categories.map((category) => category.id);

  if (categoryIds.length === 0) {
    return {
      categories,
      attributesByCategory: {},
      templates: [],
    };
  }

  const [attributeResult, templateResult, templatePreferenceResult] = await Promise.all([
    (await supabase
      .from('attributes')
      .select('id, category_id, name, slug')
      .in('category_id', categoryIds)
      .eq('is_active', true)
      .order('name')) as {
      data: RawAttribute[] | null;
      error: PostgrestError | null;
    },
    (await supabase
      .from('activity_templates')
      .select(
        `
        id,
        owner_user_id,
        category_id,
        attribute_id,
        name,
        description,
        xp_tier,
        xp_value,
        icon_key,
        default_duration_minutes,
        is_archived,
        categories:categories!inner(id, name, slug),
        attributes:attributes!inner(id, name, slug)
        `,
      )
      .in('category_id', categoryIds)
      .order('category_id')
      .order('is_archived')
      .order('name')) as {
      data: RawTemplate[] | null;
      error: PostgrestError | null;
    },
    (await supabase
      .from('user_template_preferences')
      .select('template_id, is_favorite')
      .eq('user_id', userId)) as {
      data: RawTemplatePreference[] | null;
      error: PostgrestError | null;
    },
  ]);

  if (attributeResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load your attributes.', {
      cause: attributeResult.error.message,
    });
  }

  if (templateResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load templates.', {
      cause: templateResult.error.message,
    });
  }

  if (templatePreferenceResult.error) {
    throw new AppError(AppErrorCode.NetworkError, 'Unable to load template favorites.', {
      cause: templatePreferenceResult.error.message,
    });
  }

  const attributesByCategory = normalizeAttributes(attributeResult.data ?? []);
  const preferenceMap = new Map<string, boolean>((templatePreferenceResult.data ?? []).map((row) => [row.template_id, row.is_favorite]));
  const templates = mapTemplateRows(templateResult.data ?? [], preferenceMap);

  return {
    categories,
    attributesByCategory,
    templates,
  };
}

export async function createTemplate(payload: TemplatePayload): Promise<ManagedTemplate> {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();
  const sanitized = {
    ...payload,
    name: payload.name.trim(),
    description: payload.description.trim(),
    iconKey: payload.iconKey.trim() || 'star-outline',
    defaultDurationMinutes: payload.defaultDurationMinutes,
  };

  if (sanitized.name.length === 0) {
    throw new AppError(AppErrorCode.ValidationError, 'Template name is required.');
  }

  if (!sanitized.xpTier || sanitized.xpTier === '') {
    throw new AppError(AppErrorCode.ValidationError, 'Please choose a tier.');
  }

  await assertAttributeMatchesCategory(supabase, sanitized.categoryId, sanitized.attributeId);

  const { data, error } = (await supabase
    .from('activity_templates')
    .insert({
      owner_user_id: userId,
      category_id: sanitized.categoryId,
      attribute_id: sanitized.attributeId,
      name: sanitized.name,
      description: sanitized.description || null,
      xp_tier: sanitized.xpTier,
      xp_value: TEMPLATE_XP_MAP[sanitized.xpTier],
      icon_key: sanitized.iconKey,
      default_duration_minutes: sanitized.defaultDurationMinutes ?? null,
      is_archived: false,
    })
    .select(
      `
      id,
      owner_user_id,
      category_id,
      attribute_id,
      name,
      description,
      xp_tier,
      xp_value,
      icon_key,
      default_duration_minutes,
      is_archived,
      categories:categories!inner(id, name, slug),
      attributes:attributes!inner(id, name, slug)
      `,
    )
    .single()) as {
    data: RawTemplateWithPreferences | null;
    error: PostgrestError | null;
  };

  if (error) {
    mapError(error);
  }

  if (!data) {
    throw new AppError(AppErrorCode.ServerError, 'The server did not return the created template.');
  }

  trackEvent('custom_template_created', {
    template_id: data.id,
    template_tier: data.xp_tier,
    template_category: data.category_id,
    is_custom_template: true,
  });

  const mapped = mapTemplateRows([data], new Map<string, boolean>())[0]!;

  return mapped;
}

export async function updateTemplate(payload: {
  templateId: string;
  categoryId: string;
  attributeId: string;
  name: string;
  description: string;
  xpTier: TemplateXpTier;
  iconKey: string;
  defaultDurationMinutes?: number;
}): Promise<ManagedTemplate> {
  if (!payload.templateId) {
    throw new AppError(AppErrorCode.ValidationError, 'Template id is required.');
  }

  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();
  const sanitized = {
    templateId: payload.templateId,
    categoryId: payload.categoryId,
    attributeId: payload.attributeId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    xpTier: payload.xpTier,
    iconKey: payload.iconKey.trim() || 'star-outline',
    defaultDurationMinutes: payload.defaultDurationMinutes,
  };

  if (!sanitized.name) {
    throw new AppError(AppErrorCode.ValidationError, 'Template name is required.');
  }

  await assertAttributeMatchesCategory(supabase, sanitized.categoryId, sanitized.attributeId);

  const { data, error } = (await supabase
    .from('activity_templates')
    .update({
      category_id: sanitized.categoryId,
      attribute_id: sanitized.attributeId,
      name: sanitized.name,
      description: sanitized.description || null,
      xp_tier: sanitized.xpTier,
      xp_value: TEMPLATE_XP_MAP[sanitized.xpTier],
      icon_key: sanitized.iconKey,
      default_duration_minutes: sanitized.defaultDurationMinutes ?? null,
    })
    .eq('id', sanitized.templateId)
    .eq('owner_user_id', userId)
    .eq('is_archived', false)
    .select(
      `
      id,
      owner_user_id,
      category_id,
      attribute_id,
      name,
      description,
      xp_tier,
      xp_value,
      icon_key,
      default_duration_minutes,
      is_archived,
      categories:categories!inner(id, name, slug),
      attributes:attributes!inner(id, name, slug)
      `,
    )
    .maybeSingle()) as {
    data: RawTemplateWithPreferences | null;
    error: PostgrestError | null;
  };

  if (error) {
    mapError(error);
  }

  if (!data) {
    throw new AppError(AppErrorCode.AuthorizationError, 'You do not own this template.');
  }

  return mapTemplateRows([data], new Map<string, boolean>())[0]!;
}

export async function archiveTemplate(templateId: string): Promise<void> {
  if (!templateId) {
    throw new AppError(AppErrorCode.ValidationError, 'Template id is required.');
  }

  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  const { data, error } = (await supabase
    .from('activity_templates')
    .update({ is_archived: true })
    .eq('id', templateId)
    .eq('owner_user_id', userId)
    .eq('is_archived', false)
    .select('id')) as {
    data: { id: string }[] | null;
    error: PostgrestError | null;
  };

  if (error) {
    mapError(error);
  }

  if (!data || data.length === 0) {
    throw new AppError(AppErrorCode.AuthorizationError, 'You cannot archive this template.');
  }
}

export async function setTemplateFavorite(templateId: string, isFavorite: boolean): Promise<void> {
  if (!templateId) {
    throw new AppError(AppErrorCode.ValidationError, 'Template id is required.');
  }

  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  const { data: templateCheck, error: templateCheckError } = (await supabase
    .from('activity_templates')
    .select('id')
    .eq('id', templateId)
    .single()) as {
    data: { id: string } | null;
    error: PostgrestError | null;
  };

  if (templateCheckError) {
    mapError(templateCheckError);
  }

  if (!templateCheck) {
    throw new AppError(AppErrorCode.AuthorizationError, 'Template is not available.');
  }

  const { error } = await supabase
    .from('user_template_preferences')
    .upsert(
      {
        user_id: userId,
        template_id: templateId,
        is_favorite: isFavorite,
      },
      { onConflict: 'user_id,template_id' },
    );

  if (error) {
    mapError(error as PostgrestError);
  }
}

export function templateValueForTier(tier: TemplateXpTier): number {
  return TEMPLATE_XP_MAP[tier];
}
