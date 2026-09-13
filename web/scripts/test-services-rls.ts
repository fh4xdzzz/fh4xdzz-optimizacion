import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Cargar variables de entorno
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testServicesRLS() {
  console.log('🔍 Diagnosticando políticas RLS de tabla services...\n')

  try {
    // Test 1: Intentar obtener todos los servicios
    console.log('Test 1: Intentar obtener todos los servicios (como admin simulado)')
    const { data: allServices, error: allError } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true })

    if (allError) {
      console.error('❌ Error:', allError.message)
      console.error('Detalles:', allError)
    } else {
      console.log(`✅ Success: ${allServices?.length || 0} servicios encontrados`)
      if (allServices && allServices.length > 0) {
        console.log('   Servicios:', allServices.map(s => s.name))
      }
    }

    // Test 2: Intentar obtener solo servicios activos
    console.log('\nTest 2: Intentar obtener solo servicios activos')
    const { data: activeServices, error: activeError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (activeError) {
      console.error('❌ Error:', activeError.message)
    } else {
      console.log(`✅ Success: ${activeServices?.length || 0} servicios activos encontrados`)
    }

    // Test 3: Verificar política RLS de services
    console.log('\nTest 3: Verificar políticas RLS de services')
    const { data: policies, error: policiesError } = await supabase
      .rpc('check_policies', { table_name: 'services' })

    if (policiesError) {
      console.error('❌ Error al verificar políticas:', policiesError.message)
    } else {
      console.log('✅ Políticas:', policies)
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

testServicesRLS()
