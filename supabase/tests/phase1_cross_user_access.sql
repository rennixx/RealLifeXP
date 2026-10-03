-- Phase 1: SQL-level cross-user access checks.
-- All checks run under a single authenticated session for user A.
-- They require at least two profile rows and skip automatically when fixtures are absent.

do $$
declare
  v_user_a uuid;
  v_user_b uuid;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    raise notice 'profiles table not present; skipping cross-user access checks.';
    return;
  end if;

  select id into v_user_a from public.profiles order by created_at limit 1;
  if v_user_a is null then
    raise notice 'No profiles available; skipping cross-user access checks.';
    return;
  end if;

  select id into v_user_b from public.profiles where id <> v_user_a order by created_at limit 1;
  if v_user_b is null then
    raise notice 'Only one profile exists; skipping cross-user access checks.';
    return;
  end if;

  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', v_user_a::text),
    true
  );

  if exists (select 1 from public.profiles where id = v_user_b) then
    raise exception 'RLS leak: user A can read profile row for user B.';
  end if;

  if exists (select 1 from public.profile_progress where user_id = v_user_b) then
    raise exception 'RLS leak: user A can read profile_progress for user B.';
  end if;

  if exists (select 1 from public.user_categories where user_id = v_user_b) then
    raise exception 'RLS leak: user A can read user_categories for user B.';
  end if;

  if exists (select 1 from public.user_attributes where user_id = v_user_b) then
    raise exception 'RLS leak: user A can read user_attributes for user B.';
  end if;

  if exists (select 1 from public.user_template_preferences where user_id = v_user_b) then
    raise exception 'RLS leak: user A can read template preferences for user B.';
  end if;

  if exists (select 1 from public.activity_logs where user_id = v_user_b) then
    raise exception 'RLS leak: user A can read activity_logs for user B.';
  end if;

  if exists (select 1 from public.xp_ledger where user_id = v_user_b) then
    raise exception 'RLS leak: user A can read xp_ledger for user B.';
  end if;

  if exists (select 1 from public.user_achievements where user_id = v_user_b) then
    raise exception 'RLS leak: user A can read user_achievements for user B.';
  end if;

  if exists (select 1 from public.user_titles where user_id = v_user_b) then
    raise exception 'RLS leak: user A can read user_titles for user B.';
  end if;
end;
$$;
