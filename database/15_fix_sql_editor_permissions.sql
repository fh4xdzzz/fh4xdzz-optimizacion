-- =====================================================
-- Permitir cambios de roles desde SQL Editor (auth.uid() = NULL)
-- =====================================================
-- Este script actualiza la función prevent_role_change para permitir cambios
-- cuando auth.uid() es NULL (indicando SQL Editor con permisos de owner)

-- Actualizar función prevent_role_change para permitir SQL Editor
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Controlar search_path para evitar inyección de schema
    SET search_path = public;
    
    -- Verificar si el rol está siendo modificado
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        -- Permitir cambios si auth.uid() es NULL (SQL Editor con permisos de owner)
        -- Solo un admin o owner puede cambiar roles desde la API
        IF auth.uid() IS NOT NULL AND NOT EXISTS (
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

-- Reactivar el trigger con la nueva función
DROP TRIGGER IF EXISTS prevent_unauthorized_role_changes ON public.users;
CREATE TRIGGER prevent_unauthorized_role_changes
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION public.prevent_role_change();

-- Verificar los cambios
SELECT 
    'Función prevent_role_change actualizada para permitir SQL Editor' as status;
SELECT 
    'Trigger reactivado con nueva función' as status;