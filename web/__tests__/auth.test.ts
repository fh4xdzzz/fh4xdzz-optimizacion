import { describe, it, expect } from 'vitest'
import { config } from 'dotenv'

// Cargar variables de entorno
config({ path: '.env.local' })

describe('Auth Configuration Tests', () => {
  it('should have auth mode configured', () => {
    expect(process.env.NEXT_PUBLIC_AUTH_MODE).toBeDefined()
  })

  it('should be in supabase mode for production', () => {
    expect(process.env.NEXT_PUBLIC_AUTH_MODE).toBe('supabase')
  })

  it('should have Supabase URL configured', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).not.toBe('your_supabase_project_url')
  })

  it('should have Supabase anon key configured', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).not.toBe('your_supabase_anon_key')
  })

  it('should have valid Supabase URL format', () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(url).toMatch(/^https:\/\/.*\.supabase\.co$/)
  })
})
