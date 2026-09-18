-- Habilitar Supabase Realtime para las tablas de chat
-- Esto permite actualizaciones en tiempo real sin polling

-- Habilitar Realtime para chat_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;

-- Habilitar Realtime para chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Habilitar Realtime para chat_attachments
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_attachments;

-- Nota: No habilitamos Realtime para:
-- - chat_ratings (no necesita updates en tiempo real)
-- - canned_responses (cambia raramente)
-- - internal_notes (solo para staff)
-- - chat_audit_logs (solo para auditoría)

-- Configurar filtros Realtime específicos si es necesario
-- Por defecto, Supabase Realtime respeta las políticas RLS
