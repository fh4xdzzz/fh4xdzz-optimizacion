-- =====================================================
-- Agregar columna discord_avatar a la tabla users
-- Esto permite guardar el avatar de Discord directamente
-- =====================================================

-- Agregar columna discord_avatar
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS discord_avatar TEXT;

-- Verificar la configuración
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('discord_avatar', 'avatar_url')
ORDER BY column_name;
