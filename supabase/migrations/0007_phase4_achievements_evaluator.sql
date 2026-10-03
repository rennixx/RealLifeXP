-- Phase 4: Achievement and title mechanics for MVP.
--
-- Adds:
-- - Rule evaluator used by activity transactions.
-- - Generic achievement unlock flow for all configured rule types.
-- - atomic user-title unlocks.
-- - equip_title RPC for owned titles.

create or replace function public.evaluate_achievement_rule(
  p_rule_type text,
  p_rule_config jsonb,
  p_user_id uuid,
  p_template_category_id uuid,
  p_template_category_slug text,
  p_template_attribute_id uuid,
  p_template_xp_tier public.xp_tier,
  p_profile_total_xp bigint,
  p_character_level integer,
  p_total_activity_count integer,
  p_distinct_active_days integer
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_rule_minimum integer;
  v_category_slug text;
  v_attribute_slug text;
  v_category_level integer;
  v_attribute_level integer;
  v_tier public.xp_tier;
  v_count integer;
begin
  case p_rule_type
    when 'onboarding_completed' then
      return exists (
        select 1
        from public.profiles
        where id = p_user_id
          and onboarding_completed = true
      );

    when 'total_activity_count' then
      v_rule_minimum := coalesce((p_rule_config ->> 'min_count')::integer, 1);
      return p_total_activity_count >= v_rule_minimum;

    when 'total_xp' then
      v_rule_minimum := coalesce((p_rule_config ->> 'min_xp')::integer, 1);
      return p_profile_total_xp >= v_rule_minimum;

    when 'character_level' then
      v_rule_minimum := coalesce((p_rule_config ->> 'min_level')::integer, 1);
      return p_character_level >= v_rule_minimum;

    when 'active_category_count' then
      v_rule_minimum := coalesce((p_rule_config ->> 'min_count')::integer, 1);
      select count(*)
      into v_count
      from public.user_categories
      where user_id = p_user_id
        and is_selected = true;
      return v_count >= v_rule_minimum;

    when 'distinct_active_days' then
      v_rule_minimum := coalesce((p_rule_config ->> 'min_days')::integer, 1);
      return p_distinct_active_days >= v_rule_minimum;

    when 'category_level' then
      v_category_slug := nullif(trim(p_rule_config ->> 'category_slug'), '');
      if v_category_slug is null then
        v_category_slug := p_template_category_slug;
      end if;

      if v_category_slug is null then
        return false;
      end if;

      select uc.current_level
      into v_category_level
      from public.user_categories uc
      join public.categories c on c.id = uc.category_id
      where uc.user_id = p_user_id
        and c.slug = v_category_slug
      limit 1;

      v_rule_minimum := coalesce((p_rule_config ->> 'min_level')::integer, 1);
      return coalesce(v_category_level, 0) >= v_rule_minimum;

    when 'attribute_level' then
      v_attribute_slug := nullif(trim(p_rule_config ->> 'attribute_slug'), '');
      if v_attribute_slug is null then
        select a.slug
        into v_attribute_slug
        from public.attributes a
        where a.id = p_template_attribute_id;
      end if;

      if v_attribute_slug is null then
        return false;
      end if;

      select ua.current_level
      into v_attribute_level
      from public.user_attributes ua
      join public.attributes a on a.id = ua.attribute_id
      where ua.user_id = p_user_id
        and a.slug = v_attribute_slug
      limit 1;

      v_rule_minimum := coalesce((p_rule_config ->> 'min_level')::integer, 1);
      return coalesce(v_attribute_level, 0) >= v_rule_minimum;

    when 'activity_tier_count' then
      v_tier := coalesce((p_rule_config ->> 'xp_tier')::public.xp_tier, p_template_xp_tier);
      v_rule_minimum := coalesce((p_rule_config ->> 'min_count')::integer, 1);

      select count(*)
      into v_count
      from public.activity_logs
      where user_id = p_user_id
        and status = 'active'
        and xp_tier_snapshot = v_tier;

      return v_count >= v_rule_minimum;

    when 'category_activity_count' then
      v_category_slug := nullif(trim(p_rule_config ->> 'category_slug'), '');
      if v_category_slug is null then
        v_category_slug := p_template_category_slug;
      end if;

      if v_category_slug is null then
        return false;
      end if;

      select count(*)
      into v_count
      from public.activity_logs al
      join public.categories c on c.id = al.category_id
      where al.user_id = p_user_id
        and al.status = 'active'
        and c.slug = v_category_slug;

      v_rule_minimum := coalesce((p_rule_config ->> 'min_count')::integer, 1);
      return v_count >= v_rule_minimum;

    else
      raise exception 'UNSUPPORTED_ACHIEVEMENT_RULE'
        using message = format('Unsupported achievement rule_type %s', p_rule_type);
  end case;
end;
$$;

create or replace function public.log_activity(
  p_template_id uuid,
  p_note text default null,
  p_private_reflection text default null,
  p_duration_minutes integer default null,
  p_occurred_at timestamptz default timezone('utc', now()),
  p_client_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid := coalesce(p_client_request_id, gen_random_uuid());
  v_template record;
  v_existing_activity record;
  v_activity_id uuid;
  v_character_old_total bigint;
  v_character_old_level integer;
  v_character_new_total bigint;
  v_character_new_level integer;
  v_category_old_total bigint;
  v_category_old_level integer;
  v_category_new_total bigint;
  v_category_new_level integer;
  v_attribute_old_total bigint;
  v_attribute_old_level integer;
  v_attribute_new_total bigint;
  v_attribute_new_level integer;
  v_profile_total_count integer;
  v_distinct_active_days integer;
  v_new_achievements uuid[] := '{}'::uuid[];
  v_unlocked_achievements uuid[] := '{}'::uuid[];
  v_unlocked_titles uuid[] := '{}'::uuid[];
  v_row_count integer;
  v_ach_row record;
  v_character_current_progress_level integer;
  v_new_achievement_count integer;
  v_unlocked_achievement_slugs jsonb;
  v_unlocked_title_slugs jsonb;
  v_template_category_slug text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED'
      using message = 'A valid authenticated session is required to log activity.';
  end if;

  if p_template_id is null then
    raise exception 'INVALID_TEMPLATE_ID'
      using message = 'Template id is required.';
  end if;

  if p_duration_minutes is not null and (p_duration_minutes < 1 or p_duration_minutes > 1440) then
    raise exception 'INVALID_DURATION'
      using message = 'Duration must be between 1 and 1440 minutes.';
  end if;

  select
    at.id,
    at.category_id,
    at.attribute_id,
    c.slug as category_slug,
    at.name,
    at.description,
    at.xp_tier,
    at.xp_value,
    at.icon_key
  into v_template
  from public.activity_templates at
  join public.categories c on c.id = at.category_id
  join public.attributes a
    on a.id = at.attribute_id
    and a.category_id = at.category_id
  where at.id = p_template_id
    and at.is_archived = false
    and (at.owner_user_id is null or at.owner_user_id = v_user_id);

  if not found then
    raise exception 'INVALID_TEMPLATE'
      using message = 'Selected template is not visible for this user.';
  end if;

  v_template_category_slug := v_template.category_slug;

  select
    al.id,
    al.category_id,
    al.attribute_id,
    al.xp_value_snapshot,
    al.template_name_snapshot
  into v_existing_activity
  from public.activity_logs al
  where al.user_id = v_user_id
    and al.client_request_id = v_request_id
  limit 1;

  if found then
    select
      coalesce(pp.total_xp, 0),
      coalesce(pp.current_level, 1),
      coalesce(uc.total_xp, 0),
      coalesce(uc.current_level, 1),
      coalesce(ua.total_xp, 0),
      coalesce(ua.current_level, 1)
    into
      v_character_old_total,
      v_character_old_level,
      v_category_old_total,
      v_category_old_level,
      v_attribute_old_total,
      v_attribute_old_level
    from public.profile_progress pp
    left join public.user_categories uc on uc.user_id = v_user_id and uc.category_id = v_existing_activity.category_id
    left join public.user_attributes ua on ua.user_id = v_user_id and ua.attribute_id = v_existing_activity.attribute_id
    where pp.user_id = v_user_id;

    if not found then
      v_character_old_total := 0;
      v_character_old_level := 1;
      v_category_old_total := 0;
      v_category_old_level := 1;
      v_attribute_old_total := 0;
      v_attribute_old_level := 1;
    end if;

    return jsonb_build_object(
      'activityId', v_existing_activity.id,
      'xpAwarded', coalesce(v_existing_activity.xp_value_snapshot, 0),
      'character', jsonb_build_object(
        'oldLevel', v_character_old_level,
        'newLevel', v_character_old_level,
        'oldTotalXp', v_character_old_total,
        'newTotalXp', v_character_old_total
      ),
      'category', jsonb_build_object(
        'id', v_existing_activity.category_id,
        'oldLevel', v_category_old_level,
        'newLevel', v_category_old_level,
        'oldTotalXp', v_category_old_total,
        'newTotalXp', v_category_old_total
      ),
      'attribute', jsonb_build_object(
        'id', v_existing_activity.attribute_id,
        'oldLevel', v_attribute_old_level,
        'newLevel', v_attribute_old_level,
        'oldTotalXp', v_attribute_old_total,
        'newTotalXp', v_attribute_old_total
      ),
      'unlockedAchievements', '[]'::jsonb,
      'unlockedTitles', '[]'::jsonb
    );
  end if;

  select
    coalesce(pp.total_xp, 0),
    coalesce(pp.current_level, 1),
    coalesce(uc.total_xp, 0),
    coalesce(uc.current_level, 1),
    coalesce(ua.total_xp, 0),
    coalesce(ua.current_level, 1),
    pp.activity_count
  into
    v_character_old_total,
    v_character_old_level,
    v_category_old_total,
    v_category_old_level,
    v_attribute_old_total,
    v_attribute_old_level,
    v_profile_total_count
  from public.profile_progress pp
  left join public.user_categories uc on uc.user_id = v_user_id and uc.category_id = v_template.category_id
  left join public.user_attributes ua on ua.user_id = v_user_id and ua.attribute_id = v_template.attribute_id
  where pp.user_id = v_user_id;

  if not found then
    v_character_old_total := 0;
    v_character_old_level := 1;
    v_profile_total_count := 0;
    v_category_old_total := 0;
    v_category_old_level := 1;
    v_attribute_old_total := 0;
    v_attribute_old_level := 1;

    insert into public.profile_progress (user_id, total_xp, current_level, activity_count, achievement_count, distinct_active_days)
    values (v_user_id, 0, 1, 0, 0, 0);
  end if;

  if not exists (
    select 1
    from public.user_categories
    where user_id = v_user_id
      and category_id = v_template.category_id
  ) then
    insert into public.user_categories (user_id, category_id, is_selected, sort_order, total_xp, current_level)
    values (v_user_id, v_template.category_id, false, 0, 0, 1);
  end if;

  if not exists (
    select 1
    from public.user_attributes
    where user_id = v_user_id
      and attribute_id = v_template.attribute_id
  ) then
    insert into public.user_attributes (user_id, attribute_id, total_xp, current_level)
    values (v_user_id, v_template.attribute_id, 0, 1);
  end if;

  insert into public.activity_logs (
    user_id,
    template_id,
    category_id,
    attribute_id,
    template_name_snapshot,
    xp_tier_snapshot,
    xp_value_snapshot,
    source,
    note,
    private_reflection,
    duration_minutes,
    occurred_at,
    client_request_id
  )
  values (
    v_user_id,
    v_template.id,
    v_template.category_id,
    v_template.attribute_id,
    v_template.name,
    v_template.xp_tier,
    v_template.xp_value,
    'system_template',
    nullif(trim(p_note), ''),
    nullif(trim(p_private_reflection), ''),
    p_duration_minutes,
    coalesce(p_occurred_at, timezone('utc', now())),
    v_request_id
  )
  returning id into v_activity_id;

  insert into public.xp_ledger (
    user_id,
    category_id,
    attribute_id,
    activity_log_id,
    event_type,
    amount,
    source,
    metadata
  )
  values (
    v_user_id,
    v_template.category_id,
    v_template.attribute_id,
    v_activity_id,
    'activity_award',
    v_template.xp_value,
    'system_template',
    jsonb_build_object('template_id', v_template.id, 'client_request_id', v_request_id)
  );

  update public.user_categories
  set
    total_xp = total_xp + v_template.xp_value,
    current_level = public.level_from_total_xp(total_xp + v_template.xp_value),
    updated_at = timezone('utc', now())
  where user_id = v_user_id
    and category_id = v_template.category_id
  returning total_xp, current_level
  into v_category_new_total, v_category_new_level;

  update public.user_attributes
  set
    total_xp = total_xp + v_template.xp_value,
    current_level = public.level_from_total_xp(total_xp + v_template.xp_value),
    updated_at = timezone('utc', now())
  where user_id = v_user_id
    and attribute_id = v_template.attribute_id
  returning total_xp, current_level
  into v_attribute_new_total, v_attribute_new_level;

  update public.profile_progress
  set
    total_xp = total_xp + v_template.xp_value,
    current_level = public.level_from_total_xp(total_xp + v_template.xp_value),
    activity_count = activity_count + 1,
    distinct_active_days = (
      select coalesce(count(distinct (activity_logs.occurred_at AT TIME ZONE 'utc')::date), 0)
      from public.activity_logs
      where user_id = v_user_id
        and status = 'active'
    ),
    updated_at = timezone('utc', now())
  where user_id = v_user_id
  returning total_xp, current_level, activity_count, distinct_active_days
  into v_character_new_total, v_character_new_level, v_profile_total_count, v_distinct_active_days;

  if not found then
    insert into public.profile_progress (user_id, total_xp, current_level, activity_count, achievement_count, distinct_active_days)
    values (v_user_id, v_template.xp_value, public.level_from_total_xp(v_template.xp_value), 1, 0, 1)
    returning total_xp, current_level, activity_count, distinct_active_days
    into v_character_new_total, v_character_new_level, v_profile_total_count, v_distinct_active_days;
  end if;

  insert into public.user_template_preferences (
    user_id,
    template_id,
    is_favorite,
    last_used_at,
    use_count
  )
  values (v_user_id, v_template.id, false, timezone('utc', now()), 1)
  on conflict (user_id, template_id) do update
  set
    last_used_at = timezone('utc', now()),
    use_count = public.user_template_preferences.use_count + 1,
    updated_at = timezone('utc', now());

  v_new_achievement_count := 0;
  for v_ach_row in
    select a.id, a.slug, a.reward_title_id, a.rule_type, a.rule_config
    from public.achievements a
    where a.is_active = true
  loop
    if public.evaluate_achievement_rule(
      v_ach_row.rule_type,
      v_ach_row.rule_config,
      v_user_id,
      v_template.category_id,
      v_template_category_slug,
      v_template.attribute_id,
      v_template.xp_tier,
      v_character_new_total,
      v_character_new_level,
      v_profile_total_count,
      v_distinct_active_days
    ) then
      insert into public.user_achievements (user_id, achievement_id, trigger_activity_log_id)
      values (v_user_id, v_ach_row.id, v_activity_id)
      on conflict (user_id, achievement_id) do nothing;

      GET DIAGNOSTICS v_row_count = ROW_COUNT;
      if v_row_count = 1 then
        v_unlocked_achievements := array_append(v_unlocked_achievements, v_ach_row.id);
        v_new_achievement_count := v_new_achievement_count + 1;
        v_new_achievements := array_append(v_new_achievements, v_ach_row.id);

        if v_ach_row.reward_title_id is not null then
          insert into public.user_titles (user_id, title_id, source_achievement_id)
          values (v_user_id, v_ach_row.reward_title_id, v_ach_row.id)
          on conflict (user_id, title_id) do nothing;
          GET DIAGNOSTICS v_row_count = ROW_COUNT;
          if v_row_count = 1 then
            v_unlocked_titles := array_append(v_unlocked_titles, v_ach_row.reward_title_id);
          end if;
        end if;
      end if;
    end if;
  end loop;

  if v_new_achievement_count > 0 then
    update public.profile_progress
    set achievement_count = achievement_count + v_new_achievement_count
    where user_id = v_user_id;
    v_character_new_level := public.level_from_total_xp(v_character_new_total);
  end if;

  select coalesce(jsonb_agg(a.slug order by a.slug), '[]'::jsonb)
  into v_unlocked_achievement_slugs
  from public.achievements a
  where a.id = any (v_unlocked_achievements);

  select coalesce(jsonb_agg(t.slug order by t.slug), '[]'::jsonb)
  into v_unlocked_title_slugs
  from public.titles t
  where t.id = any (v_unlocked_titles);

  return jsonb_build_object(
    'activityId', v_activity_id,
    'xpAwarded', v_template.xp_value,
    'character', jsonb_build_object(
      'oldLevel', v_character_old_level,
      'newLevel', v_character_new_level,
      'oldTotalXp', v_character_old_total,
      'newTotalXp', v_character_new_total
    ),
    'category', jsonb_build_object(
      'id', v_template.category_id,
      'oldLevel', v_category_old_level,
      'newLevel', v_category_new_level,
      'oldTotalXp', v_category_old_total,
      'newTotalXp', v_category_new_total
    ),
    'attribute', jsonb_build_object(
      'id', v_template.attribute_id,
      'oldLevel', v_attribute_old_level,
      'newLevel', v_attribute_new_level,
      'oldTotalXp', v_attribute_old_total,
      'newTotalXp', v_attribute_new_total
    ),
    'unlockedAchievements', coalesce(v_unlocked_achievement_slugs, '[]'::jsonb),
    'unlockedTitles', coalesce(v_unlocked_title_slugs, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.log_activity to authenticated, service_role;

create or replace function public.equip_title(p_title_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED'
      using message = 'A valid authenticated session is required to equip a title.';
  end if;

  if p_title_id is null then
    raise exception 'INVALID_TITLE'
      using message = 'Title id is required.';
  end if;

  if not exists (
    select 1
    from public.user_titles
    where user_id = v_user_id
      and title_id = p_title_id
  ) then
    raise exception 'TITLE_NOT_OWNED'
      using message = 'You can only equip titles you own.';
  end if;

  update public.profiles
  set
    equipped_title_id = p_title_id,
    updated_at = timezone('utc', now())
  where id = v_user_id;
end;
$$;

grant execute on function public.equip_title to authenticated, service_role;
