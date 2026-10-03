create table if not exists public.level_thresholds (
  level integer primary key check (level >= 1),
  required_for_next_level integer not null check (required_for_next_level >= 0),
  cumulative_xp bigint not null check (cumulative_xp >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.xp_for_tier(p_tier xp_tier)
returns integer
language sql
immutable
returns null on null input
set search_path = public
as $$
  select
    case p_tier
      when 'quick' then 10
      when 'focused' then 25
      when 'challenging' then 60
      when 'milestone' then 150
      when 'major' then 400
    end;
$$;

create or replace function public.xp_required_for_next_level(p_level integer)
returns integer
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  v_required integer;
begin
  if p_level < 1 then
    raise exception 'INVALID_LEVEL'
      using message = 'Level must be at least 1.';
  end if;

  v_required := round(100 * power(p_level::numeric, 1.35));
  return v_required::integer;
end;
$$;

create or replace function public.level_from_total_xp(p_total_xp bigint)
returns integer
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  v_total bigint := greatest(p_total_xp, 0);
  v_level integer := 1;
  v_cumulative bigint := 0;
  v_required integer;
begin
  select max(level) into v_level
  from public.level_thresholds
  where cumulative_xp <= v_total;

  if v_level is null then
    v_level := 1;
  end if;

  select cumulative_xp into v_cumulative
  from public.level_thresholds
  where level = v_level;

  if v_cumulative is null then
    v_cumulative := 0;
  end if;

  loop
    v_required := public.xp_required_for_next_level(v_level);
    if v_total < v_cumulative + v_required then
      return v_level;
    end if;

    v_level := v_level + 1;
    v_cumulative := v_cumulative + v_required;
  end loop;
end;
$$;

do $$
declare
  v_level integer;
  v_required integer;
  v_cumulative bigint := 0;
begin
  for v_level in 1..100 loop
    v_required := public.xp_required_for_next_level(v_level);
    insert into public.level_thresholds (level, required_for_next_level, cumulative_xp)
    values (v_level, v_required, v_cumulative)
    on conflict (level) do update
      set required_for_next_level = excluded.required_for_next_level,
          cumulative_xp = excluded.cumulative_xp,
          updated_at = timezone('utc', now());

    v_cumulative := v_cumulative + v_required;
  end loop;
end;
$$;

insert into public.titles (slug, name, description, rarity, icon_key, is_active)
values
  ('the-initiate', 'The Initiate', 'Awakened by completing account onboarding.', 'common', 'sparkles', true),
  ('the-builder', 'The Builder', 'Unlocked by building your first activity log.', 'rare', 'hammer', true),
  ('the-scholar', 'The Scholar', 'Unlocked by deep consistency in learning.', 'rare', 'school', true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  icon_key = excluded.icon_key,
  is_active = excluded.is_active;

insert into public.achievements (
  slug,
  name,
  description,
  rarity,
  icon_key,
  is_hidden,
  rule_type,
  rule_config,
  reward_title_id,
  sort_order,
  is_active
)
values
  (
    'character-created',
    'Character Created',
    'You completed onboarding and created your character.',
    'common',
    'sparkles',
    false,
    'onboarding_completed',
    '{}'::jsonb,
    (select id from public.titles where slug = 'the-initiate'),
    10,
    true
  ),
  (
    'first-activity',
    'First Pulse',
    'You logged your first activity and began progress.',
    'common',
    'play-circle',
    false,
    'total_activity_count',
    jsonb_build_object('min_count', 1),
    null,
    20,
    true
  ),
  (
    'novice-analyst',
    'Scholar in Motion',
    'You earned category-level 3 by building steady learning patterns.',
    'rare',
    'school',
    false,
    'category_level',
    jsonb_build_object('min_level', 3, 'category_slug', 'knowledge'),
    null,
    30,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  icon_key = excluded.icon_key,
  is_hidden = excluded.is_hidden,
  rule_type = excluded.rule_type,
  rule_config = excluded.rule_config,
  reward_title_id = excluded.reward_title_id,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

alter table public.profiles
drop constraint if exists profiles_emblem_key_check;

alter table public.profiles
add constraint profiles_emblem_key_check
  check (emblem_key = ANY (ARRAY['atlas-default', 'raven', 'flare', 'prism', 'cipher']));
