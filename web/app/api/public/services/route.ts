import { NextResponse } from 'next/server'
import { getPublicServices } from '@/lib/public-services'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const services = await getPublicServices()
    return NextResponse.json(
      { services },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    )
  } catch (error) {
    console.error('[public-services] No se pudo cargar el catálogo', error)
    return NextResponse.json(
      { error: 'No se pudo cargar el catálogo.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
