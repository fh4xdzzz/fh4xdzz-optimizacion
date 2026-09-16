// Funciones para el modo de mantenimiento

export interface MaintenanceSettings {
  enabled: boolean
  message: string
  updated_at: string
}

// Verificar si el modo mantenimiento está activo
export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const { createClient } = await import('./supabase/client')
    const supabase = createClient()

    const { data, error } = await supabase
      .from('business_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single()

    if (error) {
      console.error('Error checking maintenance mode:', error)
      return false
    }

    if (!data) {
      return false
    }

    const settings = data.value as MaintenanceSettings
    return settings.enabled || false
  } catch (error) {
    console.error('Error checking maintenance mode:', error)
    return false
  }
}

// Obtener configuración de mantenimiento
export async function getMaintenanceSettings(): Promise<MaintenanceSettings | null> {
  try {
    const { createClient } = await import('./supabase/client')
    const supabase = createClient()

    const { data, error } = await supabase
      .from('business_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single()

    if (error) {
      console.error('Error getting maintenance settings:', error)
      return null
    }

    if (!data) {
      return {
        enabled: false,
        message: 'Sitio en mantenimiento. Vuelve pronto.',
        updated_at: new Date().toISOString()
      }
    }

    return data.value as MaintenanceSettings
  } catch (error) {
    console.error('Error getting maintenance settings:', error)
    return null
  }
}

// Actualizar configuración de mantenimiento (solo owner)
export async function updateMaintenanceSettings(
  enabled: boolean,
  message: string,
  userRole: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (userRole !== 'owner') {
      return { success: false, error: 'Solo el owner puede cambiar el modo mantenimiento' }
    }

    const { createClient } = await import('./supabase/client')
    const supabase = createClient()

    const settings: MaintenanceSettings = {
      enabled,
      message,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('business_settings')
      .upsert({
        key: 'maintenance_mode',
        value: settings,
        description: 'Configuración del modo de mantenimiento'
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating maintenance settings:', error)
    return { success: false, error: 'Error al actualizar configuración de mantenimiento' }
  }
}
