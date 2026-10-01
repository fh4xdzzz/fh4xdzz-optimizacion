-- AI-assisted intake for private support chats.
-- Assistant messages intentionally have no human sender.

alter table public.chat_messages
  alter column sender_id drop not null;

alter table public.chat_messages
  drop constraint if exists chat_messages_sender_role_check;

alter table public.chat_messages
  add constraint chat_messages_sender_role_check
  check (sender_role in ('client', 'admin', 'staff', 'owner', 'assistant'));

alter table public.chat_sessions
  add column if not exists ai_intake jsonb not null default '{}'::jsonb,
  add column if not exists ai_handoff_ready boolean not null default false,
  add column if not exists ai_summary text,
  add column if not exists ai_last_response_at timestamptz;

alter table public.chat_sessions
  drop constraint if exists chat_sessions_ai_intake_object_check;

alter table public.chat_sessions
  add constraint chat_sessions_ai_intake_object_check
  check (jsonb_typeof(ai_intake) = 'object');

comment on column public.chat_sessions.ai_intake is
  'Structured, non-sensitive support details collected by the virtual assistant.';

comment on column public.chat_sessions.ai_handoff_ready is
  'True once the assistant has enough context for a human support agent.';

