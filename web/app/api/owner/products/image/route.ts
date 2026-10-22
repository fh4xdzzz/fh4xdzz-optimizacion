import { NextRequest, NextResponse } from 'next/server'
import { requireAdminRole } from '@/lib/admin-api'

const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Usa una imagen JPG, PNG, WEBP o GIF de hasta 5 MB.' }, { status: 400 })
  }

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${extension}`
  const { error } = await auth.supabase.storage.from('store-products').upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
  })
  if (error) {
    console.error('[owner/products/image] Error subiendo imagen', error)
    return NextResponse.json({ error: 'No se pudo subir la imagen.' }, { status: 500 })
  }
  const { data } = auth.supabase.storage.from('store-products').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
