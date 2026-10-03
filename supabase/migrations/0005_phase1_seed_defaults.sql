-- Phase 1 reference seed data: categories, attributes, and system templates.
-- This migration stores canonical source-of-truth progression domains used by onboarding.

insert into public.categories (
  slug,
  name,
  description,
  icon_key,
  color_token,
  sort_order,
  is_active
)
values
  ('development', 'Development', 'Career and technical building', 'code-outline', 'cobalt', 10, true),
  ('knowledge', 'Knowledge', 'Structured learning', 'library-outline', 'amber', 20, true),
  ('fitness', 'Fitness', 'Physical development', 'fitness-outline', 'emerald', 30, true),
  ('creativity', 'Creativity', 'Creative output', 'color-palette-outline', 'fuchsia', 40, true),
  ('social', 'Social', 'Relationships and community', 'people-outline', 'violet', 50, true),
  ('exploration', 'Exploration', 'New places and experiences', 'map-outline', 'teal', 60, true),
  ('life-management', 'Life Management', 'Maintaining everyday life', 'briefcase-outline', 'gold', 70, true),
  ('finance', 'Finance', 'Financial capability', 'wallet-outline', 'gold', 80, true)
on conflict (slug) do update
  set
    name = excluded.name,
    description = excluded.description,
    icon_key = excluded.icon_key,
    color_token = excluded.color_token,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_at = timezone('utc', now());

insert into public.attributes (
  category_id,
  slug,
  name,
  description,
  icon_key,
  sort_order,
  is_active
)
select
  c.id,
  attribute_rows.slug,
  attribute_rows.name,
  attribute_rows.description,
  attribute_rows.icon_key,
  attribute_rows.sort_order,
  true
from (
  values
    -- Development
    ('development', 'frontend', 'Frontend', 'Build clean, resilient user-facing experiences', 'layers-outline', 10),
    ('development', 'backend', 'Backend', 'Ship stable services and APIs', 'server-outline', 20),
    ('development', 'mobile', 'Mobile', 'Deliver responsive native experiences', 'phone-portrait-outline', 30),
    ('development', 'devops', 'DevOps', 'Operate scalable reliable systems', 'settings-outline', 40),
    ('development', 'shipping', 'Shipping', 'Launch products and features end-to-end', 'rocket-outline', 50),
    -- Knowledge
    ('knowledge', 'coursework', 'Coursework', 'Finish structured learning units', 'school-outline', 10),
    ('knowledge', 'reading', 'Reading', 'Consume and retain useful material', 'book-outline', 20),
    ('knowledge', 'research', 'Research', 'Investigate and validate ideas', 'search-outline', 30),
    ('knowledge', 'languages', 'Languages', 'Build communication fluency', 'chatbubble-ellipses-outline', 40),
    -- Fitness
    ('fitness', 'strength', 'Strength', 'Develop power and reliability in performance', 'barbell-outline', 10),
    ('fitness', 'cardio', 'Cardio', 'Improve cardiovascular endurance', 'heart-outline', 20),
    ('fitness', 'mobility', 'Mobility', 'Improve movement quality and longevity', 'fitness-outline', 30),
    ('fitness', 'recovery', 'Recovery', 'Build sustainable physical rhythm', 'bed-outline', 40),
    -- Creativity
    ('creativity', 'design', 'Design', 'Create polished visual outputs', 'brush-outline', 10),
    ('creativity', 'writing', 'Writing', 'Improve clarity and articulation', 'pencil-outline', 20),
    ('creativity', 'music', 'Music', 'Compose, practice, and perform', 'musical-notes-outline', 30),
    ('creativity', 'content', 'Content', 'Publish meaningful creative work', 'film-outline', 40),
    -- Social
    ('social', 'friends', 'Friends', 'Strengthen meaningful friend connections', 'happy-outline', 10),
    ('social', 'family', 'Family', 'Invest in close relationships and care', 'home-outline', 20),
    ('social', 'community', 'Community', 'Contribute to collective spaces', 'people-circle-outline', 30),
    ('social', 'networking', 'Networking', 'Build useful professional connections', 'globe-outline', 40),
    -- Exploration
    ('exploration', 'travel', 'Travel', 'Explore new places with purpose', 'airplane-outline', 10),
    ('exploration', 'new-places', 'New Places', 'Discover new geographies and contexts', 'compass-outline', 20),
    ('exploration', 'new-experiences', 'New Experiences', 'Try unfamiliar routines or places', 'sparkles-outline', 30),
    -- Life Management
    ('life-management', 'organization', 'Organization', 'Keep systems lean and repeatable', 'clipboard-outline', 10),
    ('life-management', 'maintenance', 'Maintenance', 'Care for your environment and assets', 'construct-outline', 20),
    ('life-management', 'administration', 'Administration', 'Handle planning and logistics', 'file-tray-full-outline', 30),
    -- Finance
    ('finance', 'saving', 'Saving', 'Build long-term financial resilience', 'wallet-outline', 10),
    ('finance', 'earning', 'Earning', 'Increase and stabilize income signals', 'trending-up-outline', 20),
    ('finance', 'learning', 'Learning', 'Improve money literacy and habits', 'school-outline', 30),
    ('finance', 'planning', 'Planning', 'Forecast and align financial decisions', 'calculator-outline', 40)
) as attribute_rows(category_slug, slug, name, description, icon_key, sort_order)
join public.categories c on c.slug = attribute_rows.category_slug
on conflict (category_id, slug) do update
  set
    name = excluded.name,
    description = excluded.description,
    icon_key = excluded.icon_key,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_at = timezone('utc', now());

