-- =====================================================
-- Tabla: tickets (Tickets de soporte Discord)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    discord_channel_id TEXT UNIQUE,
    discord_user_id TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'general',
        'service_request',
        'technical_issue',
        'billing',
        'other'
    )),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN (
        'open',
        'in_progress',
        'waiting_client',
        'resolved',
        'closed'
    )),
    priority TEXT DEFAULT 'normal' CHECK (priority IN (
        'low',
        'normal',
        'high',
        'urgent'
    )),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_discord_user_id ON public.tickets(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para generar número de ticket único
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    ticket_num TEXT;
    base_num TEXT;
    counter INTEGER;
BEGIN
    base_num := 'TKT' || TO_CHAR(NOW(), 'YYYYMMDD');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 8) AS INTEGER)), 0) + 1
    INTO counter
    FROM public.tickets
    WHERE ticket_number LIKE base_num || '%';
    
    ticket_num := base_num || LPAD(counter::TEXT, 4, '0');
    RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar número de ticket automáticamente
DROP TRIGGER IF EXISTS generate_ticket_number_trigger ON public.tickets;
CREATE TRIGGER generate_ticket_number_trigger
    BEFORE INSERT ON public.tickets
    FOR EACH ROW
    EXECUTE PROCEDURE generate_ticket_number();

-- =====================================================
-- Tabla: ticket_messages (Mensajes de tickets)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
    discord_message_id TEXT,
    discord_user_id TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    is_staff BOOLEAN DEFAULT false,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON public.ticket_messages(created_at);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes para evitar errores
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update any ticket" ON public.tickets;
DROP POLICY IF EXISTS "Staff can update tickets" ON public.tickets;

-- Los usuarios pueden ver sus propios tickets
CREATE POLICY "Users can view own tickets"
    ON public.tickets FOR SELECT
    USING (auth.uid() = user_id);

-- Los admins pueden ver todos los tickets
CREATE POLICY "Admins can view all tickets"
    ON public.tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Los staff pueden ver todos los tickets
CREATE POLICY "Staff can view all tickets"
    ON public.tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Los usuarios pueden crear tickets
CREATE POLICY "Users can create tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Los admins pueden actualizar cualquier ticket
CREATE POLICY "Admins can update any ticket"
    ON public.tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Los staff pueden actualizar tickets
CREATE POLICY "Staff can update tickets"
    ON public.tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes para evitar errores
DROP POLICY IF EXISTS "Users can view own ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Admins can view all ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Staff can view all ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Staff can create ticket messages" ON public.ticket_messages;

-- Los usuarios pueden ver mensajes de sus propios tickets
CREATE POLICY "Users can view own ticket messages"
    ON public.ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE id = ticket_id AND user_id = auth.uid()
        )
    );

-- Los admins pueden ver todos los mensajes
CREATE POLICY "Admins can view all ticket messages"
    ON public.ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Los staff pueden ver todos los mensajes
CREATE POLICY "Staff can view all ticket messages"
    ON public.ticket_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Solo staff puede crear mensajes en nombre del sistema
CREATE POLICY "Staff can create ticket messages"
    ON public.ticket_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );