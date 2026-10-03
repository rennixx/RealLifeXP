-- Seeded core reference data for development, testing, and MVP startup.

insert into public.categories (slug, name, description, icon_key, color_token, sort_order, is_active)
values
  ('development', 'Development', 'Career and technical building', 'laptop', 'indigo', 1, true),
  ('knowledge', 'Knowledge', 'Structured learning', 'book', 'sky', 2, true),
  ('fitness', 'Fitness', 'Physical development', 'fitness', 'red', 3, true),
  ('creativity', 'Creativity', 'Creative output', 'sparkles', 'violet', 4, true),
  ('social', 'Social', 'Relationships and community', 'people', 'green', 5, true),
  ('exploration', 'Exploration', 'New places and experiences', 'map', 'orange', 6, true),
  ('life-management', 'Life Management', 'Maintaining everyday life', 'home', 'cyan', 7, true),
  ('finance', 'Finance', 'Financial capability', 'wallet', 'amber', 8, true)
on conflict (slug) do nothing;

with category_id_map as (
  select id, slug from public.categories
)
insert into public.attributes (category_id, slug, name, description, icon_key, sort_order, is_active)
values
  ((select id from category_id_map where slug = 'development'), 'frontend', 'Frontend', 'Build and refine client-side products', 'globe', 1, true),
  ((select id from category_id_map where slug = 'development'), 'backend', 'Backend', 'Maintain dependable services and APIs', 'server', 2, true),
  ((select id from category_id_map where slug = 'development'), 'mobile', 'Mobile', 'Ship smooth mobile experiences', 'phone', 3, true),
  ((select id from category_id_map where slug = 'development'), 'devops', 'DevOps', 'Automate and harden deployment workflows', 'cloud', 4, true),
  ((select id from category_id_map where slug = 'development'), 'shipping', 'Shipping', 'Deliver milestones and releases', 'rocket', 5, true),

  ((select id from category_id_map where slug = 'knowledge'), 'coursework', 'Coursework', 'Learn methodically through lessons', 'school', 1, true),
  ((select id from category_id_map where slug = 'knowledge'), 'reading', 'Reading', 'Read and retain meaningful material', 'book-open', 2, true),
  ((select id from category_id_map where slug = 'knowledge'), 'research', 'Research', 'Investigate questions with evidence', 'search', 3, true),
  ((select id from category_id_map where slug = 'knowledge'), 'languages', 'Languages', 'Grow vocabulary and fluency', 'language', 4, true),

  ((select id from category_id_map where slug = 'fitness'), 'strength', 'Strength', 'Build consistent physical power', 'barbell', 1, true),
  ((select id from category_id_map where slug = 'fitness'), 'cardio', 'Cardio', 'Improve conditioning and endurance', 'heart', 2, true),
  ((select id from category_id_map where slug = 'fitness'), 'mobility', 'Mobility', 'Protect joints and maintain range', 'walk', 3, true),
  ((select id from category_id_map where slug = 'fitness'), 'recovery', 'Recovery', 'Reinforce habits that sustain performance', 'meditation', 4, true),

  ((select id from category_id_map where slug = 'creativity'), 'design', 'Design', 'Create visual systems and interfaces', 'palette', 1, true),
  ((select id from category_id_map where slug = 'creativity'), 'writing', 'Writing', 'Clarify thought and communication', 'pencil', 2, true),
  ((select id from category_id_map where slug = 'creativity'), 'music', 'Music', 'Compose, practice, and perform art', 'musical-notes', 3, true),
  ((select id from category_id_map where slug = 'creativity'), 'content', 'Content', 'Create useful resources and media', 'videocam', 4, true),

  ((select id from category_id_map where slug = 'social'), 'friends', 'Friends', 'Nurture friendships intentionally', 'heart-circle', 1, true),
  ((select id from category_id_map where slug = 'social'), 'family', 'Family', 'Invest in close relationships', 'home', 2, true),
  ((select id from category_id_map where slug = 'social'), 'community', 'Community', 'Help and connect with your local circle', 'people', 3, true),
  ((select id from category_id_map where slug = 'social'), 'networking', 'Networking', 'Grow trusted professional relationships', 'link', 4, true),

  ((select id from category_id_map where slug = 'exploration'), 'travel', 'Travel', 'Explore places and cultures', 'airplane', 1, true),
  ((select id from category_id_map where slug = 'exploration'), 'new_places', 'New Places', 'Visit meaningful new environments', 'map', 2, true),
  ((select id from category_id_map where slug = 'exploration'), 'new_experiences', 'New Experiences', 'Try new things outside routines', 'star', 3, true),

  ((select id from category_id_map where slug = 'life-management'), 'organization', 'Organization', 'Keep systems predictable and clear', 'clipboard', 1, true),
  ((select id from category_id_map where slug = 'life-management'), 'maintenance', 'Maintenance', 'Preserve tools and spaces', 'construct', 2, true),
  ((select id from category_id_map where slug = 'life-management'), 'administration', 'Administration', 'Handle logistics and obligations', 'document-text', 3, true),

  ((select id from category_id_map where slug = 'finance'), 'saving', 'Saving', 'Grow emergency and long-term buffers', 'bank', 1, true),
  ((select id from category_id_map where slug = 'finance'), 'earning', 'Earning', 'Generate and improve income streams', 'cash', 2, true),
  ((select id from category_id_map where slug = 'finance'), 'learning', 'Learning', 'Strengthen financial literacy', 'trending-up', 3, true),
  ((select id from category_id_map where slug = 'finance'), 'planning', 'Planning', 'Make intentional money decisions', 'calendar', 4, true)
