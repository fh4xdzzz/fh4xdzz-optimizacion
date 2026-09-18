import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// GET /api/support/metrics - Obtener métricas del panel de soporte
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

    const supabase = await createClient()

    // Contar chats por estado
    const { data: statusCounts } = await supabase
      .from('chat_sessions')
      .select('status')
      .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())

    const statusCountsMap = {
      waiting: 0,
      active: 0,
      pending: 0,
      closed: 0
    }

    statusCounts?.forEach((s: any) => {
      statusCountsMap[s.status as keyof typeof statusCountsMap]++
    })

    // Calcular tiempo promedio de primera respuesta
    const { data: sessionsWithResponse } = await supabase
      .from('chat_sessions')
      .select('first_response_at, created_at')
      .not('first_response_at', 'is', null)
      .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())

    let avgFirstResponse = 0
    if (sessionsWithResponse && sessionsWithResponse.length > 0) {
      const totalResponseTime = sessionsWithResponse.reduce((sum: number, s: any) => {
        const responseTime = new Date(s.first_response_at).getTime() - new Date(s.created_at).getTime()
        return sum + responseTime
      }, 0)
      avgFirstResponse = totalResponseTime / sessionsWithResponse.length / 1000 // Convertir a segundos
    }

    // Calcular tiempo promedio de resolución
    const { data: sessionsWithResolution } = await supabase
      .from('chat_sessions')
      .select('resolution_time_seconds')
      .not('resolution_time_seconds', 'is', null)
      .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())

    let avgResolution = 0
    if (sessionsWithResolution && sessionsWithResolution.length > 0) {
      const totalResolutionTime = sessionsWithResolution.reduce((sum: number, s: any) => sum + s.resolution_time_seconds, 0)
      avgResolution = totalResolutionTime / sessionsWithResolution.length
    }

    // Calcular satisfacción promedio
    const { data: ratings } = await supabase
      .from('chat_ratings')
      .select('rating')
      .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())

    let avgRating = 0
    if (ratings && ratings.length > 0) {
      const totalRating = ratings.reduce((sum: number, r: any) => sum + r.rating, 0)
      avgRating = totalRating / ratings.length
    }

    // Contar agentes online
    const { count: onlineAgents } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_support_agent', true)
      .eq('online', true)

    return NextResponse.json({
      status_counts: statusCountsMap,
      avg_first_response_seconds: Math.round(avgFirstResponse),
      avg_resolution_seconds: Math.round(avgResolution),
      avg_rating: Math.round(avgRating * 10) / 10,
      online_agents: onlineAgents || 0,
      total_sessions_last_30_days: statusCounts?.length || 0
    })
  } catch (error) {
    console.error('Error in GET /api/support/metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
