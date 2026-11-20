create schema private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create type public.account_kind as enum ('homeowner', 'tradesperson');
create type public.account_status as enum ('active', 'banned', 'deactivated');
create type public.project_status as enum ('open', 'awarded', 'completed', 'cancelled');
create type public.application_status as enum ('pending', 'awarded', 'declined', 'withdrawn');

create table public.categories (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 60),
  sort_order smallint not null default 100,
  active boolean not null default true
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role public.account_kind,
  status public.account_status not null default 'active',
  display_name text not null default '' check (char_length(display_name) <= 100),
  business_name text not null default '' check (char_length(business_name) <= 120),
  bio text not null default '' check (char_length(bio) <= 1500),
  postcode text not null default '' check (postcode ~ '^([0-9]{4})?$'),
  category_slug text references public.categories,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.admin_grants (
  user_id uuid primary key references public.profiles on delete cascade,
  granted_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  homeowner_id uuid not null references public.profiles on delete cascade,
  category_slug text not null references public.categories,
  title text not null check (char_length(title) between 6 and 100),
  description text not null check (char_length(description) between 20 and 3000),
  suburb text not null check (char_length(suburb) between 2 and 100),
  postcode text not null check (postcode ~ '^[0-9]{4}$'),
  budget_min integer not null check (budget_min between 0 and 10000000),
  budget_max integer not null check (budget_max between budget_min and 10000000),
  applicant_limit smallint not null default 5 check (applicant_limit between 1 and 10),
  status public.project_status not null default 'open',
  invited_tradesperson_id uuid references public.profiles on delete set null,
  awarded_to uuid references public.profiles on delete set null,
  photo_path text,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  tradesperson_id uuid not null references public.profiles on delete cascade,
  introduction text not null check (char_length(introduction) between 10 and 2000),
  status public.application_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (project_id, tradesperson_id)
);

create table public.quotes (
  application_id uuid primary key references public.applications on delete cascade,
  amount_cents integer not null check (amount_cents between 100 and 1000000000),
  description text not null check (char_length(description) between 10 and 2000),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications on delete cascade,
  sender_id uuid references public.profiles on delete set null default auth.uid(),
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid unique references public.projects on delete set null,
  homeowner_id uuid references public.profiles on delete set null,
  tradesperson_id uuid not null references public.profiles on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 12 and 1200),
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles on delete set null,
  project_id uuid references public.projects on delete set null,
  subject_kind text not null check (subject_kind in ('project','tradesperson','message','review')),
  subject_id uuid not null,
  reason text not null check (char_length(reason) between 12 and 1500),
  status text not null default 'open' check (status in ('open','in_review','resolved','dismissed')),
  resolution text check (char_length(resolution) <= 1500),
  handled_by uuid references public.profiles on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 12 and 2000),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  project_id uuid not null references public.projects on delete cascade,
  subject text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid unique not null references public.notifications on delete cascade,
  recipient_id uuid not null references public.profiles on delete cascade,
  sent_at timestamptz,
  attempts smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles on delete set null,
  event text not null,
  subject_id text not null,
  created_at timestamptz not null default now()
);

create table public.billing_products (
  slug text primary key,
  name text not null,
  price_cents integer not null check (price_cents > 0),
  credits integer not null check (credits > 0),
  interval text not null check (interval in ('once','month')),
  currency text not null default 'nzd' check (currency ~ '^[a-z]{3}$'),
  active boolean not null default true
);

create table public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.profiles on delete set null,
  product_slug text not null references public.billing_products,
  price_cents integer not null check (price_cents > 0),
  credits integer not null check (credits > 0),
  interval text not null check (interval in ('once','month')),
  currency text not null,
  provider text not null check (provider in ('local','stripe')),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','disputed')),
  provider_session text unique,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.profiles on delete set null,
  order_id uuid unique not null references public.billing_orders,
  provider_ref text unique not null,
  product_slug text not null references public.billing_products,
  status text not null check (status in ('active','past_due','cancelling','cancelled')),
  renews_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.billing_payments (
  provider_ref text primary key,
  order_id uuid not null references public.billing_orders,
  amount_cents integer not null,
  reversed_cents integer not null default 0,
  dispute_open boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.stripe_webhook_events (
  id text primary key,
  kind text not null,
  processed_at timestamptz not null default now()
);

create table public.token_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete set null,
  delta integer not null check (delta <> 0),
  reason text not null,
  reference text unique not null,
  created_at timestamptz not null default now()
);

