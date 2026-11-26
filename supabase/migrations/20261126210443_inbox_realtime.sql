create policy receive_own_inbox_events on realtime.messages for select to authenticated
using (
  extension = 'broadcast'
  and topic = (select realtime.topic())
  and topic = 'inbox:' || (select auth.uid())::text
  and (select private.active_role()) is not null
);

-- Broadcast only the identifiers clients need to reload data through existing RLS.
create function private.broadcast_inbox_messages() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform realtime.send(jsonb_build_object('applicationId', event.application_id, 'projectId', event.project_id),
      'message', 'inbox:' || event.user_id::text, true)
    from (
      select distinct participant.user_id, message.application_id, application.project_id
      from new_messages message
      join public.applications application on application.id = message.application_id
      cross join lateral (values (message.sender_id), (message.recipient_id)) participant(user_id)
      join public.profiles profile on profile.id = participant.user_id and profile.status = 'active'
    ) event;
  else
    perform realtime.send(jsonb_build_object('applicationId', event.application_id),
      'message-read', 'inbox:' || event.recipient_id::text, true)
    from (
      select distinct current_message.recipient_id, current_message.application_id
      from new_messages current_message
      join old_messages previous_message on previous_message.id = current_message.id
      where current_message.recipient_id is not null
        and current_message.read_at is distinct from previous_message.read_at
    ) event;
  end if;
  return null;
end;
$$;

create function private.broadcast_inbox_notifications() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform realtime.send('{}'::jsonb, 'notification', 'inbox:' || event.user_id::text, true)
    from (
      select distinct notification.user_id
      from new_notifications notification
      join public.profiles profile on profile.id = notification.user_id and profile.status = 'active'
    ) event;
  else
    perform realtime.send('{}'::jsonb, 'notification', 'inbox:' || event.user_id::text, true)
    from (
      select distinct current_notification.user_id
      from new_notifications current_notification
      join old_notifications previous_notification on previous_notification.id = current_notification.id
      where current_notification.read_at is distinct from previous_notification.read_at
    ) event;
  end if;
  return null;
end;
$$;

revoke all on function private.broadcast_inbox_messages(), private.broadcast_inbox_notifications()
  from public, anon, authenticated;

create trigger broadcast_inbox_messages after insert on public.messages
referencing new table as new_messages for each statement execute function private.broadcast_inbox_messages();

create trigger broadcast_inbox_message_reads after update on public.messages
referencing old table as old_messages new table as new_messages
for each statement execute function private.broadcast_inbox_messages();

create trigger broadcast_inbox_notifications after insert on public.notifications
referencing new table as new_notifications for each statement execute function private.broadcast_inbox_notifications();

create trigger broadcast_inbox_notification_reads after update on public.notifications
referencing old table as old_notifications new table as new_notifications
for each statement execute function private.broadcast_inbox_notifications();
