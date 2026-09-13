#!/usr/bin/env tsx
/**
 * Script de prueba de seguridad RLS (Row Level Security)
 * Ejecutar: npx tsx scripts/test-rls.ts
 * 
 * NOTA: Este script requiere:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - Scripts SQL ejecutados en Supabase
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

// Cargar variables de entorno desde el directorio raíz
import { config } from 'dotenv'
config({ path: path.resolve(__dirname, '../../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Variables de entorno no configuradas')
  console.log('💡 Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRLS() {
  console.log('🔒 Pruebas de Seguridad RLS\n')

  // Test 1: Verificar que RLS está habilitado
  console.log('📊 Test 1: Verificar estado de RLS')
  const { error: rlsError } = await supabase
    .rpc('check_rls_enabled', { table_name: 'users' })
  
  if (rlsError) {
    console.log('ℹ️  No se puede verificar RLS directamente con anon key')
    console.log('💡 Verifica RLS en la consola de Supabase: Database → Tables → users → RLS')
  } else {
    console.log('✅ RLS check completado')
  }

  // Test 2: Verificar acceso sin autenticación
  console.log('\n📊 Test 2: Acceso sin autenticación')
  const { error: anonError } = await supabase
    .from('users')
    .select('*')
  
  if (anonError) {
    console.log('✅ Acceso denegado correctamente (sin autenticación)')
    console.log(`   Error: ${anonError.message}`)
  } else {
    console.log('⚠️  Acceso permitido sin autenticación (puede indicar RLS no habilitado)')
  }

  // Test 3: Verificar tablas existentes
  console.log('\n📊 Test 3: Verificar tablas con RLS')
  const tables = ['users', 'services', 'orders', 'tickets', 'testimonials', 'business_settings']
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('count')
      .limit(1)
    
    if (error) {
      console.log(`❌ ${table}: Error - ${error.message}`)
    } else {
      console.log(`✅ ${table}: Accesible`)
    }
  }

  // Test 4: Verificar policies de services (debería ser público)
  console.log('\n📊 Test 4: Tabla services (debería ser pública)')
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, is_active')
    .eq('is_active', true)
    .limit(5)
  
  if (servicesError) {
    console.log('❌ Error al acceder a services:', servicesError.message)
  } else {
    console.log('✅ Services accesible (esperado para usuarios no autenticados)')
    console.log(`📊 ${services.length} servicios activos encontrados`)
  }

  console.log('\n📝 Recomendaciones:')
  console.log('1. Verifica que RLS esté habilitado en cada tabla en Supabase')
  console.log('2. Verifica que las policies estén creadas correctamente')
  console.log('3. Para pruebas de RLS reales, necesitas autenticarte primero')
  console.log('4. Usa la web para probar auth y luego verificar RLS')

  console.log('\n✅ Pruebas de RLS completadas')
}

testRLS().catch(console.error)