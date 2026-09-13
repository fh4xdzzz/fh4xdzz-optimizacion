-- =====================================================
-- Tabla: chat_messages (Mensajes de chat de soporte)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    is_from_admin BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes para evitar errores
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can view all chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can create chat messages" ON public.chat_messages;

-- Los usuarios pueden ver sus propios mensajes
CREATE POLICY "Users can view own chat messages"
    ON public.chat_messages FOR SELECT
    USING (auth.uid() = user_id);

-- Los admins pueden ver todos los mensajes
CREATE POLICY "Admins can view all chat messages"
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Los usuarios pueden crear mensajes (enviar al admin)
CREATE POLICY "Users can create chat messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Los admins pueden crear mensajes (responder a usuarios)
CREATE POLICY "Admins can create chat messages"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Los usuarios pueden marcar sus mensajes como leídos
CREATE POLICY "Users can update own messages"
    ON public.chat_messages FOR UPDATE
    USING (auth.uid() = user_id);

-- Los admins pueden actualizar cualquier mensaje
CREATE POLICY "Admins can update any message"
    ON public.chat_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
