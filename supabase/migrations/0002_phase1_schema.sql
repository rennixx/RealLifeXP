-- Phase 1: Core MVP schema, enums, and row-level security
create extension if not exists "pgcrypto";

do $$
begin
  create type public.xp_tier as enum ('quick', 'focused', 'challenging', 'milestone', 'major');
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  create type public.xp_event_type as enum (
    'activity_award',
    'activity_reversal',
    'migration_adjustment'
  );
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  create type public.xp_source as enum (
    'system_template',
    'custom_template',
    'reversal',
    'manual_adjustment'
  );
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  create type public.activity_status as enum ('active', 'reversed');
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  create type public.achievement_rarity as enum ('common', 'rare', 'epic', 'legendary');
exception
  when duplicate_object then
    null;
end $$;

create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  rarity achievement_rarity not null default 'common',
  icon_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  rarity achievement_rarity not null default 'common',
  icon_key text not null,
  is_hidden boolean not null default false,
  rule_type text not null,
  rule_config jsonb not null default '{}'::jsonb,
  reward_title_id uuid references public.titles(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    rule_type = any (
      array[
        'onboarding_completed',
        'total_activity_count',
        'total_xp',
        'character_level',
        'category_level',
        'attribute_level',
        'active_category_count',
        'distinct_active_days',
        'activity_tier_count',
        'category_activity_count'
      ]::text[]
    )
  )
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle citext not null unique check (char_length(handle) between 3 and 24),
  display_name text not null check (char_length(display_name) between 1 and 50),
  emblem_key text not null default 'atlas-default',
  equipped_title_id uuid references public.titles(id) on delete set null,
  onboarding_completed boolean not null default false,
  reduced_motion boolean not null default false,
  haptics_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon_key text not null,
  color_token text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attributes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null,
  icon_key text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (category_id, slug)
);

create table if not exists public.user_categories (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_selected boolean not null default false,
  sort_order integer not null default 0,
  total_xp bigint not null default 0,
  current_level integer not null default 1 check (current_level >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, category_id)
);

create table if not exists public.user_attributes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  total_xp bigint not null default 0,
  current_level integer not null default 1 check (current_level >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, attribute_id)
);

create table if not exists public.activity_templates (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  attribute_id uuid not null references public.attributes(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  xp_tier xp_tier not null,
  xp_value integer not null check (xp_value > 0),
  icon_key text not null,
  default_duration_minutes integer check (
    default_duration_minutes is null or (default_duration_minutes >= 1 and default_duration_minutes <= 1440)
  ),
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_user_id, category_id, attribute_id, name)
);

create table if not exists public.user_template_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.activity_templates(id) on delete cascade,
  is_favorite boolean not null default false,
  last_used_at timestamptz,
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, template_id)
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid references public.activity_templates(id) on delete set null,
  category_id uuid not null references public.categories(id) on delete restrict,
  attribute_id uuid not null references public.attributes(id) on delete restrict,
  template_name_snapshot text not null,
  xp_tier_snapshot xp_tier not null,
  xp_value_snapshot integer not null,
  source xp_source not null,
  note text check (note is null or char_length(note) <= 4000),
  private_reflection text check (private_reflection is null or char_length(private_reflection) <= 4000),
  duration_minutes integer check (duration_minutes is null or (duration_minutes >= 1 and duration_minutes <= 1440)),
  occurred_at timestamptz not null default timezone('utc', now()),
  status activity_status not null default 'active',
  client_request_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  reversed_at timestamptz,
  unique (user_id, client_request_id)
);

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  attribute_id uuid not null references public.attributes(id) on delete restrict,
  activity_log_id uuid not null references public.activity_logs(id) on delete cascade,
  event_type xp_event_type not null,
  amount integer not null,
  source xp_source not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default timezone('utc', now()),
  trigger_activity_log_id uuid references public.activity_logs(id) on delete set null,
  primary key (user_id, achievement_id)
);

