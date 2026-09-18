-- =====================================================
-- Agregar columna is_featured a la tabla services
-- =====================================================

-- Agregar columna is_featured
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_services_is_featured ON public.services(is_featured);

-- Verificar la columna
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'services'
AND column_name = 'is_featured';

-- Marcar algunos servicios como destacados (opcional)
-- UPDATE public.services SET is_featured = true WHERE id IN ('service_id_1', 'service_id_2');
