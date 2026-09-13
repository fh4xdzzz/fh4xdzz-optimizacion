-- =====================================================
-- Agregar rol 'owner' al sistema
-- =====================================================

-- 1. Modificar el CHECK constraint para incluir 'owner'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('client', 'admin', 'staff', 'owner'));

-- 2. Actualizar RLS policies para incluir owner

-- Actualizar policy de "Admins can view all profiles" para incluir owner
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Actualizar policy de "Admins can update any profile" para incluir owner
DROP POLICY IF EXISTS "Admins can update any profile" ON public.users;
CREATE POLICY "Admins can update any profile"
    ON public.users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- 3. Actualizar función de seguridad para incluir owner
-- (En database/07_security_functions.sql)

-- 4. Asignar rol owner al usuario principal
-- REEMPLAZA 'tu_email_aqui' con tu email real
UPDATE public.users
SET role = 'owner'
WHERE email = 'tu_email_aqui';  -- CAMBIAR ESTO POR TU EMAIL REAL
