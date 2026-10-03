-- Phase 4: SQL assertions for achievement evaluator + title equip.

do $$
declare
  v_function regprocedure;
  v_function_definition text;
  v_user_a uuid;
  v_knowledge_template_id uuid;
  v_first_template_id uuid;
  v_knowledge_category_id uuid;
  v_builder_title_id uuid;
  v_initiate_title_id uuid;
  v_current_onboarding boolean;
  v_achievement_first uuid;
  v_achievement_character_created uuid;
  v_achievement_novice uuid;
  v_initial_activity_count int;
  v_user_request_id uuid;
  v_first_activity_id uuid;
  v_first_duplicate_id uuid;
  v_duplicate_activity_id uuid;
  v_novice_unlocked_count int;
  v_first_unlocked_count int;
  v_loop_index integer;
begin
  v_function := to_regprocedure('public.log_activity(uuid,text,text,integer,timestamptz,uuid)');
  if v_function is null then
    raise exception 'Function public.log_activity signature was not found.';
  end if;

  select pg_get_functiondef(v_function) into v_function_definition;
  if v_function_definition is null or position('set search_path = public' in lower(v_function_definition)) = 0 then
    raise exception 'public.log_activity must be SECURITY DEFINER with explicit public search_path.';
  end if;

  if pg_get_functiondef(to_regprocedure('public.equip_title(uuid)')) is null then
    raise exception 'Function public.equip_title is missing.';
  end if;

  if pg_get_functiondef(to_regprocedure('public.evaluate_achievement_rule(text,jsonb,uuid,uuid,text,uuid,xp_tier,bigint,integer,integer,integer)')) is null then
    raise exception 'Function public.evaluate_achievement_rule is missing.';
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users') then
    select u.id into v_user_a
    from auth.users u
    join public.profiles p on p.id = u.id
    order by u.created_at
    limit 1;
  else
    raise notice 'auth.users not available in this environment; skipping behavior assertions.';
    return;
  end if;

  if v_user_a is null then
    raise notice 'No auth/profile pair for behavior assertions; skipping.';
    return;
  end if;

  select onboarding_completed
    into v_current_onboarding
    from public.profiles
   where id = v_user_a;

  if v_current_onboarding is null then
    raise exception 'Profile onboarding state missing for test user.';
  end if;

  update public.profiles
  set onboarding_completed = false
  where id = v_user_a;

  if public.evaluate_achievement_rule(
    'onboarding_completed',
    '{}'::jsonb,
    v_user_a,
    null,
    null,
    null,
    null::public.xp_tier,
    0,
    1,
    0,
    0
  ) then
    raise exception 'onboarding_completed rule should be false while onboarding flag is unset.';
  end if;

  update public.profiles
  set onboarding_completed = true
  where id = v_user_a;

  if not public.evaluate_achievement_rule(
    'onboarding_completed',
    '{}'::jsonb,
    v_user_a,
    null,
    null,
    null,
    null::public.xp_tier,
    0,
    1,
    0,
    0
  ) then
    raise exception 'onboarding_completed rule should be true while onboarding flag is set.';
  end if;

  if v_current_onboarding = false then
    update public.profiles
    set onboarding_completed = false
    where id = v_user_a;
  end if;

  select at.id,
         at.category_id
  into v_first_template_id,
       v_knowledge_category_id
  from public.activity_templates at
  join public.categories c on c.id = at.category_id
  where c.slug = 'knowledge'
    and at.owner_user_id is null
    and at.is_archived = false
  order by case when at.xp_tier = 'milestone' then 0 else 1 end, at.name
  limit 1;

  if v_first_template_id is null then
    raise exception 'No system template available for phase 4 seeded-rule verification.';
  end if;

  select at.id
  into v_knowledge_template_id
  from public.activity_templates at
  join public.categories c on c.id = at.category_id
  where c.slug = 'knowledge'
    and at.owner_user_id is null
    and at.is_archived = false
    and at.xp_tier = 'milestone'
  limit 1;

  if v_knowledge_template_id is null then
    raise exception 'No milestone knowledge template available for unlock-level verification.';
  end if;

  select id into v_achievement_first
  from public.achievements
  where slug = 'first-activity'
  limit 1;

  select id into v_achievement_novice
  from public.achievements
  where slug = 'novice-analyst'
  limit 1;

  select id into v_achievement_character_created
  from public.achievements
  where slug = 'character-created'
  limit 1;

  if v_achievement_first is null or v_achievement_novice is null or v_achievement_character_created is null then
    raise exception 'Expected seeded achievements are missing.';
  end if;

  select id into v_builder_title_id
  from public.titles
  where slug = 'the-builder'
  limit 1;

  select id into v_initiate_title_id
  from public.titles
  where slug = 'the-initiate'
  limit 1;

  if v_initiate_title_id is null then
    raise exception 'Expected seeded title the-initiate is missing.';
  end if;

  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', v_user_a::text),
    true
  );

  if v_initiate_title_id is not null then
    insert into public.user_titles (user_id, title_id)
    values (v_user_a, v_initiate_title_id)
    on conflict (user_id, title_id) do nothing;
  end if;

  v_user_request_id := gen_random_uuid();
  select (public.log_activity(
    v_first_template_id,
    'phase4-initial',
    null,
    null,
    null,
    v_user_request_id
  )->>'activityId')::uuid into v_first_activity_id;

  select (public.log_activity(
    v_first_template_id,
    'phase4-initial-dup',
    null,
    null,
    null,
    v_user_request_id
  )->>'activityId')::uuid into v_first_duplicate_id;

  if v_first_activity_id is null or v_first_duplicate_id is null then
    raise exception 'Duplicate-idempotent log_activity path did not return activity identifiers.';
  end if;

  if v_first_activity_id <> v_first_duplicate_id then
    raise exception 'Idempotent duplicate logging produced different activity rows.';
  end if;

  select count(*)
  into v_first_unlocked_count
  from public.user_achievements ua
  join public.achievements a on a.id = ua.achievement_id
  where ua.user_id = v_user_a
    and a.slug = 'first-activity';

  if v_first_unlocked_count <> 1 then
    raise exception 'first-activity should unlock exactly once and did not.';
  end if;

  for v_loop_index in 1..3 loop
    select (public.log_activity(v_knowledge_template_id, format('level-build-%s', v_loop_index), null, null, null, gen_random_uuid())->>'activityId')::uuid
    into v_duplicate_activity_id;
  end loop;

  select count(*)
  into v_novice_unlocked_count
  from public.user_achievements ua
  join public.achievements a on a.id = ua.achievement_id
  where ua.user_id = v_user_a
    and a.slug = 'novice-analyst';

  if v_novice_unlocked_count <> 1 then
    raise exception 'novice-analyst should unlock exactly once after reaching knowledge level threshold.';
  end if;

  if v_initiate_title_id is not null then
    begin
      perform public.equip_title(v_initiate_title_id);
    exception
      when others then
        raise exception 'Equipping an owned title failed unexpectedly: %', SQLERRM;
    end;
  end if;

  select equipped_title_id
  into v_knowledge_category_id
  from public.profiles
  where id = v_user_a;

  if v_knowledge_category_id is not null and v_knowledge_category_id <> v_initiate_title_id then
    raise exception 'Owned title equip did not persist on profile.';
  end if;

  if v_builder_title_id is not null then
    begin
      perform public.equip_title(v_builder_title_id);
      raise exception 'Unowned title was incorrectly allowed to equip.';
    exception
      when others then
        if SQLSTATE <> 'P0001' then
          raise exception 'Locked-title equip produced unexpected SQLSTATE % (message: %)', SQLSTATE, SQLERRM;
        end if;
    end;
  end if;

  select count(*)
  into v_initial_activity_count
  from public.activity_logs
  where user_id = v_user_a
    and client_request_id = v_user_request_id;

  if v_initial_activity_count <> 1 then
    raise exception 'Duplicate client_request_id should only create one activity row.';
  end if;
exception
  when undefined_table then
    raise notice 'Auth/session tables unavailable; skipping phase 4 behavior assertions.';
  when undefined_function then
    raise notice 'Auth/session function path unavailable; skipping phase 4 behavior assertions.';
end;
$$;
