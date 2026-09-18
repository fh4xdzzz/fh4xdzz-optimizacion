-- =====================================================
-- Verificar si la tabla users tiene replica identity
-- =====================================================

-- Verificar replica identity de la tabla users
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
AND tablename = 'users'
AND attname IN ('id', 'online', 'last_seen')
ORDER BY attname;

-- Verificar si la tabla users tiene replica identity configurada
SELECT 
  schemaname,
  tablename,
  indrelid::regclass AS index_name
FROM pg_publication_tables
WHERE schemaname = 'public'
AND tablename = 'users';

-- Si no tiene replica identity, ejecutar esto:
-- ALTER TABLE public.users REPLICA IDENTITY FULL;
