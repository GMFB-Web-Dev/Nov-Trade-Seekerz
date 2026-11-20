create function public.token_balance() returns bigint
language sql stable security invoker set search_path = ''
as $$ select coalesce(sum(delta), 0) from public.token_ledger where user_id = (select auth.uid()); $$;

revoke all on function public.token_balance() from public, anon, authenticated;
grant execute on function public.token_balance() to authenticated;

create function private.list_accounts(search_term text, account_filter text, first_row integer, row_limit integer)
returns table (id uuid, display_name text, business_name text, email text, role public.account_kind,
  status public.account_status, is_staff boolean, created_at timestamptz, total bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Administration access is required.'; end if;
  return query
    select p.id, p.display_name, p.business_name, u.email::text, p.role, p.status, a.user_id is not null, p.created_at, count(*) over ()
    from public.profiles p join auth.users u on u.id = p.id
    left join public.admin_grants a on a.user_id = p.id
    where (coalesce(search_term, '') = '' or concat_ws(' ', p.display_name, p.business_name, u.email) ilike '%' || left(search_term, 80) || '%')
      and case account_filter when 'banned' then p.status = 'banned' when 'staff' then a.user_id is not null
        when 'deactivated' then p.status = 'deactivated' else true end
    order by p.created_at desc, p.id
    offset greatest(0, least(first_row, 100000)) limit greatest(1, least(row_limit, 50));
end;
$$;

create function public.list_accounts(search_term text, account_filter text, first_row integer, row_limit integer)
returns table (id uuid, display_name text, business_name text, email text, role public.account_kind,
  status public.account_status, is_staff boolean, created_at timestamptz, total bigint)
language sql stable security invoker set search_path = ''
as $$ select * from private.list_accounts(search_term, account_filter, first_row, row_limit); $$;

revoke all on function private.list_accounts(text,text,integer,integer), public.list_accounts(text,text,integer,integer)
  from public, anon, authenticated;
grant execute on function private.list_accounts(text,text,integer,integer), public.list_accounts(text,text,integer,integer)
  to authenticated;

create table public.system_errors (
  id bigint generated always as identity primary key,
  scope text not null check (char_length(scope) between 2 and 70),
  code text not null check (char_length(code) between 1 and 60),
  created_at timestamptz not null default now()
);
alter table public.system_errors enable row level security;
revoke all on public.system_errors from public, anon, authenticated;
grant select on public.system_errors to authenticated;
grant insert on public.system_errors to service_role;
grant usage on sequence public.system_errors_id_seq to service_role;
create policy admins_view_system_errors on public.system_errors for select to authenticated using ((select private.is_admin()));

create unique index subscription_active_buyer on public.subscriptions (buyer_id) where status <> 'cancelled';
create unique index active_membership_checkout on public.billing_orders (buyer_id, provider)
  where interval = 'month' and status = 'pending';

create index reports_status_date_idx on public.reports (status, created_at desc);
create index audit_log_date_idx on public.audit_log (created_at desc);
