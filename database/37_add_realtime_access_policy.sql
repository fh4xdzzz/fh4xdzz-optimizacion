-- =====================================================
-- Agregar política para permitir acceso Realtime a la tabla users
-- =====================================================

-- Crear política para permitir que usuarios autenticados puedan leer la tabla users
-- Esto es necesario para que Realtime funcione correctamente
CREATE POLICY "Allow authenticated users to read users for realtime"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Verificar la política creada
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'users'
AND policyname = 'Allow authenticated users to read users for realtime';
