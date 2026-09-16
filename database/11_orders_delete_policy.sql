-- =====================================================
-- Política RLS para permitir que el owner elimine pedidos
-- =====================================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS "Owner can delete orders" ON public.orders;

-- Crear política para permitir que solo el owner elimine pedidos
CREATE POLICY "Owner can delete orders"
    ON public.orders FOR DELETE
    USING (
        public.get_user_role(auth.uid()) = 'owner'
    );

-- Eliminar política existente para order_events si existe
DROP POLICY IF EXISTS "Owner can delete order events" ON public.order_events;

-- Crear política para permitir que el owner elimine eventos de pedidos
CREATE POLICY "Owner can delete order events"
    ON public.order_events FOR DELETE
    USING (
        public.get_user_role(auth.uid()) = 'owner'
    );

-- Nota: Esta política se ejecuta en conjunto con la verificación
-- en el código del frontend (lib/supabase/orders.ts) para
-- asegurar la seguridad en múltiples capas.
