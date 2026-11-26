alter table public.messages
  add column recipient_id uuid references public.profiles(id) on delete cascade,
  add column read_at timestamptz;

-- Earlier messages had no read state, so only new deliveries start unread.
update public.messages m
set recipient_id = case
      when m.sender_id = p.homeowner_id and m.sender_id <> a.tradesperson_id then a.tradesperson_id
      when m.sender_id = a.tradesperson_id and m.sender_id <> p.homeowner_id then p.homeowner_id
    end,
    read_at = now()
from public.applications a
join public.projects p on p.id = a.project_id
where a.id = m.application_id;

create index messages_recipient_read_idx
  on public.messages (recipient_id, read_at, application_id);
create index notifications_unread_recipient_idx
  on public.notifications (user_id) where read_at is null;

create function private.set_message_recipient() returns trigger
language plpgsql set search_path = ''
as $$
begin
  select case
      when new.sender_id = p.homeowner_id and new.sender_id <> a.tradesperson_id then a.tradesperson_id
      when new.sender_id = a.tradesperson_id and new.sender_id <> p.homeowner_id then p.homeowner_id
    end
  into new.recipient_id
  from public.applications a
  join public.projects p on p.id = a.project_id
  where a.id = new.application_id;
  return new;
end;
$$;

revoke all on function private.set_message_recipient() from public, anon, authenticated;
create trigger set_message_recipient before insert on public.messages
for each row execute function private.set_message_recipient();

create function private.mark_message_thread_read(last_message_id uuid) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  thread_key uuid;
  seen_at timestamptz;
  marked integer;
begin
  if actor is null or private.active_role() is null then
    raise exception 'Finish setting up an active account before marking messages read.';
  end if;

  select m.application_id, m.created_at into thread_key, seen_at
  from public.messages m
  where m.id = last_message_id
    and m.recipient_id = actor
    and private.can_read_application(m.application_id);
  if not found then raise exception 'This message is unavailable.'; end if;

  update public.messages m
  set read_at = now()
  where m.application_id = thread_key
    and m.recipient_id = actor
    and m.read_at is null
    and (m.created_at, m.id) <= (seen_at, last_message_id);
  get diagnostics marked = row_count;
  return marked;
end;
$$;

create function public.mark_message_thread_read(last_message_id uuid) returns integer
language sql security invoker set search_path = ''
as $$ select private.mark_message_thread_read(last_message_id); $$;
revoke all on function private.mark_message_thread_read(uuid), public.mark_message_thread_read(uuid)
  from public, anon, authenticated;
grant execute on function private.mark_message_thread_read(uuid), public.mark_message_thread_read(uuid)
  to authenticated;

notify pgrst, 'reload schema';
