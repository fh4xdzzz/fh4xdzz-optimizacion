import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RETENTION_HOURS = 24
const CLEANUP_BATCH_SIZE = 500
const STORAGE_BATCH_SIZE = 100

type SessionRow = { id: string }
type AttachmentRow = { file_path: string | null }
type MessageAttachmentRow = { attachment_path: string | null }

function createCleanupClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type CleanupClient = ReturnType<typeof createCleanupClient>

async function removeStorageFiles(
  supabase: CleanupClient,
  sessionIds: string[]
) {
  const [{ data: attachments, error: attachmentsError }, { data: messages, error: messagesError }] =
    await Promise.all([
      supabase.from('chat_attachments').select('file_path').in('session_id', sessionIds),
      supabase
        .from('chat_messages')
        .select('attachment_path')
        .in('session_id', sessionIds)
        .not('attachment_path', 'is', null),
    ])

  if (attachmentsError) throw attachmentsError
  if (messagesError) throw messagesError

  const paths = new Set<string>()
  for (const attachment of (attachments || []) as AttachmentRow[]) {
    if (attachment.file_path) paths.add(attachment.file_path)
  }
  for (const message of (messages || []) as MessageAttachmentRow[]) {
    if (message.attachment_path) paths.add(message.attachment_path)
  }

  const allPaths = Array.from(paths)
  for (let index = 0; index < allPaths.length; index += STORAGE_BATCH_SIZE) {
    const { error } = await supabase.storage
      .from('chat-attachments')
      .remove(allPaths.slice(index, index + STORAGE_BATCH_SIZE))

    if (error) throw error
  }

  return allPaths.length
}

async function cleanupChats(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[cleanup-chats] Missing server-side Supabase configuration')
      return NextResponse.json({ error: 'Cleanup service is not configured' }, { status: 503 })
    }

    const supabase = createCleanupClient(supabaseUrl, serviceRoleKey)
    const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString()
    let deletedSessions = 0
    let deletedFiles = 0

    while (true) {
      const { data, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('status', 'closed')
        .not('closed_at', 'is', null)
        .lt('closed_at', cutoff)
        .order('closed_at', { ascending: true })
        .limit(CLEANUP_BATCH_SIZE)

      if (fetchError) throw fetchError

      const sessionIds = ((data || []) as SessionRow[]).map((session) => session.id)
      if (sessionIds.length === 0) break

      deletedFiles += await removeStorageFiles(supabase, sessionIds)

      // Related messages, attachments, ratings, notes and audit logs are
      // removed by their ON DELETE CASCADE foreign keys.
      const { data: deleted, error: deleteError } = await supabase
        .from('chat_sessions')
        .delete()
        .in('id', sessionIds)
        .select('id')

      if (deleteError) throw deleteError
      deletedSessions += deleted?.length || 0

      if (sessionIds.length < CLEANUP_BATCH_SIZE) break
    }

    console.log('[cleanup-chats] Cleanup completed', {
      cutoff,
      deletedSessions,
      deletedFiles,
    })

    return NextResponse.json({
      success: true,
      retentionHours: RETENTION_HOURS,
      deletedSessions,
      deletedFiles,
    })
  } catch (error) {
    console.error('[cleanup-chats] Cleanup failed', error)
    return NextResponse.json({ error: 'Failed to cleanup chat history' }, { status: 500 })
  }
}

// Vercel Cron invokes routes with GET. POST remains available for an
// authenticated manual run from the server dashboard.
export const GET = cleanupChats
export const POST = cleanupChats
