import type { AuthError, Session } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/src/lib/supabase';

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_key: string;
  color_token: string;
};

export type TemplateSummary = {
  id: string;
  category_id: string;
  attribute_id: string;
  name: string;
  description: string | null;
  xp_tier: string;
  xp_value: number;
  icon_key: string;
  category_name?: string;
  category_slug?: string;
};

export type OnboardingDraftPayload = {
  displayName: string;
  handle: string;
  emblemKey: string;
  categoryIds: string[];
  templateIds: string[];
};

export type OnboardingCompletionStatus = {
  onboardingCompleted: boolean;
  hasProfile: boolean;
  hasActiveSession: boolean;
};

type TemplateRow = {
  id: string;
  category_id: string;
  attribute_id: string;
  name: string;
  description: string | null;
  xp_tier: string;
  xp_value: number;
  icon_key: string;
  categories:
    | {
    name: string;
    slug: string;
      }
    | { name: string; slug: string }[]
    | null;
};

type ProfileRow = {
  id: string;
  onboarding_completed: boolean;
};

export async function fetchActiveCategories(): Promise<CategorySummary[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name, description, icon_key, color_token')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    throw new Error(error.message);
  }

  return (data as CategorySummary[]) ?? [];
}

export async function fetchTemplatesForCategories(categoryIds: string[]): Promise<TemplateSummary[]> {
  const supabase = getSupabaseClient();

  if (categoryIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
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
      categories:categories!inner(name, slug)
      `
    )
    .eq('is_archived', false)
    .is('owner_user_id', null)
    .in('category_id', categoryIds)
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  const templates = (data ?? []) as TemplateRow[];
  return templates.map((template) => ({
    id: template.id,
    category_id: template.category_id,
    attribute_id: template.attribute_id,
    name: template.name,
    description: template.description,
    xp_tier: template.xp_tier,
    xp_value: template.xp_value,
    icon_key: template.icon_key,
    category_name: Array.isArray(template.categories)
      ? template.categories[0]?.name
      : template.categories?.name,
    category_slug: Array.isArray(template.categories)
      ? template.categories[0]?.slug
      : template.categories?.slug,
  }));
}

export async function completeOnboarding(payload: OnboardingDraftPayload): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('complete_onboarding', {
    p_display_name: payload.displayName,
    p_handle: payload.handle,
    p_emblem_key: payload.emblemKey,
    p_category_ids: payload.categoryIds,
    p_template_ids: payload.templateIds,
  });

  if (error) {
    if (
      error.message?.includes('AUTH_USER_NOT_FOUND')
      || error.message?.includes('AUTH_REQUIRED')
      || error.code === '23503'
      || error.message.includes('profiles_id_fkey')
    ) {
      throw new Error(
        'Your session is no longer valid. Please sign out and sign in again, then start onboarding with the same account.',
      );
    }

    throw new Error(error.message);
  }

  return data as string;
}

export async function fetchOnboardingStatus(): Promise<OnboardingCompletionStatus> {
  const supabase = getSupabaseClient();
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const session: Session | null = sessionData.session as Session | null;

  if (!session?.user) {
    return {
      onboardingCompleted: false,
      hasProfile: false,
      hasActiveSession: false,
    };
  }

  const { data, error } = (await supabase
    .from('profiles')
    .select('id,onboarding_completed')
    .eq('id', session.user.id)
    .maybeSingle()) as { data: ProfileRow | null; error: AuthError | null };

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      return {
        onboardingCompleted: false,
        hasProfile: false,
        hasActiveSession: true,
      };
    }

    throw new Error(error.message);
  }

  return {
    onboardingCompleted: data?.onboarding_completed ?? false,
    hasProfile: Boolean(data?.id),
    hasActiveSession: true,
  };
}
