#!/usr/bin/env tsx
/**
 * Script de prueba de conexión a Supabase
 * Ejecutar: npx tsx scripts/test-connection.ts
 */

import { createClient } from '@supabase/supabase-js'

// Verificar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Verificando configuración de Supabase...\n')

if (!supabaseUrl) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_URL no está configurado')
  console.log('💡 Configura la variable en tu archivo .env')
  process.exit(1)
}

if (!supabaseAnonKey) {
  console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurado')
  console.log('💡 Configura la variable en tu archivo .env')
  process.exit(1)
}

console.log('✅ Variables de entorno encontradas')
console.log(`📡 URL: ${supabaseUrl}`)
console.log(`🔑 Anon Key: configurado\n`)

// Crear cliente Supabase
console.log('🔌 Creando cliente Supabase...')
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Intentar conectar
console.log('🚀 Intentando conectar a Supabase...')

async function testConnection() {
  try {
    // Test simple: obtener estado del servidor
    const { error } = await supabase.from('users').select('count').limit(1)

    if (error) {
      console.log('❌ Error de conexión:', error.message)
      
      if (error.code === '42P01') {
        console.log('💡 La tabla "users" no existe. Debes ejecutar los scripts SQL primero.')
        console.log('📝 Ver docs/SUPABASE_SETUP.md para instrucciones')
      }
      
      return false
    }

    console.log('✅ Conexión exitosa a Supabase')
    console.log('📊 Database accesible\n')
    
    // Test de autenticación
    console.log('🔐 Verificando estado de autenticación...')
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      console.log('✅ Sesión activa encontrada')
      console.log(`👤 Usuario: ${session.user.email}`)
    } else {
      console.log('ℹ️  No hay sesión activa (esto es normal)')
    }
    
    console.log('\n✅ Validación completada exitosamente')
    return true
    
  } catch (error: unknown) {
    console.log('❌ Error inesperado:', (error as Error).message)
    return false
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1)
})