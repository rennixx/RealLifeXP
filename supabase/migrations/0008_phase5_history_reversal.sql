-- Phase 5: Activity history reversal support.
-- Adds an idempotent reverse_activity RPC and a dedicated ledger guard to keep one
-- reversal row per activity log.

create unique index if not exists ux_activity_log_reversal_once
  on public.xp_ledger (activity_log_id)
  where event_type = 'activity_reversal'::public.xp_event_type;

create or replace function public.reverse_activity(
  p_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_activity record;
  v_char_old_total bigint;
  v_char_old_level integer;
  v_char_new_total bigint;
  v_char_new_level integer;
  v_char_new_activity_count integer;
  v_char_new_active_days integer;
  v_cat_old_total bigint;
  v_cat_old_level integer;
  v_cat_new_total bigint;
  v_cat_new_level integer;
  v_attr_old_total bigint;
  v_attr_old_level integer;
  v_attr_new_total bigint;
  v_attr_new_level integer;
  v_reversed_already boolean;
  v_xp_value integer;
  v_category_id uuid;
  v_attribute_id uuid;
  v_profile_row_count integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED'
      using message = 'A valid authenticated session is required to reverse activities.';
  end if;

  if p_activity_id is null then
    raise exception 'INVALID_ACTIVITY_ID'
      using message = 'Activity id is required.';
  end if;

  select
    id,
    category_id,
    attribute_id,
    xp_value_snapshot,
    status
  into v_activity
  from public.activity_logs
  where user_id = v_user_id
    and id = p_activity_id
  for update;

  if not found then
    raise exception 'ACTIVITY_NOT_FOUND'
      using message = 'The selected activity does not exist for this user.';
  end if;

  v_category_id := v_activity.category_id;
  v_attribute_id := v_activity.attribute_id;
  v_xp_value := coalesce(v_activity.xp_value_snapshot, 0);
  v_reversed_already := (v_activity.status = 'reversed');

  select
    coalesce(pp.total_xp, 0),
    coalesce(pp.current_level, 1),
    coalesce(pp.activity_count, 0)
  into
    v_char_old_total,
    v_char_old_level,
    v_char_new_activity_count
  from public.profile_progress pp
  where pp.user_id = v_user_id;

  if not found then
    v_char_old_total := 0;
    v_char_old_level := 1;
    v_char_new_activity_count := 0;

    insert into public.profile_progress (user_id, total_xp, current_level, activity_count, achievement_count, distinct_active_days)
    values (v_user_id, 0, 1, 0, 0, 0);
  end if;

  select
    coalesce(uc.total_xp, 0),
    coalesce(uc.current_level, 1)
  into
    v_cat_old_total,
    v_cat_old_level
  from public.user_categories uc
  where uc.user_id = v_user_id
    and uc.category_id = v_category_id;

  if not found then
    v_cat_old_total := 0;
    v_cat_old_level := 1;
  end if;

  select
    coalesce(ua.total_xp, 0),
    coalesce(ua.current_level, 1)
  into
    v_attr_old_total,
    v_attr_old_level
  from public.user_attributes ua
  where ua.user_id = v_user_id
    and ua.attribute_id = v_attribute_id;

  if not found then
    v_attr_old_total := 0;
    v_attr_old_level := 1;
  end if;

  if v_reversed_already then
    v_cat_new_total := v_cat_old_total;
    v_cat_new_level := v_cat_old_level;
    v_attr_new_total := v_attr_old_total;
    v_attr_new_level := v_attr_old_level;
    v_char_new_total := v_char_old_total;
    v_char_new_level := v_char_old_level;
  else
    update public.user_categories
    set
      total_xp = greatest(total_xp - v_xp_value, 0),
      current_level = public.level_from_total_xp(greatest(total_xp - v_xp_value, 0)),
      updated_at = timezone('utc', now())
    where user_id = v_user_id
      and category_id = v_category_id
    returning total_xp, current_level
    into v_cat_new_total, v_cat_new_level;

    if not found then
      v_cat_new_total := v_cat_old_total;
      v_cat_new_level := v_cat_old_level;
    end if;

    update public.user_attributes
    set
      total_xp = greatest(total_xp - v_xp_value, 0),
      current_level = public.level_from_total_xp(greatest(total_xp - v_xp_value, 0)),
      updated_at = timezone('utc', now())
    where user_id = v_user_id
      and attribute_id = v_attribute_id
    returning total_xp, current_level
    into v_attr_new_total, v_attr_new_level;

    if not found then
      v_attr_new_total := v_attr_old_total;
      v_attr_new_level := v_attr_old_level;
    end if;

    update public.profile_progress
    set
      total_xp = greatest(total_xp - v_xp_value, 0),
      current_level = public.level_from_total_xp(greatest(total_xp - v_xp_value, 0)),
      activity_count = greatest(activity_count - 1, 0),
      distinct_active_days = (
        select coalesce(count(distinct (al.occurred_at AT TIME ZONE 'utc')::date), 0)
        from public.activity_logs al
        where al.user_id = v_user_id
          and al.status = 'active'
      ),
      updated_at = timezone('utc', now())
    where user_id = v_user_id
    returning total_xp, current_level, activity_count, distinct_active_days
    into v_char_new_total, v_char_new_level, v_char_new_activity_count, v_char_new_active_days;

    if found then
      v_char_old_level := coalesce(v_char_old_level, public.level_from_total_xp(v_char_old_total));
      v_char_new_level := coalesce(v_char_new_level, public.level_from_total_xp(v_char_new_total));
    else
      v_char_new_total := v_char_old_total;
      v_char_new_level := v_char_old_level;
      v_char_new_activity_count := coalesce(v_char_new_activity_count, 0);
      v_char_new_active_days := 0;
    end if;

    update public.activity_logs
    set
      status = 'reversed',
      reversed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where id = p_activity_id;

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
      v_category_id,
      v_attribute_id,
      v_activity.id,
      'activity_reversal',
      -v_xp_value,
      'reversal',
      jsonb_build_object('activity_log_id', v_activity.id, 'source_activity_id', v_activity.id)
    )
    on conflict (activity_log_id) do nothing;
  end if;

  get diagnostics v_profile_row_count = row_count;
  if v_profile_row_count = 0 and not v_reversed_already then
    select count(*)
      into v_profile_row_count
      from public.xp_ledger
      where activity_log_id = p_activity_id
        and event_type = 'activity_reversal'::public.xp_event_type;

    if v_profile_row_count = 0 then
      insert into public.profile_progress (
        user_id,
        total_xp,
        current_level,
        activity_count,
        achievement_count,
        distinct_active_days
      )
      values (
        v_user_id,
        v_char_old_total,
        v_char_old_level,
        v_char_new_activity_count,
        0,
        0
      );
    end if;
  end if;

  if not v_reversed_already then
    select total_xp, current_level
    into v_cat_new_total, v_cat_new_level
    from public.user_categories
    where user_id = v_user_id
      and category_id = v_category_id;

    select total_xp, current_level
    into v_attr_new_total, v_attr_new_level
    from public.user_attributes
    where user_id = v_user_id
      and attribute_id = v_attribute_id;

    if v_cat_new_total is null then
      v_cat_new_total := v_cat_old_total;
      v_cat_new_level := v_cat_old_level;
    end if;

    if v_attr_new_total is null then
      v_attr_new_total := v_attr_old_total;
      v_attr_new_level := v_attr_old_level;
    end if;
  end if;

  return jsonb_build_object(
    'activityId', v_activity.id,
    'xpAwarded', case
      when v_reversed_already then 0
      else -v_xp_value
    end,
    'character', jsonb_build_object(
      'oldLevel', v_char_old_level,
      'newLevel', coalesce(v_char_new_level, v_char_old_level),
      'oldTotalXp', v_char_old_total,
      'newTotalXp', coalesce(v_char_new_total, v_char_old_total)
    ),
    'category', jsonb_build_object(
      'id', v_category_id,
      'oldLevel', v_cat_old_level,
      'newLevel', coalesce(v_cat_new_level, v_cat_old_level),
      'oldTotalXp', v_cat_old_total,
      'newTotalXp', coalesce(v_cat_new_total, v_cat_old_total)
    ),
    'attribute', jsonb_build_object(
      'id', v_attribute_id,
      'oldLevel', v_attr_old_level,
      'newLevel', coalesce(v_attr_new_level, v_attr_old_level),
      'oldTotalXp', v_attr_old_total,
      'newTotalXp', coalesce(v_attr_new_total, v_attr_old_total)
    )
  );
end;
$$;

grant execute on function public.reverse_activity to authenticated, service_role;