create table private.action_limits (
  actor_id uuid not null references public.profiles on delete cascade,
  command text not null,
  window_started timestamptz not null,
  used integer not null,
  primary key (actor_id, command)
);

create table private.contact_limits (
  address_key text primary key,
  window_started timestamptz not null,
  used integer not null
);

create index projects_homeowner_idx on public.projects (homeowner_id, created_at desc);
create index projects_open_idx on public.projects (category_slug, created_at desc) where status = 'open';
create index applications_trade_idx on public.applications (tradesperson_id, created_at desc);
create index messages_conversation_idx on public.messages (application_id, created_at);
create index reviews_trade_idx on public.reviews (tradesperson_id) where visible;
create index notifications_recipient_idx on public.notifications (user_id, created_at desc);
create index token_ledger_user_idx on public.token_ledger (user_id, created_at desc);
create index orders_buyer_idx on public.billing_orders (buyer_id, created_at desc);
create index subscription_buyer_idx on public.subscriptions (buyer_id);
create index outbox_due_idx on public.email_outbox (next_attempt_at) where sent_at is null;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create function private.active_role() returns public.account_kind
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  join auth.users u on u.id = p.id and u.email_confirmed_at is not null
  where p.id = (select auth.uid()) and p.status = 'active' and p.onboarded_at is not null;
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_grants a
    join public.profiles p on p.id = a.user_id and p.status = 'active'
    join auth.users u on u.id = a.user_id and u.email_confirmed_at is not null
    where a.user_id = (select auth.uid())
  );
$$;

