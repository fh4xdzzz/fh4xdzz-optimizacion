-- =====================================================
-- Configurar REPLICA IDENTITY FULL para la tabla orders
-- Esto permite que los eventos DELETE incluyan todos los
-- valores de las filas eliminadas, permitiendo filtros
-- en suscripciones Realtime
-- =====================================================

-- Configurar REPLICA IDENTITY FULL para la tabla orders
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Verificar la configuración
SELECT 
  schemaname,
  tablename,
  CASE relreplident
    WHEN 'd' THEN 'default (primary key only)'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full (all columns)'
    WHEN 'i' THEN 'index (using unique index)'
  END as replica_identity
FROM pg_publication_tables pt
JOIN pg_class c ON pt.tablename = c.relname
WHERE pubname = 'supabase_realtime' 
AND tablename = 'orders';
