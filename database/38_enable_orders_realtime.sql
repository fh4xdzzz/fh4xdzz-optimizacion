-- =====================================================
-- Habilitar Realtime para la tabla orders
-- =====================================================

-- Habilitar replica identity para la tabla orders
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Verificar replica identity
SELECT 
  relname AS table_name,
  relreplident AS replica_identity
FROM pg_class
WHERE relname = 'orders'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Agregar orders a la publicación Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Verificar la configuración
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename = 'orders';
