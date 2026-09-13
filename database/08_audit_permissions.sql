-- =====================================================
-- Auditoría de Permisos de Funciones SECURITY DEFINER
-- Fase 5.4.2 - Auditoría Final
-- =====================================================

-- 1. Verificar permisos de ejecución de funciones
SELECT 
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_userbyid(p.proowner) AS owner,
    p.prosecdef AS is_security_definer,
    array_to_string(array(
        SELECT pg_get_userbyid(grantee::oid) 
        FROM pg_proc p2 
        JOIN pg_namespace n2 ON p2.pronamespace = n2.oid
        JOIN pg_depend d ON d.refobjid = p2.oid
        JOIN pg_shdepend sd ON sd.refobjid = p2.oid
        JOIN pg_authid a ON a.oid = sd.roleid
        WHERE p2.oid = p.oid
    ), ', ') AS grantees
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('is_admin', 'is_staff_or_admin', 'has_role', 'prevent_role_change')
ORDER BY p.proname;

-- 2. Verificar permisos EXECUTE específicos
SELECT 
    grantee,
    schemaname,
    proname,
    CASE 
        WHEN grantee = 'PUBLIC' THEN 'PUBLIC (todos los roles)'
        ELSE grantee
    END AS grantee_display,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name IN ('is_admin', 'is_staff_or_admin', 'has_role', 'prevent_role_change')
ORDER BY routine_name, grantee;

-- 3. Verificar roles disponibles
SELECT 
    rolname,
    rolsuper,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolreplication,
    rolbypassrls,
    rolconnlimit,
    rolpassword IS NOT NULL AS has_password
FROM pg_roles
WHERE rolname IN ('anon', 'authenticated', 'postgres', 'service_role')
ORDER BY rolname;

-- 4. Verificar definición de funciones con search_path
SELECT 
    n.nspname AS schema,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('is_admin', 'is_staff_or_admin', 'has_role', 'prevent_role_change')
ORDER BY p.proname;

-- 5. Verificar que las funciones usan referencias calificadas
SELECT 
    proname,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN ('is_admin', 'is_staff_or_admin', 'has_role', 'prevent_role_change')
AND pg_get_functiondef(p.oid) NOT LIKE '%public.%'
ORDER BY proname;

-- Este query debería estar vacío si todas las referencias están calificadas
