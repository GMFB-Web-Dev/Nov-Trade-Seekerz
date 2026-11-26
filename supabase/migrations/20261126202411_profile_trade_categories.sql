create table public.profile_trade_categories (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_slug text not null references public.categories(slug),
  primary key (profile_id, category_slug)
);

create index profile_trade_categories_category_idx
  on public.profile_trade_categories (category_slug, profile_id);

alter table public.profile_trade_categories enable row level security;
revoke all on public.profile_trade_categories from public, anon, authenticated;
grant select on public.profile_trade_categories to anon, authenticated;
grant select, insert, update, delete on public.profile_trade_categories to service_role;

create policy view_profile_trade_categories on public.profile_trade_categories
for select to anon, authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_trade_categories.profile_id
  )
);

-- Older callers still set the primary category on profiles. Keep that category in the directory.
create function private.sync_primary_trade_category() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.role is distinct from 'tradesperson' then
    delete from public.profile_trade_categories where profile_id = new.id;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.category_slug is distinct from new.category_slug then
    delete from public.profile_trade_categories
    where profile_id = new.id and category_slug = old.category_slug;
  end if;

  if new.category_slug is not null then
    insert into public.profile_trade_categories (profile_id, category_slug)
    values (new.id, new.category_slug) on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_primary_trade_category() from public, anon, authenticated;

create trigger sync_primary_trade_category
after insert or update of role, category_slug on public.profiles
for each row execute function private.sync_primary_trade_category();

insert into public.profile_trade_categories (profile_id, category_slug)
select id, category_slug from public.profiles
where role = 'tradesperson' and category_slug is not null
on conflict do nothing;

create function private.save_profile_trade_categories(command text, args jsonb) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  account public.profiles%rowtype;
  selected_slugs text[];
  primary_slug text;
  saved_id uuid;
begin
  if command is null or command not in ('onboard', 'profile') then
    raise exception 'Choose a profile action.';
  end if;

  select p.* into account
  from public.profiles p
  join auth.users u on u.id = p.id and u.email_confirmed_at is not null
  where p.id = (select auth.uid()) and p.status = 'active'
  for no key update of p;

  if not found
    or (command = 'onboard' and (account.onboarded_at is not null or args->>'role' is distinct from 'tradesperson'))
    or (command = 'profile' and (account.onboarded_at is null or account.role is distinct from 'tradesperson')) then
    return private.market_action(command, args);
  end if;

  if jsonb_typeof(args->'category_slugs') is distinct from 'array' then
    raise exception 'Choose distinct, active trade categories.';
  end if;
  if jsonb_array_length(args->'category_slugs') = 0 then
    raise exception 'Choose at least one trade category.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(args->'category_slugs') as choice(value)
    where jsonb_typeof(choice.value) is distinct from 'string'
  ) then
    raise exception 'Choose distinct, active trade categories.';
  end if;

  select array_agg(choice.slug order by choice.position) into selected_slugs
  from jsonb_array_elements_text(args->'category_slugs') with ordinality as choice(slug, position);
  if (select count(*) from public.categories where active and slug = any(selected_slugs))
    <> cardinality(selected_slugs) then
    raise exception 'Choose distinct, active trade categories.';
  end if;

  primary_slug := case when account.category_slug = any(selected_slugs)
    then account.category_slug else selected_slugs[1] end;
  saved_id := private.market_action(command, args || jsonb_build_object('category_slug', primary_slug));

  delete from public.profile_trade_categories as trade
  where trade.profile_id = account.id and not (trade.category_slug = any(selected_slugs));

  insert into public.profile_trade_categories (profile_id, category_slug)
  select account.id, slug from unnest(selected_slugs) as choice(slug)
  on conflict do nothing;

  return saved_id;
end;
$$;

revoke all on function private.save_profile_trade_categories(text, jsonb) from public, anon, authenticated;
grant execute on function private.save_profile_trade_categories(text, jsonb) to authenticated;

create or replace function public.market_action(command text, args jsonb default '{}'::jsonb) returns uuid
language sql security invoker set search_path = ''
as $$
  select case when command in ('onboard', 'profile') and args ? 'category_slugs'
    then private.save_profile_trade_categories(command, args)
    else private.market_action(command, args) end;
$$;

notify pgrst, 'reload schema';
