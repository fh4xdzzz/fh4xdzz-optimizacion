-- Función para limpiar chats cerrados después de 24 horas
CREATE OR REPLACE FUNCTION cleanup_old_closed_chats()
RETURNS void AS $$
BEGIN
  -- Eliminar mensajes de chats cerrados hace más de 24 horas
  DELETE FROM public.chat_messages
  WHERE session_id IN (
    SELECT id FROM public.chat_sessions
    WHERE status = 'closed'
    AND closed_at < NOW() - INTERVAL '24 hours'
  );

  -- Eliminar chats cerrados hace más de 24 horas
  DELETE FROM public.chat_sessions
  WHERE status = 'closed'
  AND closed_at < NOW() - INTERVAL '24 hours';

  -- Eliminar registros de auditoría antiguos (opcional, para limpiar logs)
  DELETE FROM public.chat_audit_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para ejecutar la limpieza cada hora
-- Nota: Esto requiere pg_cron extension
-- Si pg_cron no está disponible, puedes ejecutar la función manualmente
-- o usar un webhook desde Vercel cron jobs

-- Para usar pg_cron (si está disponible en tu plan):
-- SELECT cron.schedule(
--   'cleanup-old-chats',
--   '0 * * * *', -- Cada hora
--   'SELECT cleanup_old_closed_chats();'
-- );

-- Alternativa: Crear trigger que limpie al insertar nuevos chats
-- Esto mantiene la base de datos limpia gradualmente
CREATE OR REPLACE FUNCTION trigger_cleanup_on_new_chat()
RETURNS trigger AS $$
BEGIN
  -- Ejecutar limpieza en segundo plano (no bloquear la inserción)
  PERFORM pg_notify('cleanup_old_chats', NOW()::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en chat_sessions
DROP TRIGGER IF EXISTS trigger_cleanup_notify ON public.chat_sessions;
CREATE TRIGGER trigger_cleanup_notify
  AFTER INSERT ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_on_new_chat();
