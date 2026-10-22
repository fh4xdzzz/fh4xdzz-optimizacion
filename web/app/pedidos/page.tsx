import { redirect } from 'next/navigation'

type Search = Record<string, string | string[] | undefined>

export default async function LegacyPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach(item => query.append(name, item))
    else if (value !== undefined) query.set(name, value)
  }
  redirect('/dashboard/pedidos' + (query.size ? '?' + query.toString() : ''))
}