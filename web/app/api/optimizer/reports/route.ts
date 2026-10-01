import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient, hashOptimizerCode, normalizeOptimizerCode } from '@/lib/optimizer-server'

const metricSchema = z.object({
  name: z.string().max(100),
  value: z.string().max(500),
  detail: z.string().max(1000).optional().default(''),
  state: z.union([z.string(), z.number()]).optional(),
})
const snapshotSchema = z.object({
  capturedAt: z.string().max(64),
  hardware: z.array(metricSchema).max(50),
  system: z.array(metricSchema).max(50),
  processes: z.array(z.object({ name: z.string().max(150), id: z.number().int(), memoryMb: z.number(), impact: z.string().max(50) })).max(30),
  network: z.array(metricSchema).max(50),
  obs: z.array(metricSchema).max(50),
})
const payloadSchema = z.object({
  code: z.string().min(8).max(16),
  appVersion: z.string().min(1).max(32),
  deviceName: z.string().max(80).optional().default(''),
  report: z.object({
    baseline: snapshotSchema.nullable().optional(),
    latest: snapshotSchema.nullable().optional(),
    actions: z.array(z.object({
      timestamp: z.string().max(64), action: z.string().max(150), result: z.string().max(100), detail: z.string().max(1500), canUndo: z.boolean().optional(),
    })).max(200),
    updatedAt: z.string().max(64),
  }).refine(value => value.latest || value.baseline, 'El informe no contiene un diagnóstico.'),
})

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 256 * 1024) return NextResponse.json({ error: 'El diagnóstico supera el tamaño permitido.' }, { status: 413 })
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Código o diagnóstico inválido.' }, { status: 400 })
  const normalizedCode = normalizeOptimizerCode(parsed.data.code)
  if (normalizedCode.length !== 8) return NextResponse.json({ error: 'El código debe tener 8 caracteres.' }, { status: 400 })

  const supabase = createServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Servicio no configurado.' }, { status: 503 })
  const { data, error } = await supabase.rpc('consume_optimizer_code', {
    p_code_hash: hashOptimizerCode(normalizedCode),
    p_app_version: parsed.data.appVersion,
    p_device_name: parsed.data.deviceName,
    p_report: parsed.data.report,
  })
  if (error || !data?.length) {
    return NextResponse.json({ error: 'El código no existe, expiró o ya fue utilizado.' }, { status: 401 })
  }
  return NextResponse.json({ success: true, reportId: data[0].report_id }, { status: 201 })
}
