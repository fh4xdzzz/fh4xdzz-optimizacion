-- =====================================================
-- Habilitar Realtime para chat_messages
-- =====================================================

-- Agregar la tabla chat_messages a la publicación de Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
