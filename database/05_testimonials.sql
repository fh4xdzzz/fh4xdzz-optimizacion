-- =====================================================
-- Tabla: testimonials (Testimonios de clientes)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_avatar TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    is_displayed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_testimonials_user_id ON public.testimonials(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_order_id ON public.testimonials(order_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_is_displayed ON public.testimonials(is_displayed);
CREATE INDEX IF NOT EXISTS idx_testimonials_rating ON public.testimonials(rating);
CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON public.testimonials(created_at);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_testimonials_updated_at ON public.testimonials;
CREATE TRIGGER update_testimonials_updated_at
    BEFORE UPDATE ON public.testimonials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes para evitar errores
DROP POLICY IF EXISTS "Anyone can view displayed testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Users can view own testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can view all testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Users can create testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can update any testimonial" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can delete testimonials" ON public.testimonials;

-- Todos pueden ver testimonios mostrados
CREATE POLICY "Anyone can view displayed testimonials"
    ON public.testimonials FOR SELECT
    USING (is_displayed = true);

-- Los usuarios pueden ver sus propios testimonios
CREATE POLICY "Users can view own testimonials"
    ON public.testimonials FOR SELECT
    USING (auth.uid() = user_id);

-- Los admins pueden ver todos los testimonios
CREATE POLICY "Admins can view all testimonials"
    ON public.testimonials FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Los usuarios pueden crear testimonios
CREATE POLICY "Users can create testimonials"
    ON public.testimonials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Los admins pueden actualizar cualquier testimonio
CREATE POLICY "Admins can update any testimonial"
    ON public.testimonials FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Los admins pueden eliminar testimonios
CREATE POLICY "Admins can delete testimonials"
    ON public.testimonials FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- Datos de ejemplo (Demo)
-- =====================================================

INSERT INTO public.testimonials (client_name, rating, title, content, is_verified, is_displayed) VALUES
('Carlos Gaming', 5, 'Excelente servicio', 'La optimización de OBS mejoró mucho mi stream, ahora tengo calidad profesional sin lag. ¡Muy recomendado!', true, true),
('Maria Streamer', 5, 'Perfecto para empezar', 'Me ayudaron con todo el setup de streaming desde cero. El soporte fue increíble y muy paciente.', true, true),
('AlexPro Player', 4, 'Buen resultado', 'Mi PC va mucho más rápido después de la optimización. Solo le doy 4 estrellas porque tardó un poco más de lo esperado, pero el resultado vale la pena.', true, true),
('TechMaster', 5, 'Profesionales de verdad', 'El diseño de overlays quedó espectacular, exactamente lo que quería para mi marca. Volveré a pedir más servicios.', true, false);