create table if not exists public.user_titles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete cascade,
  unlocked_at timestamptz not null default timezone('utc', now()),
  source_achievement_id uuid references public.achievements(id) on delete set null,
  primary key (user_id, title_id)
);

create table if not exists public.profile_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp bigint not null default 0,
  current_level integer not null default 1 check (current_level >= 1),
  activity_count integer not null default 0 check (activity_count >= 0),
  achievement_count integer not null default 0 check (achievement_count >= 0),
  distinct_active_days integer not null default 0 check (distinct_active_days >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_updated_at_categories
before update on public.categories
for each row execute function public.set_updated_at();

create trigger set_updated_at_attributes
before update on public.attributes
for each row execute function public.set_updated_at();

create trigger set_updated_at_user_categories
before update on public.user_categories
for each row execute function public.set_updated_at();

create trigger set_updated_at_user_attributes
before update on public.user_attributes
for each row execute function public.set_updated_at();

create trigger set_updated_at_activity_templates
before update on public.activity_templates
for each row execute function public.set_updated_at();

create trigger set_updated_at_user_template_preferences
before update on public.user_template_preferences
for each row execute function public.set_updated_at();

create trigger set_updated_at_activity_logs
before update on public.activity_logs
for each row execute function public.set_updated_at();

create trigger set_updated_at_achievements
before update on public.achievements
for each row execute function public.set_updated_at();

create trigger set_updated_at_titles
before update on public.titles
for each row execute function public.set_updated_at();

create trigger set_updated_at_profile_progress
before update on public.profile_progress
for each row execute function public.set_updated_at();

alter table public.titles enable row level security;
alter table public.achievements enable row level security;
alter table public.profile_progress enable row level security;
alter table public.categories enable row level security;
alter table public.attributes enable row level security;
alter table public.activity_templates enable row level security;
alter table public.user_template_preferences enable row level security;
alter table public.profiles enable row level security;
alter table public.user_categories enable row level security;
alter table public.user_attributes enable row level security;
alter table public.activity_logs enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_titles enable row level security;

create policy titles_select_active on public.titles
  for select using (is_active);

create policy achievements_select_active on public.achievements
  for select using (is_active);

create policy profile_progress_read_own on public.profile_progress
  for select using (user_id = auth.uid());

create policy categories_read_active on public.categories
  for select using (is_active);

create policy attributes_read_active on public.attributes
  for select using (is_active);

create policy activity_templates_read_visible on public.activity_templates
  for select using (is_archived = false and (owner_user_id is null or owner_user_id = auth.uid()));

create policy profiles_read_own on public.profiles
  for select using (id = auth.uid());

create policy profiles_update_identity on public.profiles
  for update using (id = auth.uid());

create policy user_categories_read_own on public.user_categories
  for select using (user_id = auth.uid());

create policy user_categories_insert_self on public.user_categories
  for insert with check (user_id = auth.uid());

create policy user_categories_modify_own on public.user_categories
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_categories_delete_own on public.user_categories
  for delete using (user_id = auth.uid());

create policy user_attributes_read_own on public.user_attributes
  for select using (user_id = auth.uid());

create policy user_attributes_insert_self on public.user_attributes
  for insert with check (user_id = auth.uid());

create policy user_attributes_modify_own on public.user_attributes
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_attributes_delete_own on public.user_attributes
  for delete using (user_id = auth.uid());

create policy user_template_preferences_read_own on public.user_template_preferences
  for select using (user_id = auth.uid());

create policy user_template_preferences_insert_self on public.user_template_preferences
  for insert with check (user_id = auth.uid());

create policy user_template_preferences_modify_own on public.user_template_preferences
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_template_preferences_delete_own on public.user_template_preferences
  for delete using (user_id = auth.uid());

create policy activity_logs_read_own on public.activity_logs
  for select using (user_id = auth.uid());

create policy xp_ledger_read_own on public.xp_ledger
  for select using (user_id = auth.uid());

create policy user_achievements_read_own on public.user_achievements
  for select using (user_id = auth.uid());

create policy user_titles_read_own on public.user_titles
  for select using (user_id = auth.uid());
