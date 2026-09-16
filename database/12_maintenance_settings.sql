-- =====================================================
-- Configuración inicial del modo de mantenimiento
-- =====================================================

-- Insertar configuración de mantenimiento si no existe
INSERT INTO public.business_settings (key, value, description)
VALUES (
  'maintenance_mode',
  '{"enabled": false, "message": "Sitio en mantenimiento. Vuelve pronto.", "updated_at": "' || NOW()::text || '"}',
  'Configuración del modo de mantenimiento'
)
ON CONFLICT (key) DO NOTHING;
