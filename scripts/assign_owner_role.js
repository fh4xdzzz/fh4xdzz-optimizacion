// Tu service_role JWT token
const supabaseUrl = 'https://wbkgesmnyjnomctdvxqb.supabase.co'
const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6India2dlc21ueWpub21jdGR2eHFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI5MTM4NiwiZXhwIjoyMTA0ODY3Mzg2fQ.MHMRWY3St0jWfbWux22RGM9CUwmzT6eqcft_p5rj2TQ'

async function assignOwnerRole() {
  try {
    // Ejecutar SQL directo usando REST API con JWT token
    const headers = {
      'apikey': jwtToken,
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }

    // PASO 1: Desactivar trigger
    console.log('PASO 1: Desactivando trigger...')
    const dropTrigger = await fetch(`${supabaseUrl}/rest/v1/rpc/drop_trigger`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        trigger_name: 'prevent_role_change',
        table_name: 'users'
      })
    })
    console.log('Trigger response:', dropTrigger.status)

    // PASO 2: Asignar rol owner directamente
    console.log('PASO 2: Asignando rol owner...')
    const updateRole = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.thedulcanzzz@gmail.com`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role: 'owner' })
    })
    
    if (updateRole.ok) {
      const data = await updateRole.json()
      console.log('✅ Rol owner asignado exitosamente:', data)
    } else {
      const error = await updateRole.text()
      console.error('Error asignando rol:', error)
    }

    // PASO 3: Reactivar trigger
    console.log('PASO 3: Reactivando trigger...')
    const createTrigger = await fetch(`${supabaseUrl}/rest/v1/rpc/create_trigger`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        trigger_name: 'prevent_role_change',
        table_name: 'users',
        function_name: 'prevent_role_change',
        trigger_timing: 'BEFORE',
        trigger_events: ['UPDATE OF role']
      })
    })
    console.log('Trigger recreation response:', createTrigger.status)

    console.log('✅ Script completado')

  } catch (error) {
    console.error('Error:', error)
  }
}

assignOwnerRole()
