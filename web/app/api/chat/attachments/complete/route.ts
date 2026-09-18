import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// POST /api/chat/attachments/complete - Completar upload de archivo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { session_id, path, file_name, content_type, file_size } = body

    if (!session_id || !path || !file_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Registrar el archivo en la base de datos
    const { data: attachment, error } = await supabase
      .from('chat_attachments')
      .insert({
        session_id,
        file_name,
        file_path: path,
        file_size,
        content_type,
        uploaded_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error completing attachment upload:', error)
      return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 })
    }

    return NextResponse.json({ attachment })
  } catch (error) {
    console.error('Error in POST /api/chat/attachments/complete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
