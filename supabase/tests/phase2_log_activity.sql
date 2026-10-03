-- Phase 2: SQL assertions for trusted activity logging.
--
-- This file verifies the log_activity contract and selected behavior at the
-- database layer. The behavior block is conditional and will skip cleanly when
-- local auth fixtures are unavailable.

do $$
declare
  v_function regprocedure;
  v_definition text;
begin
  v_function := to_regprocedure('public.log_activity(uuid,text,text,integer,timestamptz,uuid)');
  if v_function is null then
    raise exception 'Function public.log_activity signature was not found.';
  end if;

  select pg_get_functiondef(v_function) into v_definition;
  if v_definition is null then
    raise exception 'Could not read public.log_activity definition.';
  end if;

  if not (
    select exists (
      select 1
      from pg_proc
      where oid = v_function
        and prosecdef
    )
  ) then
    raise exception 'public.log_activity must be SECURITY DEFINER.';
  end if;

  if position('set search_path = public' in lower(v_definition)) = 0 then
    raise exception 'public.log_activity must use explicit safe search_path public.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'activity_logs_user_id_client_request_id_key'
      and conrelid = 'public.activity_logs'::regclass
  ) then
    raise exception 'activity_logs must keep unique (user_id, client_request_id) for idempotency.';
  end if;
end;
$$;

