-- =====================================================
-- Agregar columnas de attachment a la tabla chat_messages
-- =====================================================

-- Agregar columnas si no existen
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_path TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- Verificar las columnas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chat_messages'
AND column_name IN ('attachment_path', 'attachment_name')
ORDER BY column_name;