with system_templates as (
  select
    rows.category_slug,
    rows.attribute_slug,
    rows.name,
    rows.description,
    rows.xp_tier::public.xp_tier as xp_tier,
    rows.icon_key,
    rows.default_duration_minutes
  from (
    values
      -- Development
      ('development', 'frontend', 'Focused coding session', 'Complete a focused coding sprint', 'focused', 'code-outline', 45),
      ('development', 'backend', 'Finish and test a feature', 'Ship code with validation and review', 'challenging', 'flask-outline', 90),
      ('development', 'shipping', 'Ship a project or major release', 'Deliver a release with visible outcome', 'milestone', 'rocket-outline', 240),
      -- Knowledge
      ('knowledge', 'coursework', 'Focused study session', 'Deep work on a course module', 'focused', 'school-outline', 45),
      ('knowledge', 'reading', 'Finish a chapter or lesson', 'Read and summarize a complete lesson', 'focused', 'book-outline', 30),
      ('knowledge', 'research', 'Pass an exam or complete a course', 'Demonstrate mastery with tested outcomes', 'milestone', 'trophy-outline', 120),
      -- Fitness
      ('fitness', 'strength', 'Complete a workout', 'Complete a complete fitness session', 'focused', 'barbell-outline', 60),
      ('fitness', 'cardio', 'Complete a challenging training session', 'Push through a structured cardio effort', 'challenging', 'pulse-outline', 75),
      ('fitness', 'mobility', 'Complete a major event', 'Finish a major athletic challenge', 'milestone', 'trophy-outline', 180),
      -- Creativity
      ('creativity', 'design', 'Focused creative session', 'Work intentionally on one creative artifact', 'focused', 'brush-outline', 60),
      ('creativity', 'writing', 'Finish a creative piece', 'Complete and refine a substantial work', 'challenging', 'pencil-outline', 90),
      ('creativity', 'content', 'Publish or present major work', 'Share a meaningful completed creative output', 'milestone', 'megaphone-outline', 150),
      -- Social
      ('social', 'friends', 'Reach out with intent', 'Connect with friends in a meaningful way', 'focused', 'happy-outline', 20),
      ('social', 'networking', 'Build a new connection', 'Create a new meaningful professional connection', 'challenging', 'people-outline', 45),
      ('social', 'community', 'Lead a community action', 'Organize or host a community contribution', 'milestone', 'sparkles-outline', 120),
      -- Exploration
      ('exploration', 'travel', 'Try a new place', 'Explore a place you have not visited', 'quick', 'map-outline', 60),
      ('exploration', 'new-places', 'Capture a new route', 'Map a new route and complete it', 'focused', 'compass-outline', 90),
      ('exploration', 'new-experiences', 'Complete a novel experience', 'Take on a meaningful new challenge', 'challenging', 'flash-outline', 75),
      -- Life Management
      ('life-management', 'organization', 'Do one organization cleanup', 'Reduce friction in personal systems', 'quick', 'clipboard-outline', 30),
      ('life-management', 'maintenance', 'Finish a maintenance task', 'Complete one practical maintenance job', 'focused', 'construct-outline', 60),
      ('life-management', 'administration', 'Plan your next week', 'Set priorities and calendar structure', 'focused', 'calendar-outline', 45),
      -- Finance
      ('finance', 'saving', 'Log your savings decision', 'Move or allocate funds toward goals', 'focused', 'wallet-outline', 30),
      ('finance', 'earning', 'Complete a high-value task', 'Deliver meaningful income-generating work', 'challenging', 'trending-up-outline', 120),
      ('finance', 'planning', 'Finish a major planning milestone', 'Prepare a plan with clear next actions', 'milestone', 'calculator-outline', 120)
  ) as rows(category_slug, attribute_slug, name, description, xp_tier, icon_key, default_duration_minutes)
)
insert into public.activity_templates (
  owner_user_id,
  category_id,
  attribute_id,
  name,
  description,
  xp_tier,
  xp_value,
  icon_key,
  default_duration_minutes,
  is_archived
)
select
  null,
  c.id as category_id,
  a.id as attribute_id,
  st.name,
  st.description,
  st.xp_tier,
  public.xp_for_tier(st.xp_tier),
  st.icon_key,
  st.default_duration_minutes,
  false
from system_templates st
join public.categories c on c.slug = st.category_slug
join public.attributes a on a.category_id = c.id and a.slug = st.attribute_slug
on conflict (owner_user_id, category_id, attribute_id, name) do update
  set
    description = excluded.description,
    xp_tier = excluded.xp_tier,
    xp_value = excluded.xp_value,
    icon_key = excluded.icon_key,
    default_duration_minutes = excluded.default_duration_minutes,
    is_archived = false,
    updated_at = timezone('utc', now());
