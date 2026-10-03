-- Phase 5: Template management access control and data integrity.
-- Adds owner-scoped DML policies for activity templates, locks tier->XP mapping to
-- the server-side xp_for_tier function, and validates category/attribute pairs.

drop policy if exists activity_templates_read_visible on public.activity_templates;

create policy activity_templates_read_visible on public.activity_templates
  for select using (
    (owner_user_id is null and is_archived = false)
    or owner_user_id = auth.uid()
  );

create policy activity_templates_insert_self on public.activity_templates
  for insert with check (owner_user_id = auth.uid());

create policy activity_templates_update_self on public.activity_templates
  for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy activity_templates_delete_self on public.activity_templates
  for delete using (owner_user_id = auth.uid());

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where c.conname = 'activity_templates_xp_tier_value_match'
      and n.nspname = 'public'
      and r.relname = 'activity_templates'
      and c.contype = 'c'
  ) then
    alter table public.activity_templates
      add constraint activity_templates_xp_tier_value_match
      check (xp_value = public.xp_for_tier(xp_tier));
  end if;
end $$;

create or replace function public.enforce_activity_template_category_attribute()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attribute_category_id uuid;
begin
  select at.category_id into v_attribute_category_id
    from public.attributes at
   where at.id = NEW.attribute_id
     and at.is_active = true;

  if v_attribute_category_id is null then
    raise exception 'INVALID_TEMPLATE_ATTRIBUTE'
      using message = 'Selected attribute is not valid.';
  end if;

  if v_attribute_category_id <> NEW.category_id then
    raise exception 'INVALID_TEMPLATE_RELATIONSHIP'
      using message = 'Attribute does not belong to selected category.';
  end if;

  NEW.xp_value := public.xp_for_tier(NEW.xp_tier);
  return NEW;
end;
$$;

drop trigger if exists activity_templates_validate_category_attribute on public.activity_templates;
create trigger activity_templates_validate_category_attribute
before insert or update
on public.activity_templates
for each row
execute function public.enforce_activity_template_category_attribute();
