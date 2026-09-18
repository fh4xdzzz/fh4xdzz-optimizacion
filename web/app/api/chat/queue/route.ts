import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET /api/chat/queue - Obtener agentes de soporte en línea (público)
export async function GET(request: NextRequest) {
  try {
    // Obtener usuarios con rol admin, staff o owner que están online
    const { data: agents, error } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, discord_avatar, online, accepting_chats')
      .in('role', ['admin', 'staff', 'owner'])
      .eq('online', true)
      .eq('accepting_chats', true)

    if (error) {
      console.error('Error fetching online agents:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    // Mapear los datos para incluir URLs de avatar de Discord
    const mappedAgents = agents?.map(agent => ({
      id: agent.id,
      full_name: agent.full_name,
      avatar_url: agent.avatar_url || (agent.discord_avatar ? 
        `https://cdn.discordapp.com/avatars/${agent.id}/${agent.discord_avatar}.png` : 
        `https://cdn.discordapp.com/embed/avatars/${agent.id.slice(0, 1)}.png`
      ),
      online: agent.online,
      accepting_chats: agent.accepting_chats,
    })) || []

    return NextResponse.json({ agents: mappedAgents })
  } catch (error) {
    console.error('Error in GET /api/chat/queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
