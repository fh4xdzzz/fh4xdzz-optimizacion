-- =====================================================
-- Script para cambiar el rol de un usuario (SOLO PARA OWNER)
-- =====================================================
-- Este script debe ser ejecutado manualmente en el SQL Editor de Supabase
-- usando el service role key para tener permisos de superusuario

-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → SQL Editor
-- 2. Asegúrate de estar usando el service role key (no el anon key)
-- 3. Reemplaza 'EMAIL_DEL_AMIGO' con el email de tu amigo
-- 4. Ejecuta el script

-- ============================================
-- CAMBIAR ESTO VALOR ↓
-- ============================================
SET @user_email = 'EMAIL_DEL_AMIGO';
SET @new_role = 'admin';
-- ============================================

-- Actualizar el rol del usuario
UPDATE public.users 
SET role = @new_role
WHERE email = @user_email;

-- Verificar el cambio
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.users 
WHERE email = @user_email;

-- Si la consulta anterior devuelve resultados, el cambio fue exitoso
-- Si no hay resultados, verifica que el email sea correcto