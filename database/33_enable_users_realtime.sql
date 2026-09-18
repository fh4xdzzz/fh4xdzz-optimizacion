-- =====================================================
-- Habilitar Realtime para la tabla users
-- =====================================================

-- Agregar users a la publicación Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- Verificar la configuración
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;
