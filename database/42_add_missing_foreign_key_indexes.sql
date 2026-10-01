-- Add covering indexes for foreign keys reported by Supabase's performance advisor.
-- These indexes speed up joins and parent-row updates/deletes without changing access rules.

create index if not exists idx_canned_responses_created_by
  on public.canned_responses (created_by);

create index if not exists idx_chat_attachments_session_id
  on public.chat_attachments (session_id);

create index if not exists idx_chat_attachments_uploaded_by
  on public.chat_attachments (uploaded_by);

create index if not exists idx_chat_audit_logs_actor_id
  on public.chat_audit_logs (actor_id);

create index if not exists idx_chat_audit_logs_session_id
  on public.chat_audit_logs (session_id);

create index if not exists idx_chat_ratings_agent_id
  on public.chat_ratings (agent_id);

create index if not exists idx_chat_ratings_client_id
  on public.chat_ratings (client_id);

create index if not exists idx_chat_sessions_assigned_agent_id
  on public.chat_sessions (assigned_agent_id);

create index if not exists idx_chat_sessions_client_id
  on public.chat_sessions (client_id);

create index if not exists idx_chat_sessions_closed_by
  on public.chat_sessions (closed_by);

create index if not exists idx_internal_notes_client_id
  on public.internal_notes (client_id);

create index if not exists idx_internal_notes_created_by
  on public.internal_notes (created_by);

create index if not exists idx_internal_notes_session_id
  on public.internal_notes (session_id);

create index if not exists idx_order_events_created_by
  on public.order_events (created_by);

create index if not exists idx_tickets_order_id
  on public.tickets (order_id);

