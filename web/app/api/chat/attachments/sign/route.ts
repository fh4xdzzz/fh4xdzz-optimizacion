import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth-server'

// POST /api/chat/attachments/sign - Firmar URL para upload de archivo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { session_id, file_name, content_type, file_size } = body

    if (!session_id || !file_name || !content_type || !file_size) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'text/plain',
      'application/json',
      'application/zip'
    ]

    if (!allowedTypes.includes(content_type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file_size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds limit' }, { status: 400 })
    }

    const supabase = await createClient()

    // Generar ruta única para el archivo
    const fileExtension = file_name.split('.').pop()
    const uniqueFileName = `${session_id}/${Date.now()}.${fileExtension}`
    const path = uniqueFileName

    // Crear signed URL para upload
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('chat-attachments')
      .createSignedUploadUrl(path, {
        upsert: false
      })

    if (signedUrlError) {
      console.error('Error creating signed upload URL:', signedUrlError)
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
    }

    return NextResponse.json({
      path,
      signedUrl: signedUrlData.signedUrl,
      token: signedUrlData.token
    })
  } catch (error) {
    console.error('Error in POST /api/chat/attachments/sign:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
