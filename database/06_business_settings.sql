-- =====================================================
-- Tabla: business_settings (Configuración del negocio)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_business_settings_key ON public.business_settings(key);

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
DROP POLICY IF EXISTS "Anyone can view public settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can view all settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can create settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.business_settings;

-- Todos pueden ver configuraciones públicas
CREATE POLICY "Anyone can view public settings"
    ON public.business_settings FOR SELECT
    USING (key LIKE 'public_%');

-- Los admins pueden ver todas las configuraciones
CREATE POLICY "Admins can view all settings"
    ON public.business_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Solo admins pueden crear configuraciones
CREATE POLICY "Admins can create settings"
    ON public.business_settings FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Solo admins pueden actualizar configuraciones
CREATE POLICY "Admins can update settings"
    ON public.business_settings FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Solo admins pueden eliminar configuraciones
CREATE POLICY "Admins can delete settings"
    ON public.business_settings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- Configuraciones iniciales
-- =====================================================

INSERT INTO public.business_settings (key, value, description) VALUES
('public_business_info', '{
    "name": "TheDulcanDesign",
    "tagline": "Servicios profesionales de optimización",
    "description": "Expertos en optimización de OBS, streaming, PC/Windows, gaming y soporte técnico.",
    "email": "contact@fh4xdzz.com",
    "discord": "https://discord.gg/EDaCnZgC6T",
    "social_media": {
        "twitter": "",
        "youtube": "",
        "instagram": ""
    }
}', 'Información pública del negocio'),

('public_contact_info', '{
    "email": "contact@fh4xdzz.com",
    "discord": "https://discord.gg/EDaCnZgC6T",
    "response_time": "24-48 horas",
    "business_hours": "Lun-Vie 10:00-22:00, Sáb-Dom 12:00-20:00"
}', 'Información de contacto pública'),

('public_features', '{
    "features": [
        "Optimización profesional de OBS",
        "Configuración completa de streaming",
        "Mejora de rendimiento de PC",
        "Diseño de overlays personalizados",
        "Soporte técnico especializado",
        "Servicios a medida"
    ],
    "benefits": [
        "Mejor calidad de streaming",
        "Mayor rendimiento en juegos",
        "Ahorro de tiempo y esfuerzo",
        "Soporte dedicado",
        "Resultados garantizados"
    ]
}', 'Características y beneficios destacados'),

('admin_notification_settings', '{
    "new_order_notification": true,
    "new_ticket_notification": true,
    "email_notifications": true,
    "discord_notifications": true,
    "notification_channels": {
        "orders": "staff-notifications",
        "tickets": "support-staff"
    }
}', 'Configuración de notificaciones para administradores'),

('admin_order_settings', '{
    "auto_assign": false,
    "default_status": "pending",
    "allow_client_cancellation": true,
    "cancellation_hours": 24,
    "require_approval": false
}', 'Configuración de gestión de pedidos'),

('admin_ticket_settings', '{
    "auto_close_days": 7,
    "max_open_tickets": 3,
    "require_category": true,
    "auto_assign_staff": false,
    "priority_rules": {
        "technical_issue": "high",
        "billing": "urgent",
        "service_request": "normal"
    }
}', 'Configuración de gestión de tickets');