on conflict (category_id, slug) do nothing;

with data as (
  select c.id as category_id,
         a.id as attribute_id,
         d.template_name,
         d.template_description,
         d.xp_tier::public.xp_tier as xp_tier,
         d.xp_value,
         d.icon_key,
         d.default_duration_minutes
  from public.categories c
  join public.attributes a
    on a.category_id = c.id
  join (
    values
      ('development', 'frontend', 'Focused coding session', 'Finish a focused coding session', 'focused', 25, 'code', 45),
      ('development', 'backend', 'Finish and test a feature', 'Complete and test a focused backend feature', 'challenging', 60, 'server', 90),
      ('development', 'shipping', 'Ship a major release', 'Ship a project milestone or major release', 'major', 400, 'rocket', 180),

      ('knowledge', 'coursework', 'Focused study session', 'Complete a focused study session', 'focused', 25, 'book', 60),
      ('knowledge', 'research', 'Pass an exam or course', 'Complete a graded milestone or certification', 'milestone', 150, 'school', 120),
      ('knowledge', 'languages', 'Deep language practice', 'Practice new language material for sustained duration', 'challenging', 60, 'language', 90),

      ('fitness', 'strength', 'Strength training', 'Complete a full strength routine', 'focused', 25, 'barbell', 60),
      ('fitness', 'cardio', 'Focused cardio session', 'Finish a focused cardio workout', 'challenging', 60, 'heart', 45),
      ('fitness', 'recovery', 'Full recovery day', 'Prioritize planned recovery and mobility work', 'milestone', 150, 'meditation', 30),

      ('creativity', 'design', 'Focused creative session', 'Finish a design sprint segment', 'focused', 25, 'brush', 75),
      ('creativity', 'writing', 'Publish a short piece', 'Publish a short but useful piece', 'challenging', 60, 'document-text', 60),
      ('creativity', 'music', 'Create a major piece', 'Create and finish a meaningful music piece', 'milestone', 150, 'musical-note', 120),

      ('social', 'friends', 'Check in with a friend', 'Have a meaningful friend conversation', 'focused', 25, 'chatbubbles', 30),
      ('social', 'family', 'Family support time', 'Invest quality time in family support', 'focused', 25, 'people', 60),
      ('social', 'networking', 'Quality networking conversation', 'Build value in one professional connection', 'milestone', 150, 'link', 45),

      ('exploration', 'travel', 'Plan a meaningful outing', 'Plan and complete an inspiring outing', 'focused', 25, 'map', 120),
      ('exploration', 'new_places', 'Explore a new place', 'Visit a new location or space', 'challenging', 60, 'pin', 90),
      ('exploration', 'new_experiences', 'Major exploratory day', 'Complete a day anchored by new experiences', 'milestone', 150, 'star', 240),

      ('life-management', 'organization', 'Keep a weekly system', 'Set up and maintain a weekly planning system', 'challenging', 60, 'folder', 45),
      ('life-management', 'maintenance', 'Home maintenance task', 'Complete one maintenance task end-to-end', 'focused', 25, 'hammer', 90),
      ('life-management', 'administration', 'Resolve admin backlog', 'Clear a chunk of personal admin work', 'milestone', 150, 'list', 120),

      ('finance', 'saving', 'Consistent saving habit', 'Transfer to savings according to plan', 'focused', 25, 'wallet', 30),
      ('finance', 'earning', 'Track income and spending', 'Review income sources and spending discipline for a week', 'challenging', 60, 'cash', 45),
      ('finance', 'planning', 'Quarterly budget review', 'Build and review a solid financial plan', 'milestone', 150, 'trending-up', 120)
  ) as d(category_slug, attribute_slug, template_name, template_description, xp_tier, xp_value, icon_key, default_duration_minutes)
    on c.slug = d.category_slug
    and a.slug = d.attribute_slug
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
  category_id,
  attribute_id,
  template_name,
  template_description,
  xp_tier,
  xp_value,
  icon_key,
  default_duration_minutes,
  false
from data
where not exists (
  select 1
  from public.activity_templates existing
  where existing.category_id = data.category_id
    and existing.attribute_id = data.attribute_id
    and existing.owner_user_id is null
    and existing.name = data.template_name
);