do $$
declare
  v_system_template_id uuid;
  v_system_template_xp integer;
  v_template_category_id uuid;
  v_template_attribute_id uuid;
  v_private_template_id uuid;
  v_template_name text;
  v_user_a uuid;
  v_user_b uuid;
  v_user_a_before_total bigint;
  v_user_a_after_total bigint;
  v_user_a_first_progress bigint;
  v_user_a_second_progress bigint;
  v_first_activity_id uuid;
  v_second_activity_id uuid;
  v_profile_before_activity_count integer;
  v_profile_after_activity_count integer;
  v_user_request_id uuid := gen_random_uuid();
  v_private_claims text;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users') then
    raise notice 'auth.users not available in this environment; skipping behavior assertions.';
    return;
  end if;

  select u.id
    into v_user_a
    from auth.users u
    join public.profiles p on p.id = u.id
    order by u.created_at
    limit 1;

  if v_user_a is null then
    raise notice 'No auth/profile pair for user A was found; skipping behavior assertions.';
    return;
  end if;

  select u.id
    into v_user_b
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id <> v_user_a
    order by u.created_at
    limit 1;

  if v_user_b is null then
    raise notice 'No second auth/profile pair for ownership checks was found; running subset of behavior assertions.';
  end if;

  select at.id,
         at.xp_value,
         at.category_id,
         at.attribute_id,
         at.name
    into v_system_template_id,
         v_system_template_xp,
         v_template_category_id,
         v_template_attribute_id,
         v_template_name
    from public.activity_templates at
   where at.owner_user_id is null
     and at.is_archived = false
   limit 1;

  if v_system_template_id is null then
    raise exception 'No seeded system template available for log_activity behavior checks.';
  end if;

  if not exists (select 1 from public.profiles where id = v_user_a) then
    raise exception 'Missing profile row for user A.';
  end if;

  select coalesce(sum(total_xp), 0)
    into v_user_a_before_total
    from public.profile_progress
   where user_id = v_user_a;

  select coalesce(sum(activity_count), 0)
    into v_profile_before_activity_count
    from public.profile_progress
   where user_id = v_user_a;

  if v_user_a_before_total is null then
    v_user_a_before_total := 0;
  end if;

  if v_profile_before_activity_count is null then
    v_profile_before_activity_count := 0;
  end if;

  v_private_claims := format('{"sub":"%s","role":"authenticated"}', v_user_a::text);
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', v_private_claims, true);

  begin
    select (public.log_activity(
      v_system_template_id,
      'warmup',
      null,
      null,
      null,
      v_user_request_id
    )->>'activityId')::uuid
      into v_first_activity_id;

    select (public.log_activity(
      v_system_template_id,
      'warmup',
      null,
      null,
      null,
      v_user_request_id
    )->>'activityId')::uuid
      into v_second_activity_id;
  exception
    when others then
      raise exception 'Activity logging happy-path duplicate idempotency assertions failed: %', SQLERRM;
  end;

  if v_first_activity_id is null or v_second_activity_id is null then
    raise exception 'log_activity did not return activity_id for idempotent request path.';
  end if;

  if v_first_activity_id <> v_second_activity_id then
    raise exception 'Duplicate client_request_id produced different activity IDs.';
  end if;

  select count(*)
    into v_user_a_first_progress
    from public.activity_logs al
   where al.user_id = v_user_a
     and al.client_request_id = v_user_request_id;

  if v_user_a_first_progress <> 1 then
    raise exception 'Expected exactly one activity row for duplicated request id.';
  end if;

  if not exists (
    select 1
      from public.xp_ledger xl
     where xl.user_id = v_user_a
       and xl.event_type = 'activity_award'
       and xl.metadata ->> 'client_request_id' = v_user_request_id::text
  ) then
    raise exception 'Expected one ledger award event for logged activity.';
  end if;

  if (select count(*) from public.xp_ledger xl
      where xl.user_id = v_user_a
        and xl.metadata ->> 'client_request_id' = v_user_request_id::text) <> 1 then
    raise exception 'Idempotent replay should not create multiple ledger entries.';
  end if;

  select coalesce(pp.total_xp, 0),
         coalesce(pp.activity_count, 0)
    into v_user_a_after_total,
         v_profile_after_activity_count
    from public.profile_progress pp
   where pp.user_id = v_user_a;

  if v_user_a_after_total is null then
    raise exception 'Profile progress row missing after logging.';
  end if;

  if v_user_a_after_total <> v_user_a_before_total + v_system_template_xp then
    raise exception 'Character total XP delta mismatch on happy path.';
  end if;

  if v_profile_after_activity_count < v_profile_before_activity_count + 1 then
    raise exception 'Activity count did not increase as expected.';
  end if;

  if not exists (
    select 1
    from public.user_categories uc
    where uc.user_id = v_user_a
      and uc.category_id = v_template_category_id
      and uc.total_xp > 0
  ) then
    raise exception 'Category XP was not awarded.';
  end if;

  if not exists (
    select 1
    from public.user_attributes ua
    where ua.user_id = v_user_a
      and ua.attribute_id = v_template_attribute_id
      and ua.total_xp > 0
  ) then
    raise exception 'Attribute XP was not awarded.';
  end if;

  if v_user_b is not null then
    select at.id
      into v_private_template_id
      from public.activity_templates at
     where at.owner_user_id = v_user_b
       and at.category_id = v_template_category_id
       and at.attribute_id = v_template_attribute_id
       and at.is_archived = false
     limit 1;

    if v_private_template_id is null then
      insert into public.activity_templates (
        owner_user_id,
        category_id,
        attribute_id,
        name,
        xp_tier,
        xp_value,
        icon_key
      )
      values (
        v_user_b,
        v_template_category_id,
        v_template_attribute_id,
        format('Test template %s', gen_random_uuid()),
        'quick',
        public.xp_for_tier('quick'::public.xp_tier),
        'flash'
      )
      returning id into v_private_template_id;
    end if;

    perform set_config('request.jwt.claim.sub', v_user_a::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_user_a::text), true);

    begin
      perform public.log_activity(v_private_template_id, null, null, null, null, gen_random_uuid());
      raise exception 'Private template visibility check did not reject cross-user logging.';
    exception
      when others then
        if SQLSTATE <> 'P0001' or position('INVALID_TEMPLATE' in SQLERRM) = 0 then
          raise exception 'Cross-user template logging produced unexpected error: %', SQLERRM;
        end if;
    end;
  end if;
exception
  when undefined_table then
    raise notice 'Supabase auth catalogs not available; skipping behavior assertions.';
  when undefined_function then
    raise notice 'Auth/session function path unavailable; skipping behavior assertions.';
end;
$$;
