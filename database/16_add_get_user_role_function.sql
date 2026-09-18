-- =====================================================
-- Función get_user_role para RLS Policies
-- =====================================================
-- Esta función obtiene el rol de un usuario por su ID
-- Se usa en las políticas RLS de orders y order_events

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Controlar search_path para evitar inyección de schema
    SET search_path = public;
    
    -- Obtener el rol del usuario
    SELECT role INTO user_role
    FROM public.users
    WHERE id = user_id;
    
    -- Si no se encuentra el usuario, retornar null
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Verificar que la función se creó correctamente
SELECT 
    'Función get_user_role creada exitosamente' as status;