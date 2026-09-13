-- =====================================================
-- Tabla: business_settings (Configuración del negocio)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_business_settings_key ON public.business_settings(setting_key);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_business_settings_updated_at ON public.business_settings;
CREATE TRIGGER update_business_settings_updated_at
    BEFORE UPDATE ON public.business_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes para evitar errores
DROP POLICY IF EXISTS "Anyone can view business_settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can view all business_settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update business_settings" ON public.business_settings;
DROP POLICY IF EXISTS "No direct inserts allowed" ON public.business_settings;
DROP POLICY IF EXISTS "No direct deletes allowed" ON public.business_settings;

-- Todos pueden ver configuración del negocio
CREATE POLICY "Anyone can view business_settings"
    ON public.business_settings FOR SELECT
    USING (true);

-- Solo admins pueden actualizar configuración
CREATE POLICY "Admins can update business_settings"
    ON public.business_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- No se permiten inserts directos
CREATE POLICY "No direct inserts allowed"
    ON public.business_settings FOR INSERT
    WITH CHECK (false);

-- No se permiten deletes directos
CREATE POLICY "No direct deletes allowed"
    ON public.business_settings FOR DELETE
    USING (false);

-- =====================================================
-- Datos iniciales (Configuración del negocio)
-- =====================================================

INSERT INTO public.business_settings (setting_key, setting_value, description) VALUES
('business_info', '{"name": "TheDulcanDesign", "email": "contact@thedulcandesign.com", "phone": "", "address": "", "discord": "https://discord.gg/EDaCnZgC6T"}', 'Información básica del negocio')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();

INSERT INTO public.business_settings (setting_key, setting_value, description) VALUES
('contact_form', '{"enabled": true, "recaptcha_enabled": false}', 'Configuración del formulario de contacto')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();

INSERT INTO public.business_settings (setting_key, setting_value, description) VALUES
('social_links', '{"discord": "https://discord.gg/EDaCnZgC6T", "twitter": "", "youtube": "", "instagram": ""}', 'Enlaces a redes sociales')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();

INSERT INTO public.business_settings (setting_key, setting_value, description) VALUES
('payment_settings', '{"currency": "USD", "paypal_enabled": false, "stripe_enabled": false}', 'Configuración de pagos')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();

INSERT INTO public.business_settings (setting_key, setting_value, description) VALUES
('maintenance_mode', '{"enabled": false, "message": "Sitio en mantenimiento. Vuelve pronto."}', 'Modo de mantenimiento')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
