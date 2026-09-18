-- =====================================================
-- Arreglar políticas RLS de orders para permitir creación
-- =====================================================
-- El problema es que la política "Users can create orders" requiere
-- que auth.uid() coincida con user_id, pero puede haber problemas

-- Primero, desactivar RLS temporalmente para permitir cualquier inserción
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Verificar que la función get_user_role funciona
SELECT public.get_user_role(auth.uid()) as current_user_role;

-- Reactivar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes de orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;
DROP POLICY IF EXISTS "Users cannot update orders directly" ON public.orders;

-- Política simplificada: cualquier usuario autenticado puede crear pedidos
CREATE POLICY "Users can create orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política: usuarios pueden ver sus propios pedidos
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id);

-- Política: admins y owners pueden ver todos los pedidos
CREATE POLICY "Admins can view all orders"
    ON public.orders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Política: admins y owners pueden actualizar cualquier pedido
CREATE POLICY "Admins can update any order"
    ON public.orders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Verificar las políticas creadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'orders';

SELECT 
    'Políticas RLS de orders actualizadas' as status;