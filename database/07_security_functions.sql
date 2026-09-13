-- =====================================================
-- Funciones de Seguridad para Validación de Roles
-- =====================================================

-- Función segura para verificar si el usuario actual es admin
-- Esta función usa SECURITY DEFINER para ejecutar con permisos elevados
-- pero solo verifica roles, no permite modificación de datos
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función segura para verificar si el usuario actual es staff o admin
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('staff', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario específico tiene un rol específico
-- Solo admins pueden usar esta función
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, target_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar que el usuario actual es admin
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar el rol del usuario objetivo
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = user_id AND role = target_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function para prevenir modificación de roles desde el frontend
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si el rol está siendo modificado
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Solo un admin puede cambiar roles
        IF NOT EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'No tienes permiso para cambiar roles. Solo admins pueden modificar roles.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Actualizar RLS Policies de Users con funciones seguras
-- =====================================================

-- Crear trigger para prevenir cambios de roles no autorizados
DROP TRIGGER IF EXISTS prevent_unauthorized_role_changes ON public.users;
CREATE TRIGGER prevent_unauthorized_role_changes
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION public.prevent_role_change();

-- Eliminar policies existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;

-- Política mejorada: usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Política mejorada: admins pueden ver todos los perfiles (usando función segura)
CREATE POLICY "Admins can view all profiles"
    ON public.users FOR SELECT
    USING (public.is_admin());

-- Política mejorada: usuarios pueden actualizar su propio perfil
-- PERO NO pueden cambiar su propio rol
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        -- Prevenir cambio de rol propio
        (OLD.role = NEW.role)
    );

-- Política mejorada: admins pueden actualizar cualquier perfil
CREATE POLICY "Admins can update any profile"
    ON public.users FOR UPDATE
    USING (public.is_admin());

-- Política para que usuarios no puedan insertar manualmente en la tabla
-- (solo el trigger de auth.users debería hacerlo)
CREATE POLICY "No direct inserts allowed"
    ON public.users FOR INSERT
    WITH CHECK (false);

-- Política para que usuarios no puedan eliminar directamente
CREATE POLICY "No direct deletes allowed"
    ON public.users FOR DELETE
    WITH CHECK (false);

-- =====================================================
-- Correcciones de Seguridad para Orders
-- =====================================================

-- Eliminar política peligrosa que permite a usuarios actualizar sus propios pedidos
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

-- Política mejorada: usuarios NO pueden actualizar pedidos
-- Solo admins pueden actualizar pedidos para mantener integridad
-- Los usuarios pueden cancelar o añadir notas mediante funciones específicas
CREATE POLICY "Users cannot update orders directly"
    ON public.orders FOR UPDATE
    USING (false);

-- =====================================================
-- Notas de Seguridad
-- =====================================================
-- 1. Las funciones usan SECURITY DEFINER para ejecutar con permisos elevados
-- 2. Solo verifican datos, no permiten modificación no autorizada
-- 3. El trigger prevent_role_change() bloquea cambios de roles no autorizados
-- 4. Las policies de UPDATE limitan que los usuarios no puedan cambiar su propio rol
-- 5. No hay policies de INSERT/DELETE públicas para prevenir manipulación directa
-- 6. Los usuarios NO pueden actualizar pedidos directamente - solo admins
-- 7. Esto previene que usuarios cambien precios, status o asignaciones