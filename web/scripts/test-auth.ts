#!/usr/bin/env tsx
/**
 * Script de prueba de autenticación Supabase
 * Ejecutar: npx tsx scripts/test-auth.ts
 * 
 * NOTA: Este script requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
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

async function testAuth() {
  console.log('🔐 Pruebas de Autenticación Supabase\n')

  // Test 1: Verificar estado actual
  console.log('📊 Test 1: Estado actual de autenticación')
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError) {
    console.log('❌ Error al obtener sesión:', sessionError.message)
  } else if (session) {
    console.log('✅ Sesión activa encontrada')
    console.log(`👤 Email: ${session.user.email}`)
    console.log(`🆔 ID: ${session.user.id}`)
  } else {
    console.log('ℹ️  No hay sesión activa (esperado)')
  }

  // Test 2: Verificar si podemos crear usuario (solo indicativo)
  console.log('\n📊 Test 2: Verificar API de auth')
  console.log('ℹ️  Prueba de registro y login requieren interacción manual')
  console.log('💡 Para probar auth real, usa la web en /auth/register y /auth/login')

  // Test 3: Verificar conexión a tabla users
  console.log('\n📊 Test 3: Verificar tabla users')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role')
    .limit(5)
  
  if (usersError) {
    console.log('❌ Error al acceder a tabla users:', usersError.message)
    if (usersError.code === '42P01') {
      console.log('💡 Tabla users no existe. Ejecuta database/01_users.sql')
    }
  } else {
    console.log('✅ Tabla users accesible')
    console.log(`📊 ${users.length} usuarios encontrados`)
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`)
    })
  }

  console.log('\n✅ Pruebas de autenticación completadas')
  console.log('💡 Para pruebas completas, usa la interfaz web:')
  console.log('   - /auth/register (registro)')
  console.log('   - /auth/login (login)')
  console.log('   - /auth/forgot-password (recuperación)')
}

testAuth().catch(console.error)