create function private.owns_project(project_key uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.active_role() = 'homeowner' and exists (
    select 1 from public.projects p where p.id = project_key and p.homeowner_id = (select auth.uid())
  );
$$;

create function private.can_read_project(project_key uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin() or private.owns_project(project_key) or
    (private.active_role() = 'tradesperson' and exists (
      select 1 from public.projects p
      where p.id = project_key
        and exists (select 1 from public.profiles owner where owner.id = p.homeowner_id and owner.status = 'active')
        and
        ((p.status = 'open' and (p.invited_tradesperson_id is null or p.invited_tradesperson_id = (select auth.uid())))
          or exists (select 1 from public.applications a where a.project_id = p.id and a.tradesperson_id = (select auth.uid())))
    ));
$$;

create function private.can_read_application(application_key uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1 from public.applications a where a.id = application_key
    and (private.owns_project(a.project_id)
      or (private.active_role() = 'tradesperson' and a.tradesperson_id = (select auth.uid())))
  );
$$;

create function private.can_read_file(object_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.id::text = split_part(object_name, '/', 1)
      and (private.owns_project(p.id) or private.is_admin() or
        (p.photo_path = object_name and private.can_read_project(p.id)))
  );
$$;

create function private.can_upload_file(object_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.projects p where p.id::text = split_part(object_name, '/', 1)
    and p.status = 'open' and private.owns_project(p.id)
  );
$$;

alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.admin_grants enable row level security;
alter table public.projects enable row level security;
alter table public.applications enable row level security;
alter table public.quotes enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.feedback enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;
alter table public.audit_log enable row level security;
alter table public.billing_products enable row level security;
alter table public.billing_orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_payments enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.token_ledger enable row level security;
alter table private.action_limits enable row level security;
alter table private.contact_limits enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.profiles, public.reviews, public.billing_products to anon, authenticated;
grant select on public.admin_grants, public.projects, public.applications, public.quotes,
  public.messages, public.reports, public.feedback, public.notifications, public.audit_log,
  public.billing_orders, public.subscriptions, public.token_ledger to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

create policy browse_categories on public.categories for select to anon, authenticated
using (active or (select private.is_admin()));
create policy view_profile on public.profiles for select to anon, authenticated using (
  (role = 'tradesperson' and status = 'active' and onboarded_at is not null)
  or id = (select auth.uid()) or (select private.is_admin())
);
create policy view_admin_grants on public.admin_grants for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy view_projects on public.projects for select to authenticated
using (private.can_read_project(id));
create policy view_applications on public.applications for select to authenticated
using (private.can_read_application(id));
create policy view_quotes on public.quotes for select to authenticated
using (private.can_read_application(application_id));
create policy view_messages on public.messages for select to authenticated
using (private.can_read_application(application_id));
create policy view_reviews on public.reviews for select to anon, authenticated
using ((visible and exists (select 1 from public.profiles p where p.id = tradesperson_id and p.status = 'active')) or (select private.is_admin()));
create policy view_reports on public.reports for select to authenticated
using ((reporter_id = (select auth.uid()) and (select private.active_role()) is not null) or (select private.is_admin()));
create policy view_feedback on public.feedback for select to authenticated using ((select private.is_admin()));
create policy view_notifications on public.notifications for select to authenticated
using (user_id = (select auth.uid()) and (select private.active_role()) is not null);
create policy view_audit_log on public.audit_log for select to authenticated using ((select private.is_admin()));
create policy view_billing_products on public.billing_products for select to anon, authenticated
using (active or (select private.is_admin()));
create policy view_orders on public.billing_orders for select to authenticated
using ((buyer_id = (select auth.uid()) and (select private.active_role()) = 'tradesperson') or (select private.is_admin()));
create policy view_subscriptions on public.subscriptions for select to authenticated
using ((buyer_id = (select auth.uid()) and (select private.active_role()) = 'tradesperson') or (select private.is_admin()));
create policy view_ledger on public.token_ledger for select to authenticated
using ((user_id = (select auth.uid()) and (select private.active_role()) = 'tradesperson') or (select private.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-photos', 'project-photos', false, 5242880, array['image/jpeg','image/png','image/webp']);
create policy read_project_photos on storage.objects for select to authenticated
using (bucket_id = 'project-photos' and private.can_read_file(name));
create policy write_project_photos on storage.objects for insert to authenticated
with check (bucket_id = 'project-photos' and private.can_upload_file(name));
create policy remove_project_photos on storage.objects for delete to authenticated
using (bucket_id = 'project-photos' and (private.can_upload_file(name) or (select private.is_admin())));

create function private.notify(recipient uuid, project_key uuid, subject_line text) returns void
language plpgsql set search_path = ''
as $$
declare notification_key uuid;
begin
  if recipient is null or recipient = (select auth.uid()) then return; end if;
  insert into public.notifications (user_id, project_id, subject)
  select recipient, project_key, subject_line
  where exists (select 1 from public.profiles where id = recipient and status = 'active')
  returning id into notification_key;
  if notification_key is not null then
    insert into public.email_outbox (notification_id, recipient_id) values (notification_key, recipient);
  end if;
end;
$$;

create function private.limit_action(actor uuid, action text, allowed integer, window_size interval) returns void
language plpgsql set search_path = ''
as $$
declare hits integer;
begin
  insert into private.action_limits as rate (actor_id, command, window_started, used)
  values (actor, action, now(), 1)
  on conflict (actor_id, command) do update set
    used = case when rate.window_started + window_size <= now() then 1 else rate.used + 1 end,
    window_started = case when rate.window_started + window_size <= now() then now() else rate.window_started end
  returning used into hits;
  if hits > allowed then raise exception 'Too many requests. Please try again shortly.'; end if;
end;
$$;

create function private.market_action(command text, args jsonb) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  account public.profiles%rowtype;
  project public.projects%rowtype;
  application public.applications%rowtype;
  product public.billing_products%rowtype;
  target uuid;
  other_user uuid;
  outcome uuid;
  kind text;
  subject_type text;
  new_state text;
  is_admin boolean := private.is_admin();
begin
  if actor is null or not exists (select 1 from auth.users where id = actor and email_confirmed_at is not null) then
    raise exception 'Sign in with a verified email address.';
  end if;
  select * into account from public.profiles where id = actor;
  if not found or account.status <> 'active' then raise exception 'This account is restricted.'; end if;
  if command not in ('onboard','leave','admin_user','admin_project','admin_report','admin_category','admin_review')
    and account.onboarded_at is null then raise exception 'Finish onboarding first.'; end if;
  perform private.limit_action(actor, command,
    case when command in ('report','create_project') then 6 else 24 end, interval '1 minute');

  if command in ('onboard','profile') then
    if command = 'onboard' then
      select * into account from public.profiles where id = actor and status = 'active' for update;
      if not found then raise exception 'This account is restricted.'; end if;
      if account.onboarded_at is not null then return actor; end if;
    end if;
    kind := case when command = 'onboard' then args->>'role' else account.role::text end;
    if kind is null or kind not in ('homeowner','tradesperson') or length(trim(coalesce(args->>'display_name',''))) < 2 then
      raise exception 'Enter your name and choose a valid account type.';
    end if;
    if coalesce(args->>'postcode','') !~ '^[0-9]{4}$' then raise exception 'Enter a four-digit NZ postcode.'; end if;
    if kind = 'tradesperson' and (length(trim(coalesce(args->>'business_name',''))) < 2
      or not exists (select 1 from public.categories where slug = args->>'category_slug' and active)) then
      raise exception 'Enter your business name and select an active trade.';
    end if;
    update public.profiles set role = kind::public.account_kind, display_name = trim(args->>'display_name'),
      business_name = case when kind = 'tradesperson' then trim(args->>'business_name') else '' end,
      postcode = args->>'postcode', bio = coalesce(args->>'bio',''),
      category_slug = case when kind = 'tradesperson' then args->>'category_slug' end,
      onboarded_at = coalesce(onboarded_at, now())
    where id = actor;
    if command = 'onboard' and kind = 'tradesperson' then
      insert into public.token_ledger (user_id, delta, reason, reference)
      values (actor, 3, 'Joining credit', 'welcome:' || actor) on conflict (reference) do nothing;
    end if;
    return actor;
  end if;

  if command = 'leave' then
    if is_admin then raise exception 'Remove your admin grant before deactivating.'; end if;
    update public.profiles set status = 'deactivated' where id = actor;
    return actor;
  end if;

  if command = 'create_project' then
    if account.role <> 'homeowner' then raise exception 'Only homeowners can post a job.'; end if;
    if not exists (select 1 from public.categories where slug = args->>'category_slug' and active) then
      raise exception 'Select an active trade.';
    end if;
    target := nullif(args->>'invite','')::uuid;
    if target is not null and not exists (
      select 1 from public.profiles where id = target and role = 'tradesperson' and status = 'active' and onboarded_at is not null
    ) then raise exception 'Choose an available tradesperson.'; end if;
    insert into public.projects (
      homeowner_id, category_slug, title, description, suburb, postcode, budget_min, budget_max, applicant_limit, invited_tradesperson_id
    ) values (
      actor, args->>'category_slug', args->>'title', args->>'description', args->>'suburb', args->>'postcode',
      (args->>'budget_min')::integer, (args->>'budget_max')::integer, (args->>'applicant_limit')::smallint, target
    ) returning id into outcome;
    perform private.notify(target, outcome, 'You have a Trade Seekerz job request');
    return outcome;
  end if;

  if command in ('edit_project','set_photo','apply','award','finish','cancel','review') then
    select * into project from public.projects where id = (args->>'project_id')::uuid for update;
    if not found then raise exception 'This job is unavailable.'; end if;
    if command = 'apply' then
      if account.role <> 'tradesperson' or project.status <> 'open' or project.homeowner_id = actor
        or not exists (select 1 from public.profiles where id = project.homeowner_id and status = 'active') or
        (project.invited_tradesperson_id is not null and project.invited_tradesperson_id <> actor) then
        raise exception 'This job is unavailable for applications.';
      end if;
      perform 1 from public.profiles where id = actor and status = 'active' for update;
      if not found then raise exception 'This account is restricted.'; end if;
      if exists (select 1 from public.applications where project_id = project.id and tradesperson_id = actor) then
        raise exception 'You already applied for this job.';
      end if;
      if (select count(*) from public.applications where project_id = project.id and status = 'pending') >= project.applicant_limit then
        raise exception 'This job has reached its applicant limit.';
      end if;
      if coalesce((select sum(delta) from public.token_ledger where user_id = actor), 0) < 1 then
        raise exception 'You need one token to apply.';
      end if;
      insert into public.applications (project_id, tradesperson_id, introduction)
      values (project.id, actor, args->>'introduction') returning id into outcome;
      insert into public.token_ledger (user_id, delta, reason, reference)
      values (actor, -1, 'Job application', 'apply:' || outcome);
      perform private.notify(project.homeowner_id, project.id, 'You have a new job application');
      return project.id;
    end if;
    if project.homeowner_id <> actor or account.role <> 'homeowner' then raise exception 'You do not own this job.'; end if;
    if command = 'edit_project' then
      if project.status <> 'open' then raise exception 'Only open jobs can be edited.'; end if;
      if not exists (select 1 from public.categories where slug = args->>'category_slug' and active)
        or (args->>'applicant_limit')::integer <
          (select count(*) from public.applications where project_id = project.id and status = 'pending') then
        raise exception 'Check the category and current number of applicants.';
      end if;
      update public.projects set title = args->>'title', description = args->>'description', category_slug = args->>'category_slug',
        suburb = args->>'suburb', postcode = args->>'postcode', budget_min = (args->>'budget_min')::integer,
        budget_max = (args->>'budget_max')::integer, applicant_limit = (args->>'applicant_limit')::smallint where id = project.id;
    elsif command = 'set_photo' then
      if project.status <> 'open' or split_part(args->>'path','/',1) is distinct from project.id::text
        or not exists (select 1 from storage.objects where bucket_id = 'project-photos' and name = args->>'path') then
        raise exception 'This photo is unavailable.';
      end if;
      update public.projects set photo_path = args->>'path' where id = project.id;
    elsif command = 'award' then
      select * into application from public.applications
      where id = (args->>'application_id')::uuid and project_id = project.id and status = 'pending' for update;
      if project.status <> 'open' or not found or not exists (select 1 from public.profiles where id = application.tradesperson_id and status = 'active')
        or not exists (select 1 from public.quotes where application_id = application.id) then
        raise exception 'That quote is no longer available.';
      end if;
      update public.applications set status = case when id = application.id then 'awarded'::public.application_status else 'declined'::public.application_status end
      where project_id = project.id and status = 'pending';
      update public.projects set status = 'awarded', awarded_to = application.tradesperson_id where id = project.id;
      perform private.notify(application.tradesperson_id, project.id, 'Your quote was accepted');
    elsif command = 'finish' then
      if project.status <> 'awarded' then raise exception 'Award the job before completing it.'; end if;
      update public.projects set status = 'completed' where id = project.id;
      perform private.notify(project.awarded_to, project.id, 'A job was marked complete');
    elsif command = 'cancel' then
      if project.status <> 'open' then raise exception 'Only open jobs can be cancelled.'; end if;
      update public.projects set status = 'cancelled' where id = project.id;
      update public.applications set status = 'declined' where project_id = project.id and status = 'pending';
    else
      if project.status <> 'completed' or project.awarded_to is null then raise exception 'Complete the job before leaving a review.'; end if;
      if exists (select 1 from public.reviews where project_id = project.id) then raise exception 'You already reviewed this job.'; end if;
      insert into public.reviews (project_id, homeowner_id, tradesperson_id, rating, body)
      values (project.id, actor, project.awarded_to, (args->>'rating')::smallint, args->>'body');
      perform private.notify(project.awarded_to, project.id, 'You received a new review');
    end if;
    return project.id;
  end if;

  if command in ('quote','send_message','withdraw') then
    select p.* into project from public.projects p join public.applications a on a.project_id = p.id
    where a.id = (args->>'application_id')::uuid for update of p;
    if not found then raise exception 'This conversation is unavailable.'; end if;
    select * into application from public.applications where id = (args->>'application_id')::uuid for update;
    if not found or (actor <> project.homeowner_id and actor <> application.tradesperson_id) then
      raise exception 'This conversation is unavailable.';
    end if;
    if command = 'send_message' then
      if application.status not in ('pending','awarded') or project.status = 'cancelled' then raise exception 'This conversation is closed.'; end if;
      other_user := case when actor = project.homeowner_id then application.tradesperson_id else project.homeowner_id end;
      if not exists (select 1 from public.profiles where id = other_user and status = 'active') then
        raise exception 'This conversation is closed.';
      end if;
      insert into public.messages (application_id, sender_id, body) values (application.id, actor, args->>'body');
    else
      if actor <> application.tradesperson_id or application.status <> 'pending' or project.status <> 'open' then
        raise exception 'This application can no longer be changed.';
      end if;
      if command = 'withdraw' then
        update public.applications set status = 'withdrawn' where id = application.id;
      else
        insert into public.quotes (application_id, amount_cents, description)
        values (application.id, (args->>'amount_cents')::integer, args->>'description')
        on conflict (application_id) do update set amount_cents = excluded.amount_cents,
          description = excluded.description, updated_at = now();
        perform private.notify(project.homeowner_id, project.id, 'A tradesperson sent a quote');
      end if;
    end if;
    return project.id;
  end if;

  if command = 'report' then
    subject_type := args->>'subject_kind';
    target := (args->>'subject_id')::uuid;
    if subject_type = 'project' and private.can_read_project(target) then
      outcome := target;
    elsif subject_type = 'message' then
      select a.project_id into outcome from public.messages m join public.applications a on a.id = m.application_id
      where m.id = target and private.can_read_application(a.id);
      if outcome is null then raise exception 'This message is unavailable.'; end if;
    elsif subject_type = 'tradesperson' and exists (
      select 1 from public.profiles where id = target and role = 'tradesperson' and status = 'active' and onboarded_at is not null
    ) then
      outcome := null;
    elsif subject_type = 'review' and exists (select 1 from public.reviews where id = target and visible) then
      outcome := null;
    else
      raise exception 'This item is unavailable.';
    end if;
    insert into public.reports (reporter_id, project_id, subject_kind, subject_id, reason)
    values (actor, outcome, subject_type, target, args->>'reason') returning id into outcome;
    return outcome;
  end if;

  if command = 'read_notifications' then
    update public.notifications set read_at = now() where user_id = actor and read_at is null;
    return actor;
  end if;

  if command = 'new_order' then
    if account.role <> 'tradesperson' then raise exception 'Only tradespeople can buy tokens.'; end if;
    select * into product from public.billing_products where slug = args->>'product' and active;
    if not found then raise exception 'This product is unavailable.'; end if;
    perform 1 from public.profiles where id = actor and status = 'active' for update;
    if not found then raise exception 'This account is restricted.'; end if;
    if product.interval = 'month' and exists (
      select 1 from public.subscriptions where buyer_id = actor and status <> 'cancelled'
    ) then raise exception 'Manage your current membership before starting another.'; end if;
    if product.interval = 'month' then
      select id into outcome from public.billing_orders where buyer_id = actor and interval = 'month'
        and provider = args->>'provider' and status = 'pending';
      if outcome is not null then
        if not exists (select 1 from public.billing_orders where id = outcome and product_slug = product.slug) then
          raise exception 'Complete or close your pending membership checkout first.';
        end if;
        return outcome;
      end if;
    end if;
    insert into public.billing_orders (buyer_id, product_slug, price_cents, credits, interval, currency, provider)
    values (actor, product.slug, product.price_cents, product.credits, product.interval, product.currency, args->>'provider')
    returning id into outcome;
    return outcome;
  end if;

  if not is_admin then raise exception 'Administration access is required.'; end if;

  if command = 'admin_user' then
    target := (args->>'user_id')::uuid;
    new_state := args->>'operation';
    if target = actor then raise exception 'Ask a different admin to change your account.'; end if;
    lock table public.admin_grants in share row exclusive mode;
    if not private.is_admin() then raise exception 'Administration access is required.'; end if;
    if new_state = 'grant' then
      if not exists (select 1 from public.profiles where id = target and status = 'active') then raise exception 'Choose an active account.'; end if;
      insert into public.admin_grants (user_id, granted_by) values (target, actor) on conflict (user_id) do nothing;
    elsif new_state = 'revoke' then
      delete from public.admin_grants where user_id = target;
    elsif new_state in ('active','banned','deactivated') then
      update public.profiles set status = new_state::public.account_status where id = target;
    elsif new_state = 'delete' then
      if args->>'confirm' is distinct from 'DELETE' then raise exception 'Type DELETE to confirm.'; end if;
      if not exists (select 1 from public.profiles where id = target and status = 'deactivated') then
        raise exception 'Deactivate the account before permanent deletion.';
      end if;
      if exists (select 1 from storage.objects where bucket_id = 'project-photos' and
        (owner_id = target::text or exists (
          select 1 from public.projects p where p.homeowner_id = target and p.id::text = split_part(name,'/',1)
        ))) then raise exception 'Remove this account’s project photos before deleting it.'; end if;
      delete from auth.users where id = target;
    else
      raise exception 'Choose an account action.';
    end if;
    outcome := target;
  elsif command = 'admin_report' then
    target := (args->>'report_id')::uuid;
    new_state := args->>'status';
    if new_state is null or new_state not in ('open','in_review','resolved','dismissed') or
      (new_state in ('resolved','dismissed') and length(trim(coalesce(args->>'resolution',''))) < 3) then
      raise exception 'Choose a status and record a resolution for closed reports.';
    end if;
    update public.reports set status = new_state, resolution = nullif(args->>'resolution',''), handled_by = actor,
      resolved_at = case when new_state in ('resolved','dismissed') then now() end where id = target returning id into outcome;
  elsif command = 'admin_project' then
    target := (args->>'project_id')::uuid;
    if args->>'operation' = 'clear_photo' then
      update public.projects set photo_path = null where id = target returning id into outcome;
    else
      update public.projects set status = 'cancelled' where id = target and status in ('open','awarded') returning id into outcome;
      update public.applications set status = 'declined' where project_id = target and status in ('pending','awarded');
    end if;
  elsif command = 'admin_category' then
    insert into public.categories (slug, name, active)
    values (args->>'slug', args->>'name', coalesce((args->>'active')::boolean, true))
    on conflict (slug) do update set name = excluded.name, active = excluded.active;
  elsif command = 'admin_review' then
    update public.reviews set visible = (args->>'visible')::boolean where id = (args->>'review_id')::uuid returning id into outcome;
  else
    raise exception 'Unknown marketplace action.';
  end if;
  insert into public.audit_log (actor_id, event, subject_id)
  values (actor, command || coalesce(':' || (args->>'operation'), ''), coalesce(outcome::text, args->>'slug', 'unknown'));
  return coalesce(outcome, actor);
end;
$$;

create function public.market_action(command text, args jsonb default '{}'::jsonb) returns uuid
language sql security invoker set search_path = ''
as $$ select private.market_action(command, args); $$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.active_role(), private.owns_project(uuid), private.can_read_project(uuid),
  private.can_read_application(uuid), private.can_read_file(text), private.can_upload_file(text),
  private.market_action(text,jsonb) to authenticated;
revoke all on function public.market_action(text,jsonb) from public, anon, authenticated;
grant execute on function public.market_action(text,jsonb) to authenticated;

create function public.record_billing_event(
  event_key text, event_kind text, billing_provider text, order_key uuid default null,
  payment_ref text default null, membership_ref text default null, total_cents integer default null,
  currency_code text default null, next_renewal timestamptz default null, membership_state text default null
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare
  bill public.billing_orders%rowtype;
  payment public.billing_payments%rowtype;
  debit integer;
  reversal integer;
begin
  insert into public.stripe_webhook_events (id, kind) values (event_key, event_kind) on conflict (id) do nothing;
  if not found then return false; end if;

  if event_kind in ('refunded','disputed','dispute_won') then
    select * into payment from public.billing_payments where provider_ref = payment_ref;
    if not found then raise exception 'Payment is pending reconciliation.'; end if;
    order_key := payment.order_id;
  end if;
  if order_key is null and membership_ref is not null then
    select order_id into order_key from public.subscriptions where provider_ref = membership_ref;
  end if;
  select * into bill from public.billing_orders where id = order_key and provider = billing_provider for update;
  if not found then raise exception 'Checkout is pending reconciliation.'; end if;

  if bill.buyer_id is not null then
    perform 1 from public.profiles where id = bill.buyer_id for update;
  end if;

  if event_kind in ('refunded','disputed','dispute_won') then
    select * into payment from public.billing_payments where provider_ref = payment_ref for update;
  end if;

  if event_kind = 'paid' then
    if payment_ref is null or currency_code is distinct from bill.currency or total_cents is distinct from bill.price_cents then
      raise exception 'Payment does not match the order.';
    end if;
    if bill.interval = 'once' and bill.status in ('paid','refunded','disputed') then return false; end if;
    if bill.interval = 'month' and membership_ref is null then raise exception 'Membership reference is missing.'; end if;

    insert into public.billing_payments (provider_ref, order_id, amount_cents)
    values (payment_ref, bill.id, total_cents) on conflict (provider_ref) do nothing;
    if not found then return false; end if;
    if bill.buyer_id is not null then
      insert into public.token_ledger (user_id, delta, reason, reference)
      values (bill.buyer_id, bill.credits,
        case when bill.interval = 'month' then 'Membership credit' else 'Token top-up' end,
        'payment:' || payment_ref);
    end if;
    update public.billing_orders set status = 'paid' where id = bill.id;
    if bill.interval = 'month' then
      insert into public.subscriptions (buyer_id, order_id, provider_ref, product_slug, status, renews_at)
      values (bill.buyer_id, bill.id, membership_ref, bill.product_slug, 'active', next_renewal)
      on conflict (provider_ref) do update set
        status = case when public.subscriptions.status = 'cancelled' then 'cancelled' else 'active' end,
        renews_at = greatest(public.subscriptions.renews_at, excluded.renews_at);
    end if;
  elsif event_kind in ('refunded','disputed','dispute_won') then
    if total_cents is null or total_cents < 0 or total_cents > payment.amount_cents then
      raise exception 'Invalid reversal amount.';
    end if;
    reversal := case
      when event_kind = 'dispute_won' then total_cents
      when event_kind = 'disputed' then greatest(payment.reversed_cents, total_cents)
      else greatest(payment.reversed_cents, total_cents)
    end;
    debit := floor(bill.credits::numeric * payment.reversed_cents / payment.amount_cents)
       - floor(bill.credits::numeric * reversal / payment.amount_cents);
    if bill.buyer_id is not null and debit <> 0 then
      insert into public.token_ledger (user_id, delta, reason, reference)
      values (bill.buyer_id, debit, case when debit < 0 then 'Payment reversal' else 'Reinstated credits' end, 'reversal:' || event_key);
    end if;
    update public.billing_payments set reversed_cents = reversal,
      dispute_open = case when event_kind = 'disputed' then true when event_kind = 'dispute_won' then false else dispute_open end
    where provider_ref = payment_ref;
    update public.billing_orders set status = case
      when event_kind = 'disputed' or (event_kind = 'refunded' and payment.dispute_open) then 'disputed'
      when reversal = payment.amount_cents then 'refunded' else 'paid' end where id = bill.id;
  elsif event_kind = 'failed' then
    update public.billing_orders set status = 'failed' where id = bill.id and status = 'pending';
    update public.subscriptions set status = 'past_due' where order_id = bill.id and status not in ('cancelled','cancelling');
  elsif event_kind = 'membership' then
    if membership_state is null or membership_state not in ('active','past_due','cancelling','cancelled') then
      raise exception 'Invalid membership state.';
    end if;
    update public.subscriptions set status = membership_state, renews_at = coalesce(next_renewal, renews_at)
    where order_id = bill.id and status <> 'cancelled';
  else
    raise exception 'Unknown event.';
  end if;
  return true;
end;
$$;

revoke all on function public.record_billing_event(text,text,text,uuid,text,text,integer,text,timestamptz,text)
  from public, anon, authenticated;
grant execute on function public.record_billing_event(text,text,text,uuid,text,text,integer,text,timestamptz,text)
  to service_role;

create function private.submit_contact(sender_name text, sender_email text, body text) returns void
language plpgsql security definer set search_path = ''
as $$
declare hits integer;
begin
  if sender_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Enter a valid email.'; end if;
  insert into private.contact_limits as rate (address_key, window_started, used)
  values (md5(lower(sender_email)), now(), 1)
  on conflict (address_key) do update set
    used = case when rate.window_started + interval '15 minutes' <= now() then 1 else rate.used + 1 end,
    window_started = case when rate.window_started + interval '15 minutes' <= now() then now() else rate.window_started end
  returning used into hits;
  if hits > 3 then raise exception 'Please wait before sending another message.'; end if;
  insert into public.feedback (name, email, message) values (sender_name, sender_email, body);
end;
$$;
create function public.submit_contact(sender_name text, sender_email text, body text) returns void
language sql security invoker set search_path = ''
as $$ select private.submit_contact(sender_name,sender_email,body); $$;
revoke all on function private.submit_contact(text,text,text), public.submit_contact(text,text,text)
  from public, anon, authenticated;
grant execute on function private.submit_contact(text,text,text), public.submit_contact(text,text,text) to anon, authenticated;
