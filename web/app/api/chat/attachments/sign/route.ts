import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convertir archivo a base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Subir a Supabase Storage
    const fileName = `${Date.now()}-${file.name}`
    const { data, error } = await supabase
      .storage
      .from('chat-attachments')
      .upload(fileName, base64, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Error uploading to Supabase Storage:', error)
      return NextResponse.json({ error: 'Error uploading file' }, { status: 500 })
    }

    const path = data.path

    return NextResponse.json({
      path,
      file_name: file.name,
      content_type: file.type,
      file_size: file.size,
    })
  } catch (error) {
    console.error('Error in attachments sign endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
