-- Reclamo atómico: un agente solo puede atender una conversación a la vez.
-- Ejecutar esta migración en Supabase antes de desplegar el nuevo panel.

create or replace function public.claim_chat_session(p_session_id uuid)
returns public.chat_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_chat public.chat_sessions;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  select role into v_role from public.users where id = v_user_id;
  if v_role not in ('staff', 'admin', 'owner') then
    raise exception 'FORBIDDEN';
  end if;

  -- Serializa todos los reclamos hechos por el mismo agente.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  if exists (
    select 1 from public.chat_sessions
    where assigned_agent_id = v_user_id and status <> 'closed'
  ) then
    raise exception 'AGENT_ALREADY_BUSY';
  end if;

  select * into v_chat
  from public.chat_sessions
  where id = p_session_id
  for update;

  if v_chat.id is null then
    raise exception 'CHAT_NOT_FOUND';
  end if;

  if v_chat.status = 'closed' or v_chat.assigned_agent_id is not null then
    raise exception 'CHAT_ALREADY_CLAIMED';
  end if;

  update public.chat_sessions
  set assigned_agent_id = v_user_id,
      status = 'active',
      claimed_at = now(),
      updated_at = now()
  where id = p_session_id
  returning * into v_chat;

  return v_chat;
end;
$$;

revoke all on function public.claim_chat_session(uuid) from public;
grant execute on function public.claim_chat_session(uuid) to authenticated;
