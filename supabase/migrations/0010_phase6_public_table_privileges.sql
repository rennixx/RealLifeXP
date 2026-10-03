-- Phase 6: Ensure authenticated clients can access public data tables.
-- RLS enforces row-level ownership while these grants provide base table access.

grant usage on schema public to authenticated, service_role;

grant select on table
  public.level_thresholds,
  public.titles,
  public.achievements,
  public.categories,
  public.attributes,
  public.activity_templates,
  public.profiles,
  public.user_categories,
  public.user_attributes,
  public.user_template_preferences,
  public.activity_logs,
  public.xp_ledger,
  public.user_achievements,
  public.user_titles,
  public.profile_progress
to authenticated, service_role;

grant insert, update, delete on table
  public.profiles,
  public.user_categories,
  public.user_attributes,
  public.user_template_preferences,
  public.activity_logs,
  public.activity_templates,
  public.user_achievements,
  public.user_titles,
  public.profile_progress,
  public.xp_ledger
to authenticated, service_role;
