-- =====================================================
-- Agregar columna last_seen a la tabla users
-- =====================================================

-- Agregar columna last_seen
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Verificar la configuración
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name = 'last_seen';
