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

-- Verificar si la tabla users está en la publicación real-time
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE schemaname = 'public'
AND tablename = 'users';

-- Verificar replica identity de la tabla users
SELECT 
  relname AS table_name,
  relreplident AS replica_identity
FROM pg_class
WHERE relname = 'users'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Si replica_identity es 'd' (default) o 'n' (nothing), necesitas ejecutar:
-- ALTER TABLE public.users REPLICA IDENTITY FULL;
