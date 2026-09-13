import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Cargar variables de entorno
config({ path: '../.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridos')
  console.error('ℹ️  Asegúrate de que .env exista con las credenciales de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function auditPermissions() {
  console.log('🔍 Auditoría de Permisos de Funciones SECURITY DEFINER')
  console.log('='.repeat(60))

  try {
    // 1. Verificar permisos de ejecución de funciones
    console.log('\n1. Permisos de Ejecución de Funciones:')
    const { data: functionPerms, error: permsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            n.nspname AS schema,
            p.proname AS function_name,
            pg_get_function_arguments(p.oid) AS arguments,
            pg_get_userbyid(p.proowner) AS owner,
            p.prosecdef AS is_security_definer
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' 
          AND p.proname IN ('is_admin', 'is_staff_or_admin', 'has_role', 'prevent_role_change')
          ORDER BY p.proname
        `
      })

    if (permsError) {
      console.log('   ⚠️  Error al consultar permisos:', permsError.message)
      console.log('   ℹ️  Intentando consulta alternativa...')
    } else {
      console.log('   ✅ Permisos obtenidos:')
      console.table(functionPerms)
    }

    // 2. Consulta alternativa usando information_schema
    console.log('\n2. Permisos EXECUTE (information_schema):')
    const { data: routinePerms, error: routineError } = await supabase
      .from('routine_privileges')
      .select('*')
      .eq('routine_schema', 'public')
      .in('routine_name', ['is_admin', 'is_staff_or_admin', 'has_role', 'prevent_role_change'])

    if (routineError) {
      console.log('   ⚠️  Error:', routineError.message)
    } else {
      console.log('   ✅ Permisos de rutinas:')
      console.table(routinePerms)
    }

    // 3. Verificar definición de funciones
    console.log('\n3. Verificando definiciones de funciones:')
    const functions = ['is_admin', 'is_staff_or_admin', 'has_role', 'prevent_role_change']

    for (const funcName of functions) {
      try {
        const { data: funcData, error: funcError } = await supabase
          .rpc(funcName)

        if (funcError) {
          console.log(`   ⚠️  ${funcName}: Error de ejecución esperado (requiere auth)`)
        } else {
          console.log(`   ℹ️  ${funcName}: Retornó ${funcData}`)
        }
      } catch {
        console.log(`   ℹ️  ${funcName}: Error esperado sin auth`)
      }
    }

    // 4. Verificar si functions existen
    console.log('\n4. Verificando existencia de funciones:')
    const { data: pgFunctions, error: pgError } = await supabase
      .from('pg_proc')
      .select('proname, prosecdef')
      .eq('pronamespace', 'public') // This won't work directly, need to use pg_catalog
      .in('proname', functions)

    if (pgError) {
      console.log('   ℹ️  Consulta pg_proc no disponible via API')
    } else {
      console.log('   ℹ️  Funciones encontradas:', pgFunctions?.length || 0)
    }

    console.log('\n✅ Auditoría de permisos completada')
    console.log('\n⚠️  NOTA: Para ver los permisos exactos en PostgreSQL,')
    console.log('   ejecuta el script database/08_audit_permissions.sql')
    console.log('   directamente en el SQL Editor de Supabase.')

  } catch (error) {
    console.error('❌ Error en auditoría:', error)
  }
}

auditPermissions()
