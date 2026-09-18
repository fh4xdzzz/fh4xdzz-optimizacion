import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// GET /api/chat/notes?client_id=xxx - Obtener notas internas de un cliente
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== 'staff' && userRole !== 'admin' && userRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: notes, error } = await supabase
      .from('internal_notes')
      .select(`
        *,
        creator:created_by(id, full_name, avatar_url)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notes:', error)
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error in GET /api/chat/notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat/notes - Crear nota interna
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== 'staff' && userRole !== 'admin' && userRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { client_id, session_id, note } = body

    if (!client_id || !note) {
      return NextResponse.json({ error: 'Client ID and note are required' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: newNote, error } = await supabase
      .from('internal_notes')
      .insert({
        client_id,
        session_id,
        note,
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    return NextResponse.json({ note: newNote })
  } catch (error) {
    console.error('Error in POST /api/chat/notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
