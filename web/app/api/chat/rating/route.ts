import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// POST /api/chat/rating - Calificar el soporte
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== 'client') {
      return NextResponse.json({ error: 'Forbidden - Only clients can rate' }, { status: 403 })
    }

    const body = await request.json()
    const { session_id, rating, comment } = body

    if (!session_id || !rating) {
      return NextResponse.json({ error: 'Session ID and rating are required' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verificar que la sesión pertenece al cliente
    const { data: chatSession } = await supabase
      .from('chat_sessions')
      .select('client_id, assigned_agent_id')
      .eq('id', session_id)
      .single()

    if (!chatSession || chatSession.client_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Crear calificación
    const { data: ratingData, error } = await supabase
      .from('chat_ratings')
      .insert({
        session_id,
        client_id: session.user.id,
        agent_id: chatSession.assigned_agent_id,
        rating,
        comment
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating rating:', error)
      return NextResponse.json({ error: 'Failed to create rating' }, { status: 500 })
    }

    return NextResponse.json({ rating: ratingData })
  } catch (error) {
    console.error('Error in POST /api/chat/rating:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
