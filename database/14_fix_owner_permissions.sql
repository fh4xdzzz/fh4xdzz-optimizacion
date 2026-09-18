-- =====================================================
-- Actualizar funciones de seguridad para incluir rol 'owner'
-- =====================================================
-- Este script permite que los usuarios con rol 'owner' también puedan cambiar roles
-- sin restricciones

-- Actualizar función prevent_role_change para incluir 'owner'
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Controlar search_path para evitar inyección de schema
    SET search_path = public;
    
    -- Verificar si el rol está siendo modificado
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Solo un admin o owner puede cambiar roles
        IF NOT EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        ) THEN
            RAISE EXCEPTION 'No tienes permiso para cambiar roles. Solo admins y owners pueden modificar roles.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Actualizar función is_admin para incluir 'owner'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Controlar search_path para evitar inyección de schema
    SET search_path = public;
    
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Reactivar el trigger con la nueva función
DROP TRIGGER IF EXISTS prevent_unauthorized_role_changes ON public.users;
CREATE TRIGGER prevent_unauthorized_role_changes
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION public.prevent_role_change();

-- Actualizar policies para usar la función is_admin actualizada
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles"
    ON public.users FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;
CREATE POLICY "Admins can update any profile"
    ON public.users FOR UPDATE
    USING (public.is_admin());

-- Verificar los cambios
SELECT 
    'Función prevent_role_change actualizada para incluir owner' as status;
SELECT 
    'Función is_admin actualizada para incluir owner' as status;
SELECT 
    'Trigger reactivado con nueva función' as status;