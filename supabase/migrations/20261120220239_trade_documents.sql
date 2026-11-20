alter type public.application_status add value if not exists 'completed';

create function private.complete_application() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.applications set status = 'completed'
  where project_id = new.id and tradesperson_id = new.awarded_to and status = 'awarded';
  return new;
end;
$$;
revoke all on function private.complete_application() from public, anon, authenticated;
create trigger complete_awarded_application after update of status on public.projects
for each row when (old.status is distinct from new.status and new.status = 'completed')
execute function private.complete_application();

create table public.trade_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 3 and 85),
  object_path text not null unique,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  staff_note text check (char_length(staff_note) <= 500),
  reviewed_by uuid references public.profiles on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.trade_documents enable row level security;
revoke all on public.trade_documents from public, anon, authenticated;
grant select, delete on public.trade_documents to authenticated;
grant insert (title,object_path) on public.trade_documents to authenticated;
grant select, insert, update, delete on public.trade_documents to service_role;
create index trade_docs_owner_idx on public.trade_documents (owner_id, created_at desc);
create index trade_docs_status_idx on public.trade_documents (status, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trade-documents','trade-documents',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp']);

create policy read_trade_documents on storage.objects for select to authenticated
using (bucket_id = 'trade-documents' and (
  (select private.is_admin()) or ((select private.active_role()) = 'tradesperson' and split_part(name,'/',1) = (select auth.uid())::text)
));
create policy upload_trade_documents on storage.objects for insert to authenticated
with check (bucket_id = 'trade-documents' and (select private.active_role()) = 'tradesperson'
  and split_part(name,'/',1) = (select auth.uid())::text);
create policy remove_trade_documents on storage.objects for delete to authenticated
using (bucket_id = 'trade-documents' and (
  (select private.is_admin()) or ((select private.active_role()) = 'tradesperson' and split_part(name,'/',1) = (select auth.uid())::text)
));

create policy view_trade_documents on public.trade_documents for select to authenticated
using ((select private.is_admin()) or ((select private.active_role()) = 'tradesperson' and owner_id = (select auth.uid())));
create policy add_trade_documents on public.trade_documents for insert to authenticated
with check ((select private.active_role()) = 'tradesperson' and owner_id = (select auth.uid())
  and status = 'pending' and staff_note is null and reviewed_by is null and reviewed_at is null
  and split_part(object_path,'/',1) = (select auth.uid())::text
  and exists (select 1 from storage.objects where name = object_path and bucket_id = 'trade-documents'));
create policy delete_trade_documents on public.trade_documents for delete to authenticated
using ((select private.is_admin()) or ((select private.active_role()) = 'tradesperson' and owner_id = (select auth.uid())));

create function private.review_trade_document(document_key uuid, decision text, reason text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Administration access is required.'; end if;
  if decision not in ('approved','declined') or (decision = 'declined' and length(trim(coalesce(reason,''))) < 3) then
    raise exception 'Choose a decision and explain any decline.';
  end if;
  update public.trade_documents set status = decision, staff_note = nullif(reason,''), reviewed_by = (select auth.uid()),
    reviewed_at = now() where id = document_key;
  if not found then raise exception 'Document is unavailable.'; end if;
  insert into public.audit_log (actor_id,event,subject_id) values ((select auth.uid()), 'trade_document:' || decision, document_key::text);
end;
$$;
create function public.review_trade_document(document_key uuid, decision text, reason text) returns void
language sql security invoker set search_path = ''
as $$ select private.review_trade_document(document_key,decision,reason); $$;
revoke all on function private.review_trade_document(uuid,text,text), public.review_trade_document(uuid,text,text)
  from public, anon, authenticated;
grant execute on function private.review_trade_document(uuid,text,text), public.review_trade_document(uuid,text,text)
  to authenticated;

create function private.require_trade_document_cleanup() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from storage.objects where bucket_id = 'trade-documents' and split_part(name,'/',1) = old.id::text) then
    raise exception 'Remove this account’s trade documents before permanent deletion.';
  end if;
  return old;
end;
$$;
revoke all on function private.require_trade_document_cleanup() from public, anon, authenticated;
create trigger remove_trade_documents_first before delete on auth.users
for each row execute function private.require_trade_document_cleanup();
notify pgrst, 'reload schema';
