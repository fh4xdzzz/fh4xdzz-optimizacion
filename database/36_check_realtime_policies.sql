-- =====================================================
-- Verificar políticas RLS para Realtime en la tabla users
-- =====================================================

-- Verificar políticas RLS existentes en la tabla users
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
WHERE tablename = 'users'
ORDER BY policyname;

-- Verificar si la tabla users tiene RLS habilitado
SELECT 
  relname AS table_name,
  relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'users'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Si RLS está habilitado, necesitamos una política para permitir Realtime
-- Ejecutar esto si es necesario:
-- CREATE POLICY "Allow realtime access to users"
-- ON public.users
-- FOR SELECT
-- TO authenticated, anon
-- USING (true);
