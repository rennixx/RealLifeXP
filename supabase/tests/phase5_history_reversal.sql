-- Phase 5: SQL assertions for immutable activity reversal + history-facing contract.

do $$
declare
  v_function regprocedure;
  v_definition text;
begin
  v_function := to_regprocedure('public.reverse_activity(uuid)');
  if v_function is null then
    raise exception 'Function public.reverse_activity(uuid) is missing.';
  end if;

  select pg_get_functiondef(v_function) into v_definition;
  if v_definition is null then
    raise exception 'Could not inspect public.reverse_activity definition.';
  end if;

  if not (
    select exists (
      select 1
      from pg_proc
      where oid = v_function
        and prosecdef
    )
  ) then
    raise exception 'public.reverse_activity must be SECURITY DEFINER.';
  end if;

  if position('set search_path = public' in lower(v_definition)) = 0 then
    raise exception 'public.reverse_activity must set explicit search_path public.';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'ux_activity_log_reversal_once'
  ) then
    raise exception 'Expected reversal dedupe index ux_activity_log_reversal_once to exist.';
  end if;
end;
$$;

do $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_template_id uuid;
  v_template_xp integer;
  v_category_id uuid;
  v_attribute_id uuid;
  v_request_id uuid;
  v_activity_id uuid;
  v_char_before_total bigint;
  v_char_after_total bigint;
  v_char_before_level integer;
  v_char_before_count integer;
  v_cat_before_total bigint;
  v_cat_after_total bigint;
  v_attr_before_total bigint;
  v_attr_after_total bigint;
  v_profile_row_count bigint;
  v_reversal_payload jsonb;
  v_repeat_payload jsonb;
  v_reversal_xp bigint;
  v_reversal_count int;
  v_activity_status text;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users') then
    raise notice 'auth.users not available in this environment; skipping behavior assertions.';
    return;
  end if;

  select id into v_user_a
  from public.profiles
  order by created_at
  limit 1;

  if v_user_a is null then
    raise notice 'No seeded profile found; skipping behavior assertions.';
    return;
  end if;

  select id into v_user_b
  from public.profiles
  where id <> v_user_a
  order by created_at
  limit 1;

  select at.id,
         at.xp_value,
         at.category_id,
         at.attribute_id
    into v_template_id,
         v_template_xp,
         v_category_id,
         v_attribute_id
    from public.activity_templates at
   where at.owner_user_id is null
     and at.is_archived = false
   limit 1;

  if v_template_id is null then
    raise exception 'No system template available for reversal behavior assertions.';
  end if;

  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_user_a::text), true);

  select coalesce(total_xp, 0),
         coalesce(current_level, 1),
         coalesce(activity_count, 0)
    into v_char_before_total,
         v_char_before_level,
         v_char_before_count
    from public.profile_progress
   where user_id = v_user_a;

  v_char_before_total := coalesce(v_char_before_total, 0);
  v_char_before_level := coalesce(v_char_before_level, 1);
  v_char_before_count := coalesce(v_char_before_count, 0);

  select coalesce(total_xp, 0)
    into v_cat_before_total
    from public.user_categories
   where user_id = v_user_a
     and category_id = v_category_id;

  select coalesce(total_xp, 0)
    into v_attr_before_total
    from public.user_attributes
   where user_id = v_user_a
     and attribute_id = v_attribute_id;

  v_request_id := gen_random_uuid();
  select (public.log_activity(
    v_template_id,
    'phase5-reversal-test',
    null,
    null,
    null,
    v_request_id
  )->>'activityId')::uuid into v_activity_id;

  if v_activity_id is null then
    raise exception 'log_activity did not return an activity id for phase 5 reversal test.';
  end if;

  select status into v_activity_status from public.activity_logs where id = v_activity_id and user_id = v_user_a;
  if v_activity_status <> 'active' then
    raise exception 'Expected reversal source activity to start active.';
  end if;

  v_reversal_payload := public.reverse_activity(v_activity_id);

  if (v_reversal_payload->>'activityId')::uuid <> v_activity_id then
    raise exception 'reverse_activity returned mismatch activity_id.';
  end if;

  v_reversal_xp := (v_reversal_payload->>'xpAwarded')::bigint;
  if v_reversal_xp <> (-coalesce(v_template_xp, 0)) then
    raise exception 'reverse_activity should return negative awarded XP for first reversal.';
  end if;

  select coalesce(total_xp, 0),
         coalesce(activity_count, 0)
    into v_char_after_total,
         v_profile_row_count
    from public.profile_progress
   where user_id = v_user_a;

  if coalesce(v_char_after_total, 0) <> greatest(v_char_before_total - coalesce(v_template_xp, 0), 0) then
    raise exception 'Character total XP did not revert correctly after reversal.';
  end if;

  if coalesce(v_profile_row_count, 0) <> greatest(v_char_before_count - 1, 0) then
    raise exception 'Character activity_count did not decrement on reversal.';
  end if;

  select coalesce(total_xp, 0)
    into v_cat_after_total
    from public.user_categories
   where user_id = v_user_a
     and category_id = v_category_id;

  if coalesce(v_cat_after_total, 0) <> greatest(coalesce(v_cat_before_total, 0) - coalesce(v_template_xp, 0), 0) then
    raise exception 'Category XP did not revert correctly after reversal.';
  end if;

  select coalesce(total_xp, 0)
    into v_attr_after_total
    from public.user_attributes
   where user_id = v_user_a
     and attribute_id = v_attribute_id;

  if coalesce(v_attr_after_total, 0) <> greatest(coalesce(v_attr_before_total, 0) - coalesce(v_template_xp, 0), 0) then
    raise exception 'Attribute XP did not revert correctly after reversal.';
  end if;

  select status into v_activity_status from public.activity_logs where id = v_activity_id;
  if v_activity_status <> 'reversed' then
    raise exception 'Activity status was not updated to reversed.';
  end if;

  select count(*)
    into v_profile_row_count
    from public.xp_ledger
   where user_id = v_user_a
     and activity_log_id = v_activity_id
     and event_type = 'activity_reversal';

  if v_profile_row_count <> 1 then
    raise exception 'reverse_activity should create exactly one reversal ledger row.';
  end if;

  v_repeat_payload := public.reverse_activity(v_activity_id);
  if (v_repeat_payload->>'xpAwarded')::bigint <> 0 then
    raise exception 'Re-reversing an activity should be idempotent and return zero delta.';
  end if;

  select status into v_activity_status from public.activity_logs where id = v_activity_id;
  if v_activity_status <> 'reversed' then
    raise exception 'Reversed activity should remain reversed after duplicate requests.';
  end if;

  select count(*)
    into v_profile_row_count
    from public.xp_ledger
   where user_id = v_user_a
     and activity_log_id = v_activity_id
     and event_type = 'activity_reversal';

  if v_profile_row_count <> 1 then
    raise exception 'Idempotent reversal should not add additional ledger rows.';
  end if;

  select count(*)
    into v_reversal_count
    from public.xp_ledger
   where user_id = v_user_a
     and event_type = 'activity_reversal';
  if v_reversal_count = 0 then
    raise exception 'Expected reversal to create at least one reversal ledger entry.';
  end if;

  if v_user_b is not null then
    perform set_config('request.jwt.claim.sub', v_user_b::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_user_b::text), true);

    begin
      perform public.reverse_activity(v_activity_id);
      raise exception 'Cross-user reverse attempt was unexpectedly accepted.';
    exception
      when others then
        if SQLSTATE <> 'P0001' or position('ACTIVITY_NOT_FOUND' in SQLERRM) = 0 then
          raise exception 'Cross-user reverse behavior changed: %', SQLERRM;
        end if;
    end;

    perform set_config('request.jwt.claim.sub', v_user_a::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_user_a::text), true);
  end if;
end;
$$;
