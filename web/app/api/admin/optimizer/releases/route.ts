import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminRole } from '@/lib/admin-api'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/

export async function GET() {
  const auth = await requireAdminRole()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { data, error } = await auth.supabase.from('optimizer_releases').select('id, version, file_name, file_size, sha256, release_notes, is_active, created_at').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'No se pudieron cargar las versiones.' }, { status: 500 })
  return NextResponse.json({ releases: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(true)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const form = await request.formData()
  const file = form.get('file')
  const version = String(form.get('version') || '').trim()
  const notes = String(form.get('notes') || '').trim().slice(0, 2000)
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.exe')) return NextResponse.json({ error: 'Selecciona el instalador .exe.' }, { status: 400 })
  if (!file.size || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'El instalador debe pesar 25 MB o menos.' }, { status: 400 })
  if (!VERSION_PATTERN.test(version)) return NextResponse.json({ error: 'Usa una versión como 1.1.0.' }, { status: 400 })

  const { data: duplicate } = await auth.supabase.from('optimizer_releases').select('id').eq('version', version).maybeSingle()
  if (duplicate) return NextResponse.json({ error: 'Esa versión ya existe.' }, { status: 409 })

  const { data: previousRelease } = await auth.supabase.from('optimizer_releases').select('id').eq('is_active', true).maybeSingle()

  const bytes = Buffer.from(await file.arrayBuffer())
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const fileName = `DulcanOptimizer-Setup-${version}.exe`
  const filePath = `${version}/${crypto.randomUUID()}-${fileName}`
  const { error: uploadError } = await auth.supabase.storage.from('optimizer-releases').upload(filePath, bytes, { contentType: 'application/octet-stream', upsert: false })
  if (uploadError) return NextResponse.json({ error: 'No se pudo guardar el instalador.' }, { status: 500 })

  await auth.supabase.from('optimizer_releases').update({ is_active: false }).eq('is_active', true)
  const { data, error } = await auth.supabase.from('optimizer_releases').insert({
    version,
    file_name: fileName,
    file_path: filePath,
    file_size: file.size,
    sha256,
    release_notes: notes || null,
    is_active: true,
    uploaded_by: auth.session.user.id,
  }).select('id, version, file_name, file_size, sha256, release_notes, is_active, created_at').single()
  if (error || !data) {
    await auth.supabase.storage.from('optimizer-releases').remove([filePath])
    if (previousRelease?.id) await auth.supabase.from('optimizer_releases').update({ is_active: true }).eq('id', previousRelease.id)
    return NextResponse.json({ error: error?.code === '23505' ? 'Esa versión ya existe.' : 'No se pudo registrar la versión.' }, { status: 409 })
  }
  return NextResponse.json({ release: data }, { status: 201 })
}
