-- =====================================================
-- Tabla: services (Servicios ofrecidos)
-- =====================================================
-- NOTA: Este script ahora usa CREATE TABLE IF NOT EXISTS para ser seguro
-- El DROP TABLE fue eliminado para evitar pérdida de datos en producción
-- Si necesitas recrear la tabla, hazlo manualmente con DROP TABLE

CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'obs',
        'streaming',
        'pc_windows',
        'gaming',
        'design',
        'support',
        'custom'
    )),
    benefits TEXT[],
    includes TEXT[],
    price DECIMAL(10, 2) NOT NULL,
    duration_estimate TEXT, -- e.g., "1-2 horas", "24-48 horas"
    image_url TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_is_featured ON public.services(is_featured);
CREATE INDEX IF NOT EXISTS idx_services_sort_order ON public.services(sort_order);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes para evitar errores
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
DROP POLICY IF EXISTS "Admins can create services" ON public.services;
DROP POLICY IF EXISTS "Admins can update services" ON public.services;
DROP POLICY IF EXISTS "Admins can delete services" ON public.services;

-- Todos pueden ver servicios activos
CREATE POLICY "Anyone can view active services"
    ON public.services FOR SELECT
    USING (is_active = true);

-- Los admins pueden ver todos los servicios
CREATE POLICY "Admins can view all services"
    ON public.services FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Solo admins pueden crear servicios
CREATE POLICY "Admins can create services"
    ON public.services FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Solo admins pueden actualizar servicios
CREATE POLICY "Admins can update services"
    ON public.services FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Solo admins pueden eliminar servicios
CREATE POLICY "Admins can delete services"
    ON public.services FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- Datos de ejemplo (Demo)
-- =====================================================

INSERT INTO public.services (name, slug, description, category, benefits, includes, price, duration_estimate, is_active, is_featured, sort_order) VALUES
('Optimización de OBS', 'optimizacion-obs', 'Configuración profesional de OBS Studio para streaming de alta calidad', 'obs', ARRAY['Mejor calidad de video', 'Uso optimizado de CPU', 'Configuración de escenas', 'Transiciones suaves'], ARRAY['Configuración de salida', 'Escenas y fuentes', 'Hotkeys personalizados', 'Optimización de bitrate'], 29.99, '1-2 horas', true, true, 1),
('Configuración de Streaming', 'configuracion-streaming', 'Setup completo para Twitch, YouTube u otras plataformas', 'streaming', ARRAY['Streaming estable', 'Alertas personalizadas', 'Chat integrado', 'Overlay profesional'], ARRAY['Configuración de plataforma', 'Alertas y widgets', 'Overlay básico', 'Guía de uso'], 49.99, '2-3 horas', true, true, 2),
('Optimización de PC/Windows', 'optimizacion-pc-windows', 'Mejora del rendimiento del sistema para gaming y productividad', 'pc_windows', ARRAY['Sistema más rápido', 'Menos latencia', 'Mejor rendimiento en juegos', 'Eliminación de bloatware'], ARRAY['Optimización de inicio', 'Limpieza de sistema', 'Configuración de energía', 'Actualización de drivers'], 39.99, '1-2 horas', true, false, 3),
('Configuración Gaming', 'configuracion-gaming', 'Optimización específica para tus juegos favoritos', 'gaming', ARRAY['Mejor FPS', 'Menos input lag', 'Configuración gráfica óptima', 'Sensibilidad ideal'], ARRAY['Configuración gráfica', 'Sensibilidad y controles', 'Optimización de red', 'Configuración de perfiles'], 24.99, '1 hora por juego', true, false, 4),
('Diseño de Overlays y Alertas', 'diseno-overlays-alertas', 'Elementos visuales personalizados para tu stream', 'design', ARRAY['Diseño único', 'Animaciones profesionales', 'Branding personalizado', 'Elementos editables'], ARRAY['Overlay principal', 'Alertas de follower/sub', 'Brb/Starting screens', 'Be thankful screens'], 59.99, '3-5 días', true, false, 5),
('Soporte Técnico', 'soporte-tecnico', 'Resolución de problemas técnicos y consultas', 'support', ARRAY['Solución rápida', 'Expertos técnicos', 'Guía paso a paso', 'Prevención de problemas'], ARRAY['Diagnóstico del problema', 'Solución implementada', 'Guía de prevención', 'Soporte follow-up'], 19.99, '30-60 minutos', true, false, 6),
('Servicios Personalizados', 'servicios-personalizados', 'Soluciones a medida según tus necesidades', 'custom', ARRAY['Solución específica', 'Atención personalizada', 'Flexibilidad total', 'Soporte dedicado'], ARRAY['Consultoría inicial', 'Desarrollo de solución', 'Implementación', 'Soporte post-entrega'], 99.99, 'Según complejidad', true, false, 7);
