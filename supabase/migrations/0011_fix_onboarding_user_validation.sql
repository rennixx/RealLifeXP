-- Fix onboarding path for stale/invalid sessions.
-- Ensure auth user exists before writing profile rows so we fail with a clear error
-- instead of a lower-level foreign key violation.

create or replace function public.complete_onboarding(
  p_display_name text,
  p_handle text,
  p_emblem_key text,
  p_category_ids uuid[],
  p_template_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_normalized_handle text := lower(trim(p_handle));
  v_normalized_emblem text := coalesce(nullif(trim(p_emblem_key), ''), 'atlas-default');
  v_selected_categories int;
  v_active_template_count int;
  v_profile_row record;
  v_title_id uuid;
  v_achievement_id uuid;
  v_valid_emblems text[] := array['atlas-default', 'raven', 'flare', 'prism', 'cipher'];
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED'
      using message = 'Missing authenticated user for onboarding.';
  end if;

  if not exists (select 1 from auth.users where id = v_user_id) then
    raise exception 'AUTH_USER_NOT_FOUND'
      using message = 'Your session is no longer valid. Please sign out and sign in again.';
  end if;

  if char_length(trim(p_display_name)) < 1 or char_length(trim(p_display_name)) > 50 then
    raise exception 'INVALID_DISPLAY_NAME'
      using message = 'Display name must be between 1 and 50 characters.';
  end if;

  if char_length(v_normalized_handle) < 3 or char_length(v_normalized_handle) > 24 then
    raise exception 'INVALID_HANDLE'
      using message = 'Handle must be between 3 and 24 characters.';
  end if;

  if v_normalized_handle !~ '^[a-zA-Z0-9_]+$' then
    raise exception 'INVALID_HANDLE'
      using message = 'Handle may include only letters, numbers, and underscores.';
  end if;

  if not (v_normalized_emblem = ANY (v_valid_emblems)) then
    raise exception 'INVALID_EMBLEM'
      using message = 'Selected emblem is invalid.';
  end if;

  if array_length(coalesce(p_category_ids, '{}'::uuid[]), 1) < 3
    or array_length(coalesce(p_category_ids, '{}'::uuid[]), 1) > 6 then
    raise exception 'INVALID_CATEGORY_COUNT'
      using message = 'Choose between 3 and 6 categories.';
  end if;

  select count(*)
  into v_selected_categories
  from public.categories
  where is_active = true
    and id = any(p_category_ids);

  if v_selected_categories <> array_length(p_category_ids, 1) then
    raise exception 'INVALID_CATEGORY_SELECTION'
      using message = 'Selected categories are invalid or inactive.';
  end if;

  insert into public.profiles (
    id,
    handle,
    display_name,
    emblem_key,
    onboarding_completed
  )
  values (v_user_id, v_normalized_handle, trim(p_display_name), v_normalized_emblem, true)
  on conflict (id) do update
    set display_name = excluded.display_name,
        handle = excluded.handle,
        emblem_key = excluded.emblem_key,
        onboarding_completed = true,
        updated_at = timezone('utc', now());

  delete from public.user_categories where user_id = v_user_id;

  insert into public.user_categories (user_id, category_id, is_selected, sort_order, total_xp, current_level)
  select
    v_user_id,
    category_id,
    true,
    sort_order,
    0,
    1
  from (
    select
      category_id,
      row_number() over (order by ordinality) as sort_order
    from unnest(p_category_ids) with ordinality as categories(category_id, ordinality)
  ) ordered_categories
  where exists (
    select 1
    from public.categories
    where id = ordered_categories.category_id and is_active
  )
  on conflict (user_id, category_id) do update
    set is_selected = true,
        sort_order = excluded.sort_order,
        total_xp = coalesce(public.user_categories.total_xp, 0),
        current_level = coalesce(public.user_categories.current_level, 1);

  insert into public.user_attributes (user_id, attribute_id, total_xp, current_level)
  select v_user_id, a.id, 0, 1
  from public.attributes a
  where a.category_id = any(p_category_ids)
  on conflict (user_id, attribute_id) do nothing;

  select count(*)
  into v_active_template_count
  from unnest(p_template_ids) as template_id(template_id)
  join public.activity_templates at
    on at.id = template_id.template_id
  where at.owner_user_id is null
    and at.is_archived = false
    and at.category_id = any(p_category_ids);

  if v_active_template_count <> coalesce(array_length(p_template_ids, 1), 0) then
    raise exception 'INVALID_TEMPLATE_SELECTION'
      using message = 'Selected templates are invalid for this account.';
  end if;

  insert into public.user_template_preferences (user_id, template_id, is_favorite, last_used_at, use_count)
  select
    v_user_id,
    template_id,
    true,
    null,
    0
  from (
    select distinct unnest(p_template_ids) as template_id
    where array_length(p_template_ids, 1) is not null
  ) favorites
  where exists (
    select 1
    from public.activity_templates at
    where at.id = favorites.template_id
      and at.owner_user_id is null
      and at.is_archived = false
      and at.category_id = any(p_category_ids)
  )
  on conflict (user_id, template_id) do update
    set is_favorite = true;

  insert into public.profile_progress (user_id, total_xp, current_level, activity_count, achievement_count, distinct_active_days)
  values (v_user_id, 0, 1, 0, 0, 0)
  on conflict (user_id) do nothing;

  select id into v_title_id
  from public.titles
  where slug = 'the-initiate'
  limit 1;

  select id into v_achievement_id
  from public.achievements
  where slug = 'character-created'
  limit 1;

  if v_achievement_id is not null then
    insert into public.user_achievements (user_id, achievement_id, trigger_activity_log_id)
    values (v_user_id, v_achievement_id, null)
    on conflict (user_id, achievement_id) do nothing;

    if v_title_id is not null then
      insert into public.user_titles (user_id, title_id, source_achievement_id)
      values (v_user_id, v_title_id, v_achievement_id)
      on conflict (user_id, title_id) do nothing;

      update public.profiles
      set equipped_title_id = v_title_id,
          updated_at = timezone('utc', now())
      where id = v_user_id;
    end if;
  end if;

  select * into v_profile_row
  from public.profiles
  where id = v_user_id;

  return v_profile_row.id;
end;
$$;

grant execute on function public.complete_onboarding to authenticated, service_role;
