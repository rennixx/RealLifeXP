-- SQL assertions for MVP Phase 1 seed and policy integrity.
-- Run after migrations/seed are applied.

do $$
begin
  if (select count(*) from public.level_thresholds where level between 1 and 100) <> 100 then
    raise exception 'level_thresholds must contain 100 rows.';
  end if;

  if (select count(*) from public.categories where is_active = true) <> 8 then
    raise exception 'Expected 8 active reference categories.';
  end if;

  if (select count(*) from public.attributes) <> 31 then
    raise exception 'Expected 31 seeded attributes for all categories.';
  end if;

  if (select count(*) from public.activity_templates where owner_user_id is null and is_archived = false) < 24 then
    raise exception 'Expected at least 24 active system templates.';
  end if;

  if (select count(*) from public.titles where slug in ('the-initiate', 'the-builder', 'the-scholar')) <> 3 then
    raise exception 'Expected initial titles to be seeded.';
  end if;

  if (select count(*) from public.achievements where slug in ('character-created', 'first-activity', 'novice-analyst')) <> 3 then
    raise exception 'Expected initial achievements to be seeded.';
  end if;

  if (select reward_title_id from public.achievements where slug = 'character-created') is null then
    raise exception 'Character Created achievement must unlock The Initiate title.';
  end if;

  if public.xp_for_tier('quick'::public.xp_tier) <> 10 then
    raise exception 'xp_for_tier mapping mismatch for quick tier.';
  end if;

  if public.xp_for_tier('major'::public.xp_tier) <> 400 then
    raise exception 'xp_for_tier mapping mismatch for major tier.';
  end if;

  if public.xp_required_for_next_level(1) <> 100 then
    raise exception 'Level 1 next-threshold mismatch.';
  end if;

  if public.level_from_total_xp(150) <> 2 then
    raise exception 'Leveling helper returned unexpected result for total_xp=150.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'xp_ledger'
      and polname = 'xp_ledger_read_own'
  ) then
    raise exception 'RLS policy xp_ledger_read_own is missing.';
  end if;
end;
$$;

do $$
declare
  v_category_id uuid;
begin
  for v_category_id in
    select id
    from public.categories
  loop
    if coalesce((select count(*)
                 from public.activity_templates at
                 where at.owner_user_id is null
                   and at.is_archived = false
                   and at.category_id = v_category_id), 0) < 3 then
      raise exception 'Category % has fewer than 3 seeded system templates.', v_category_id;
    end if;
  end loop;

  if exists (
    select 1
    from public.activity_templates at
    join public.categories c on c.id = at.category_id
    join public.attributes a on a.id = at.attribute_id
    where a.category_id <> c.id
  ) then
    raise exception 'Template-category relationship is invalid in seed data.';
  end if;
end;
$$;

-- Add cross-user enforcement verification in your Supabase test environment using JWT-backed sessions.
